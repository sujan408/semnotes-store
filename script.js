AOS.init({ once: true });

let allNotes = [];
let adminExists = false;
let adminToken = localStorage.getItem('adminToken') || null;
let adminUsername = localStorage.getItem('adminUsername') || '';

// ==========================================
// 1. WINTER SNOWFALL ANIMATION
// ==========================================
const canvas = document.getElementById('snowCanvas');
const ctx = canvas.getContext('2d');
let snowflakes = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createSnowflakes() {
    const count = Math.floor(window.innerWidth / 12);
    snowflakes = [];
    for (let i = 0; i < count; i++) {
        snowflakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3.5 + 1.2,
            speedY: Math.random() * 1.2 + 0.5,
            speedX: Math.random() * 0.8 - 0.4,
            opacity: Math.random() * 0.6 + 0.3
        });
    }
}

function drawSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    snowflakes.forEach(flake => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        // Bright white snow in dark mode, soft icy blue-white in light mode
        ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${flake.opacity})`
            : `rgba(148, 197, 255, ${flake.opacity + 0.25})`;
        ctx.fill();

        flake.y += flake.speedY;
        flake.x += flake.speedX;

        if (flake.y > canvas.height) {
            flake.y = -5;
            flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) flake.x = 0;
        if (flake.x < 0) flake.x = canvas.width;
    });

    requestAnimationFrame(drawSnow);
}

createSnowflakes();
drawSnow();

// ==========================================
// 2. LIGHT & DARK MODE TOGGLE
// ==========================================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const quickThemeBtn = document.getElementById('quickThemeBtn');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Switch to Light Mode';
        quickThemeBtn.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Switch to Dark Mode';
        quickThemeBtn.textContent = '🌙';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

applyTheme(localStorage.getItem('theme') || 'light');
themeToggleBtn.onclick = toggleTheme;
quickThemeBtn.onclick = toggleTheme;

// ==========================================
// 3. LEFT THREE-DOT SIDEBAR DRAWER
// ==========================================
const threeDotBtn = document.getElementById('threeDotBtn');
const leftSidebar = document.getElementById('leftSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

function openSidebar() {
    leftSidebar.classList.add('open');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    leftSidebar.classList.remove('open');
    sidebarOverlay.classList.add('hidden');
}

threeDotBtn.onclick = openSidebar;
closeSidebarBtn.onclick = closeSidebar;
sidebarOverlay.onclick = closeSidebar;

// ==========================================
// 4. ADMIN FIRST-TIME SETUP & LOGIN SYSTEM
// ==========================================
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authModalTitle = document.getElementById('authModalTitle');
const authModalSub = document.getElementById('authModalSub');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const openAuthModalBtn = document.getElementById('openAuthModalBtn');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const headerActionBtn = document.getElementById('headerActionBtn');

const adminLoggedOutBox = document.getElementById('adminLoggedOutBox');
const adminLoggedInBox = document.getElementById('adminLoggedInBox');
const loggedAdminName = document.getElementById('loggedAdminName');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');
const authMenuLabel = document.getElementById('authMenuLabel');

async function checkAdminStatus() {
    const res = await fetch('/api/admin/status');
    const data = await res.json();
    adminExists = data.exists;

    if (!adminExists) {
        authModalTitle.textContent = '✨ Create Admin Account';
        authModalSub.textContent = 'First-time setup: Create your master Admin username & password.';
        authSubmitBtn.textContent = 'Create Account & Login';
        authMenuLabel.textContent = 'Create Admin Account';
    } else {
        authModalTitle.textContent = '🔐 Admin Login';
        authModalSub.textContent = 'Enter your admin credentials to upload notes.';
        authSubmitBtn.textContent = 'Login';
        authMenuLabel.textContent = 'Admin Login';
    }
    updateAdminUI();
}

function updateAdminUI() {
    if (adminToken) {
        adminLoggedOutBox.classList.add('hidden');
        adminLoggedInBox.classList.remove('hidden');
        loggedAdminName.textContent = adminUsername;
        headerActionBtn.textContent = '+ Upload Notes';
        headerActionBtn.onclick = () => uploadModal.classList.remove('hidden');
    } else {
        adminLoggedOutBox.classList.remove('hidden');
        adminLoggedInBox.classList.add('hidden');
        headerActionBtn.textContent = adminExists ? '🔐 Admin Login' : '✨ Setup Admin';
        headerActionBtn.onclick = () => {
            checkAdminStatus();
            authModal.classList.remove('hidden');
        };
    }
}

openAuthModalBtn.onclick = () => {
    closeSidebar();
    checkAdminStatus();
    authModal.classList.remove('hidden');
};
closeAuthModalBtn.onclick = () => authModal.classList.add('hidden');

// Handle Register (First Time) or Login
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassInput').value;

    const endpoint = adminExists ? '/api/admin/login' : '/api/admin/register';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        adminToken = data.token;
        adminUsername = data.username;
        adminExists = true;
        localStorage.setItem('adminToken', adminToken);
        localStorage.setItem('adminUsername', adminUsername);

        authForm.reset();
        authModal.classList.add('hidden');
        updateAdminUI();
        alert(data.message);
    } else {
        alert(data.error || 'Authentication failed');
    }
});

// Logout
logoutAdminBtn.onclick = async () => {
    await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': adminToken }
    });
    adminToken = null;
    adminUsername = '';
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    closeSidebar();
    checkAdminStatus();
    alert('Logged out successfully.');
};

// ==========================================
// 5. NOTES DISPLAY, UPLOAD & RAZORPAY BUY
// ==========================================
const notesGrid = document.getElementById('notesGrid');
const semesterFilter = document.getElementById('semesterFilter');
const searchInput = document.getElementById('searchInput');
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const uploadForm = document.getElementById('uploadForm');

openUploadBtn.onclick = () => {
    closeSidebar();
    uploadModal.classList.remove('hidden');
};
closeUploadModalBtn.onclick = () => uploadModal.classList.add('hidden');

async function fetchNotes() {
    const res = await fetch('/api/notes');
    allNotes = await res.json();
    filterAndRender();
}

function renderNotes(notes) {
    notesGrid.innerHTML = '';
    if (notes.length === 0) {
        notesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-secondary);">No matching notes found.</p>';
        return;
    }

    notes.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.animationDelay = `${index * 0.08}s`;
        card.innerHTML = `
            <div>
                <span class="badge">${note.semester}</span>
                <h3>${note.title}</h3>
                <p class="subject">📘 ${note.subject}</p>
            </div>
            <div class="card-footer">
                <span class="price">₹${note.price}</span>
                <button class="buy-btn" onclick="buyNote('${note.id}', '${note.title}')">Buy PDF →</button>
            </div>
        `;
        notesGrid.appendChild(card);
    });
}

function filterAndRender() {
    const selectedSem = semesterFilter.value;
    const query = searchInput.value.toLowerCase().trim();

    const filtered = allNotes.filter(note => {
        const matchesSem = selectedSem === 'all' || note.semester === selectedSem;
        const matchesSearch = note.title.toLowerCase().includes(query) ||
                              note.subject.toLowerCase().includes(query);
        return matchesSem && matchesSearch;
    });

    renderNotes(filtered);
}

semesterFilter.addEventListener('change', filterAndRender);
searchInput.addEventListener('input', filterAndRender);

// Upload Note (Uses Admin Session Token)
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('semester', document.getElementById('semester').value);
    formData.append('subject', document.getElementById('subject').value);
    formData.append('price', document.getElementById('price').value);
    formData.append('pdfFile', document.getElementById('pdfFile').files[0]);

    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': adminToken },
        body: formData
    });

    const data = await res.json();
    if (res.ok) {
        alert('Notes published successfully!');
        uploadForm.reset();
        uploadModal.classList.add('hidden');
        fetchNotes();
    } else {
        alert(data.error || 'Upload failed. Please log in again.');
        if (res.status === 401) {
            adminToken = null;
            localStorage.removeItem('adminToken');
            updateAdminUI();
        }
    }
});

// Buy Note via Razorpay
async function buyNote(noteId, title) {
    const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId })
    });
    const { order, key_id } = await orderRes.json();

    const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "SemNotes Store",
        description: `Purchase: ${title}`,
        order_id: order.id,
        handler: async function (response) {
            const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    noteId: noteId
                })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
                alert('Payment Successful! Your download will start now.');
                window.location.href = verifyData.downloadUrl;
            } else {
                alert('Payment verification failed!');
            }
        },
        theme: { color: "#2563eb" }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

// Initialize App
checkAdminStatus();
fetchNotes();