const express = require('express');
const multer = require('multer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 1. Configure Razorpay (Replace with your Razorpay API Keys)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 2. Configure File Upload Storage (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// In-memory storage (Replace with MongoDB/MySQL for production)
let adminAccount = null; // Stores { username, passwordHash }
let activeTokens = new Set();
let notesDatabase = [];

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// --- ADMIN AUTH ROUTES ---

// Check if Admin Account has been created yet
app.get('/api/admin/status', (req, res) => {
    res.json({ exists: adminAccount !== null });
});

// Create First Admin Account (Only works if no admin exists yet)
app.post('/api/admin/register', (req, res) => {
    if (adminAccount !== null) {
        return res.status(403).json({ error: 'Admin account already exists! Please log in.' });
    }
    const { username, password } = req.body;
    if (!username || !password || password.length < 4) {
        return res.status(400).json({ error: 'Username and password (min 4 chars) required.' });
    }

    adminAccount = {
        username: username.trim(),
        passwordHash: hashPassword(password)
    };

    const token = crypto.randomBytes(24).toString('hex');
    activeTokens.add(token);

    res.json({ message: 'Admin account created!', token, username: adminAccount.username });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    if (!adminAccount) {
        return res.status(400).json({ error: 'No admin account found. Please create one first.' });
    }
    const { username, password } = req.body;
    if (username.trim() === adminAccount.username && hashPassword(password) === adminAccount.passwordHash) {
        const token = crypto.randomBytes(24).toString('hex');
        activeTokens.add(token);
        return res.json({ message: 'Login successful!', token, username: adminAccount.username });
    }
    res.status(401).json({ error: 'Invalid username or password!' });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
    const token = req.headers['authorization'];
    if (token) activeTokens.delete(token);
    res.json({ message: 'Logged out' });
});

// --- NOTES & PAYMENT ROUTES ---

app.get('/api/notes', (req, res) => {
    const publicNotes = notesDatabase.map(note => ({
        id: note.id,
        title: note.title,
        semester: note.semester,
        subject: note.subject,
        price: note.price
    }));
    res.json(publicNotes);
});

// Protected Upload Route (Requires valid Admin Token)
app.post('/api/upload', upload.single('pdfFile'), (req, res) => {
    const token = req.headers['authorization'];
    if (!token || !activeTokens.has(token)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: 'Unauthorized! Please log in as Admin.' });
    }

    const { title, semester, subject, price } = req.body;
    const newNote = {
        id: Date.now().toString(),
        title,
        semester,
        subject,
        price: Number(price),
        filePath: req.file.path,
        originalName: req.file.originalname
    };

    notesDatabase.push(newNote);
    res.json({ message: 'Note uploaded successfully!', note: newNote });
});

app.post('/api/create-order', async (req, res) => {
    const { noteId } = req.body;
    const note = notesDatabase.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const options = {
        amount: note.price * 100,
        currency: 'INR',
        receipt: `receipt_${noteId}_${Date.now()}`
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json({ order, key_id: 'YOUR_RAZORPAY_KEY_ID' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, noteId } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', 'YOUR_RAZORPAY_KEY_SECRET')
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        const note = notesDatabase.find(n => n.id === noteId);
        res.json({
            success: true,
            downloadUrl: `/api/download/${note.id}?paymentId=${razorpay_payment_id}`
        });
    } else {
        res.status(400).json({ success: false, error: 'Payment verification failed' });
    }
});

app.get('/api/download/:noteId', (req, res) => {
    const { paymentId } = req.query;
    if (!paymentId) return res.status(403).send('Unauthorized access');

    const note = notesDatabase.find(n => n.id === req.params.noteId);
    if (!note) return res.status(404).send('File not found');

    res.download(path.resolve(note.filePath), note.originalName);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}
module.exports = app;

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
