// Note: Database class is defined in database.js and initialized globally

// ==========================================
// EVENT MANAGER CLASS
// ==========================================
class EventManager {
    constructor() {
        this.eventsContainer = document.getElementById('events-container');
        this.campusFilter = document.getElementById('campus-filter');
        this.categoryFilter = document.getElementById('category-filter');
        this.dateFilter = document.getElementById('date-filter');
        this.resetBtn = document.getElementById('reset-filters');
        this.campusesGrid = document.querySelector('.campuses-grid');
        this.modal = document.getElementById('event-modal');
        this.closeModal = document.querySelector('.close-modal');
        
        // Initialize with all events
        this.filteredEvents = window.db ? window.db.readAll('events') : [];
        try {
            this.init();
        } catch (e) {
            console.error("Event Manager Init Error:", e);
        }
    }
    
    init() {
        this.renderEvents();
        this.renderCampuses();
        this.setupEventListeners();
        this.setupModal();
        if (window.eventCart) window.eventCart.updateCartCount();
    }
    
    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card hover-lift';
        
        const availableSlots = event.capacity - event.registered;
        const percentage = Math.round((event.registered / event.capacity) * 100);
        const isInCart = window.eventCart ? window.eventCart.isInCart(event.id) : false;
        
        card.innerHTML = `
            <img src="${event.image || 'assets/images/events/default.jpg'}" alt="${event.title}" class="event-image" onerror="this.src='assets/images/events/default.jpg'">
            <div class="event-content">
                <span class="event-category">${this.getCategoryLabel(event.category)}</span>
                <h3 class="event-title">${event.title}</h3>
                <p class="event-description">${event.description ? event.description.substring(0, 100) : ''}...</p>
                <div class="event-meta">
                    <span><strong>📅</strong> ${event.date}</span>
                    <span><strong>⏰</strong> ${event.time}</span>
                </div>
                <div class="event-meta">
                    <span><strong>🏛️</strong> ${event.campus}</span>
                    <span><strong>📍</strong> ${event.location}</span>
                </div>
                <div class="event-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background-color: ${percentage > 80 ? '#e74c3c' : percentage > 50 ? '#f39c12' : '#27ae60'}"></div>
                    </div>
                    <div class="progress-info">
                        <span>${availableSlots} slots available</span>
                        <span>${percentage}% filled</span>
                    </div>
                </div>
                <div class="event-actions">
                    <button class="btn-primary view-details" data-id="${event.id}"><i class="fas fa-info-circle"></i> Details</button>
                    ${isInCart ? 
                        `<button class="btn-warning in-cart" data-id="${event.id}"><i class="fas fa-shopping-cart"></i> In Cart</button>` : 
                        `<button class="btn-secondary add-to-cart" data-id="${event.id}"><i class="fas fa-cart-plus"></i> Add to Cart</button>`
                    }
                </div>
            </div>
        `;
        
        // Add listeners
        const detailsBtn = card.querySelector('.view-details');
        if(detailsBtn) detailsBtn.addEventListener('click', () => this.showEventDetails(event.id));
        
        const addToCartBtn = card.querySelector('.add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', (e) => {
                if (window.eventCart) {
                    window.eventCart.addToCart(event.id);
                    e.target.innerHTML = '<i class="fas fa-shopping-cart"></i> In Cart';
                    e.target.className = 'btn-warning in-cart';
                    this.showNotification(`Added "${event.title}" to cart!`, 'success');
                }
            });
        }
        
        const inCartBtn = card.querySelector('.in-cart');
        if (inCartBtn) {
            inCartBtn.addEventListener('click', (e) => {
                if (window.eventCart) {
                    window.eventCart.removeFromCart(event.id);
                    e.target.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
                    e.target.className = 'btn-secondary add-to-cart';
                    this.showNotification(`Removed "${event.title}" from cart`, 'info');
                }
            });
        }
        return card;
    }
    
    getCategoryLabel(category) {
        return { academic: 'Academic', sports: 'Sports', cultural: 'Cultural', social: 'Social' }[category] || category;
    }
    
    showEventDetails(eventId) {
        const event = window.db.read('events', eventId);
        if (!event) return;
        
        const modalContent = document.getElementById('modal-content');
        if(!modalContent) return;

        const isInCart = window.eventCart ? window.eventCart.isInCart(eventId) : false;
        
        modalContent.innerHTML = `
            <div class="event-details">
                <h2>${event.title}</h2>
                <div class="event-meta-details">
                    <p><strong>Date:</strong> ${event.date} at ${event.time}</p>
                    <p><strong>Location:</strong> ${event.location}, ${event.campus}</p>
                    <p><strong>Category:</strong> ${this.getCategoryLabel(event.category)}</p>
                    ${event.speaker ? `<p><strong>Speaker:</strong> ${event.speaker}</p>` : ''}
                </div>
                <div class="event-description">
                    <h3>Description</h3>
                    <p>${event.description}</p>
                </div>
                <div class="event-stats">
                    <div class="stat-card"><h4>Capacity</h4><p>${event.capacity}</p></div>
                    <div class="stat-card"><h4>Registered</h4><p>${event.registered}</p></div>
                    <div class="stat-card"><h4>Available</h4><p>${event.capacity - event.registered}</p></div>
                </div>
                <div class="modal-actions">
                    ${!isInCart ? `<button class="btn-secondary add-to-cart-modal" data-id="${event.id}"><i class="fas fa-cart-plus"></i> Add to Cart</button>` : ''}
                    <button class="btn-primary register-modal-btn" data-id="${event.id}">Register</button>
                    <button class="btn-secondary close-modal-btn">Close</button>
                </div>
            </div>
        `;
        
        // Modal Button Listeners
        const addBtn = modalContent.querySelector('.add-to-cart-modal');
        if (addBtn) addBtn.addEventListener('click', () => {
            if (window.eventCart) {
                window.eventCart.addToCart(eventId);
                addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> In Cart';
                addBtn.className = 'btn-warning add-to-cart-modal';
                this.showNotification(`Added "${event.title}" to cart!`, 'success');
            }
        });
        
        modalContent.querySelector('.register-modal-btn')?.addEventListener('click', () => {
            this.registerForEvent(eventId);
            if(this.modal) this.modal.style.display = 'none';
        });
        
        modalContent.querySelector('.close-modal-btn').addEventListener('click', () => {
            if(this.modal) this.modal.style.display = 'none';
        });
        
        if(this.modal) this.modal.style.display = 'flex';
    }
    
    registerForEvent(eventId) {
        const savedData = localStorage.getItem('icctStudentQR');
        if (!savedData) {
            alert('Please generate your Student QR ID first.');
            document.querySelector('#qr-generator')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        
        const event = window.db.read('events', eventId);
        if (event.registered >= event.capacity) {
            alert('Event is full.');
            return;
        }
        
        window.db.update('events', eventId, { registered: event.registered + 1 });
        const studentData = JSON.parse(savedData);
        window.db.create('registrations', {
            id: Date.now().toString(),
            eventId: eventId,
            userId: studentData?.studentId || 'guest',
            studentId: studentData?.studentId,
            studentName: studentData?.name,
            campus: studentData?.campus,
            status: 'registered',
            registeredAt: new Date().toISOString()
        });
        
        if (window.eventCart && window.eventCart.isInCart(eventId)) window.eventCart.removeFromCart(eventId);
        this.filteredEvents = window.db.readAll('events');
        this.renderEvents();
        this.showNotification(`Registered for "${event.title}"!`, 'success');
    }
    
    showNotification(message, type = 'info') {
        const colors = { success: '#27ae60', error: '#e74c3c', info: '#3498db' };
        const notif = document.createElement('div');
        notif.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${colors[type]}; color: white; padding: 1rem 2rem; border-radius: 10px; z-index: 3000; animation: slideInRight 0.3s ease;`;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => { notif.remove(); }, 3000);
    }
    
    renderEvents() {
        if(!this.eventsContainer) return;
        this.eventsContainer.innerHTML = '';
        if (this.filteredEvents.length === 0) {
            this.eventsContainer.innerHTML = '<div style="text-align:center; padding:3rem;"><h3>No events found</h3></div>';
            return;
        }
        this.filteredEvents.forEach(event => this.eventsContainer.appendChild(this.createEventCard(event)));
    }
    
    renderCampuses() {
        if (!this.campusesGrid) return;
        this.campusesGrid.innerHTML = '';
        const campuses = [
            { name: 'Main Campus', location: 'Karatasan, Cainta', programs: 'All Programs', contact: '(02) 1234-5678', email: 'main@icct.edu.ph' },
            { name: 'Cainta Campus', location: 'Cainta', programs: 'IT, Engineering', contact: '(02) 8765-4321', email: 'cainta@icct.edu.ph' },
            { name: 'Antipolo Campus', location: 'Antipolo', programs: 'Nursing, Education', contact: '(02) 5555-1234', email: 'antipolo@icct.edu.ph' },
            { name: 'San Mateo Campus', location: 'San Mateo', programs: 'Maritime', contact: '(02) 4444-5678', email: 'sanmateo@icct.edu.ph' }
        ];
        campuses.forEach(c => {
            const card = document.createElement('div');
            card.className = 'campus-card hover-lift';
            card.innerHTML = `<div class="campus-icon">🏛️</div><h3>${c.name}</h3><p><strong>Location:</strong> ${c.location}</p><p><strong>Programs:</strong> ${c.programs}</p>`;
            this.campusesGrid.appendChild(card);
        });
    }
    
    setupEventListeners() {
        if (this.campusFilter) this.campusFilter.addEventListener('change', () => this.filterEvents());
        if (this.categoryFilter) this.categoryFilter.addEventListener('change', () => this.filterEvents());
        if (this.dateFilter) this.dateFilter.addEventListener('change', () => this.filterEvents());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetFilters());
    }
    
    filterEvents() {
        const campus = this.campusFilter?.value || 'all';
        const category = this.categoryFilter?.value || 'all';
        const date = this.dateFilter?.value || '';
        this.filteredEvents = window.db.readAll('events').filter(event => {
            if (campus !== 'all' && event.campus !== campus) return false;
            if (category !== 'all' && event.category !== category) return false;
            if (date && event.date !== date) return false;
            return true;
        });
        this.renderEvents();
    }
    
    resetFilters() {
        if (this.campusFilter) this.campusFilter.value = 'all';
        if (this.categoryFilter) this.categoryFilter.value = 'all';
        if (this.dateFilter) this.dateFilter.value = '';
        this.filteredEvents = window.db.readAll('events');
        this.renderEvents();
    }
    
    setupModal() {
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.modal.style.display = 'none';
        });
    }
    
    updateQuickStats() {
        const totalEvents = window.db.count('events');
        const totalUsers = window.db.count('users', { role: 'student' });
        const qrGenerated = localStorage.getItem('icctStudentQR') ? 1 : 0;
        const totalEventsEl = document.getElementById('total-events');
        const totalParticipantsEl = document.getElementById('total-participants');
        const qrGeneratedEl = document.getElementById('qr-generated');
        if (totalEventsEl) totalEventsEl.textContent = totalEvents;
        if (totalParticipantsEl) totalParticipantsEl.textContent = totalUsers;
        if (qrGeneratedEl) qrGeneratedEl.textContent = qrGenerated;
    }
}

// -----------------------------------------------------------
// MAIN INITIALIZATION LOGIC
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Database
    if (!window.db) window.db = new Database();
    
    // 2. Initialize Core Systems with Safety Blocks
    try {
        if (!window.eventManager) window.eventManager = new EventManager();
    } catch(e) { console.error("Event Manager Init Failed", e); }

    try {
        if (!window.eventCart) window.eventCart = new EventCart();
    } catch(e) { console.error("Event Cart Init Failed", e); }

    try {
        if (!window.searchSystem) window.searchSystem = new SearchSystem();
    } catch(e) { console.error("Search System Init Failed", e); }

    try {
        if (!window.qrGenerator) window.qrGenerator = new QRGenerator();
    } catch(e) { console.error("QR Generator Init Failed", e); }

    // 3. Initialize Admin Panel with Safety Block
    try {
        if (!window.adminPanel && typeof AdminPanel !== 'undefined') {
            window.adminPanel = new AdminPanel();
        }
    } catch(e) {
        console.error("Admin Panel Init Failed:", e);
    }
    
    // 4. Initialization Checks (Fixes the Session Conflict)
    checkExclusiveSession();
    
    // 5. Transfer Guest Cart
    if (window.userSystem && window.userSystem.isUserLoggedIn && window.userSystem.isUserLoggedIn()) {
        const user = window.userSystem.getCurrentUser();
        if(window.eventCart) window.eventCart.transferGuestCart(user.id);
    }
    
    // 6. Setup Date Filter Default
    const today = new Date().toISOString().split('T')[0];
    const dateFilter = document.getElementById('date-filter');
    if (dateFilter) {
        dateFilter.value = today;
        dateFilter.min = today;
    }
    
    // 7. Initialize Admin Link State & Logout Button
    updateAdminLinkState();
    setupAdminLogout();

    // 8. Navigation Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#user-login' || targetId === '#admin-login' || targetId.includes('modal')) return;
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
            }
        });
    });

    // ==========================================
    // ADMIN LOGIN LOGIC
    // ==========================================
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const userAuthModal = document.getElementById('user-auth-modal');

    if (adminLoginBtn) {
        const newBtn = adminLoginBtn.cloneNode(true);
        adminLoginBtn.parentNode.replaceChild(newBtn, adminLoginBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            handleAdminLogin();
        });
    }

    function handleAdminLogin() {
        const usernameInput = document.getElementById('admin-username');
        const passwordInput = document.getElementById('admin-password');
        const userErr = document.getElementById('admin-username-error');
        const passErr = document.getElementById('admin-password-error');

        if (userErr) userErr.textContent = '';
        if (passErr) passErr.textContent = '';

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';

        if (!username) { if (userErr) userErr.textContent = 'Username required'; return; }
        if (!password) { if (passErr) passErr.textContent = 'Password required'; return; }

        if (username === 'admin' && password === 'admin123') {
            // SUCCESS: Set Admin, Clear Student
            localStorage.setItem('isAdmin', 'true');
            if(localStorage.getItem('currentUser')) {
                localStorage.removeItem('currentUser'); // Log out student
                location.reload(); // Reload to clear student UI state
                return;
            }

            alert('Admin Login Successful! Opening Panel...');
            
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';

            if (userAuthModal) userAuthModal.style.display = 'none';
            if (adminPanelModal) adminPanelModal.style.display = 'flex';
            
            updateAdminLinkState();
            setupAdminLogout(); // Ensure logout button is added
        } else {
            if (passErr) passErr.textContent = 'Invalid admin credentials';
            if (passwordInput) passwordInput.value = '';
        }
    }

    // Modal Opening Logic
    document.querySelectorAll('[data-open]').forEach(op => {
        op.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = op.dataset.open;
            
            if (op.id === 'admin-login-link') {
                if (localStorage.getItem('isAdmin') === 'true') {
                    if (adminPanelModal) adminPanelModal.style.display = 'flex';
                    return;
                }
            }

            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                modalEl.style.display = 'flex';
                const tab = op.dataset.tab;
                if (tab) {
                    const tabBtn = modalEl.querySelector(`.tab-btn[data-tab="${tab}"]`);
                    if (tabBtn) tabBtn.click();
                }
            }
        });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    addCartButtonToHeader();
});

// Helper: Ensure mutually exclusive sessions
function checkExclusiveSession() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const isStudent = localStorage.getItem('currentUser') !== null;

    if (isStudent && isAdmin) {
        // If a student logs in, we assume they are NOT admin
        console.log("Conflict detected: Student logged in. Removing Admin privileges.");
        localStorage.removeItem('isAdmin');
        updateAdminLinkState();
    }
}

// Helper: Update Admin Link Appearance
function updateAdminLinkState() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const adminLoginLink = document.getElementById('admin-login-link');
    if (adminLoginLink) {
        if (isAdmin) {
            adminLoginLink.innerHTML = '<i class="fas fa-user-shield"></i> Admin Panel';
            adminLoginLink.style.backgroundColor = 'var(--success-color)';
        } else {
            adminLoginLink.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
            adminLoginLink.style.backgroundColor = ''; 
        }
    }
}

// Helper: Add Logout Button to Admin Panel
function setupAdminLogout() {
    const adminPanel = document.querySelector('.admin-panel');
    if (!adminPanel) return;

    // Check if logout button already exists to prevent duplicates
    if (document.getElementById('admin-logout-btn')) return;

    const header = adminPanel.querySelector('h2');
    if (header) {
        // Create container for header to align button
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'admin-logout-btn';
        logoutBtn.className = 'btn-danger';
        logoutBtn.style.fontSize = '0.9rem';
        logoutBtn.style.padding = '0.4rem 1rem';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
        
        logoutBtn.addEventListener('click', () => {
            if(confirm('Are you sure you want to log out as Admin?')) {
                localStorage.removeItem('isAdmin');
                document.getElementById('admin-panel-modal').style.display = 'none';
                updateAdminLinkState();
                alert('Logged out successfully.');
                location.reload(); // Refresh to reset state completely
            }
        });

        header.appendChild(logoutBtn);
    }
}

function addCartButtonToHeader() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('cart-btn')) return;
    
    const cartBtn = document.createElement('a');
    cartBtn.href = '#dashboard';
    cartBtn.id = 'cart-btn';
    cartBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart <span id="cart-count" style="display: none; background-color: var(--accent-color); color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-left: 5px;">0</span>`;
    
    const dashboardLink = document.getElementById('dashboard-link');
    if(dashboardLink) navLinks.insertBefore(cartBtn, dashboardLink);
    else navLinks.appendChild(cartBtn);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    .btn-warning { background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%); color: white; }
    #cart-btn { position: relative; display: flex; align-items: center; gap: 5px; color: white; text-decoration: none; font-weight: 500; padding: 0.5rem 1rem; border-radius: 20px; transition: var(--transition); }
    #cart-btn:hover { background-color: rgba(255, 255, 255, 0.1); transform: translateY(-2px); }
`;
document.head.appendChild(style);