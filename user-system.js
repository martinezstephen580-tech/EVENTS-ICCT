// Complete User Authentication and Management System
class UserSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        
        // DOM Elements
        this.userLoginLink = document.getElementById('user-login-link');
        this.userLogoutLink = document.getElementById('user-logout-link');
        this.dashboardLink = document.getElementById('dashboard-link');
        this.dashboardSection = document.getElementById('dashboard');
        this.heroLoginBtn = document.getElementById('hero-login-btn');
        
        // Auth Modal Elements
        this.userAuthModal = document.getElementById('user-auth-modal');
        this.forgotPasswordModal = document.getElementById('forgot-password-modal');
        this.editProfileModal = document.getElementById('edit-profile-modal');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Auth modal triggers
        if(this.userLoginLink) {
            this.userLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAuthModal('login');
            });
        }
        
        if(this.heroLoginBtn) {
            this.heroLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAuthModal('login');
            });
        }
        
        if(this.userLogoutLink) {
            this.userLogoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Login Form Submit
        const studentLoginBtn = document.getElementById('student-login-btn');
        if(studentLoginBtn) {
            studentLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register Form Submit
        const studentRegisterBtn = document.getElementById('student-register-btn');
        if(studentRegisterBtn) {
            studentRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // Tab Switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Update active tab button
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const content = document.getElementById(`${tabId}-tab`);
                if(content) content.classList.add('active');
            });
        });
    }
    
    handleLogin() {
        const emailInput = document.getElementById('student-email');
        const passwordInput = document.getElementById('student-password');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Verify against database
        const users = window.db.readAll('users');
        const user = users.find(u => (u.email === email || u.studentId === email) && u.password === password);
        
        if (user) {
            this.login(user);
            // Clear inputs
            emailInput.value = '';
            passwordInput.value = '';
            // Close modal
            this.userAuthModal.style.display = 'none';
        } else {
            alert('Invalid credentials');
        }
    }
    
    handleRegister() {
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const studentId = document.getElementById('reg-student-id').value.trim();
        const campus = document.getElementById('reg-campus').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        if (!name || !email || !studentId || !campus || !password) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        try {
            const newUser = {
                name,
                email,
                studentId,
                campus,
                password,
                role: 'student',
                joinedDate: new Date().toISOString()
            };
            
            window.db.create('users', newUser);
            alert('Registration successful! Please login.');
            
            // Switch to login tab
            document.querySelector('.tab-btn[data-tab="login"]').click();
            
        } catch (error) {
            alert(error.message);
        }
    }

    login(user) {
        this.currentUser = user;
        this.isLoggedIn = true;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // *** CRITICAL FIX: REMOVE ADMIN ACCESS WHEN STUDENT LOGS IN ***
        localStorage.removeItem('isAdmin'); 
        
        this.updateUI();
        this.showNotification(`Welcome back, ${user.name}!`, 'success');
        
        // Reload page to ensure all Admin UI elements (like the button) disappear completely
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    
    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('icctStudentQR'); // Optional: keep QR even after logout? Usually yes.
        
        this.updateUI();
        this.showNotification('Logged out successfully', 'info');
        
        setTimeout(() => {
            window.location.href = '#';
            location.reload();
        }, 500);
    }
    
    checkExistingSession() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.isLoggedIn = true;
            
            // Safety check: If student exists, ensure Admin is gone
            if (localStorage.getItem('isAdmin')) {
                localStorage.removeItem('isAdmin');
            }
        }
    }
    
    updateUI() {
        if (this.isLoggedIn) {
            if(this.userLoginLink) this.userLoginLink.style.display = 'none';
            if(this.userLogoutLink) this.userLogoutLink.style.display = 'block';
            if(this.dashboardLink) this.dashboardLink.style.display = 'block';
            if(this.dashboardSection) this.dashboardSection.style.display = 'block';
            if(this.heroLoginBtn) this.heroLoginBtn.style.display = 'none';
            
            // Populate Profile Info
            const profileInfo = document.getElementById('user-profile-info');
            if (profileInfo && this.currentUser) {
                profileInfo.innerHTML = `
                    <div class="profile-header">
                        <img src="assets/images/default-avatar.png" alt="Profile" class="profile-avatar" onerror="this.src='https://via.placeholder.com/80'">
                        <div>
                            <h4>${this.currentUser.name}</h4>
                            <span class="profile-role">${this.currentUser.role.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="profile-details">
                        <p><i class="fas fa-id-badge"></i> ${this.currentUser.studentId}</p>
                        <p><i class="fas fa-envelope"></i> ${this.currentUser.email}</p>
                        <p><i class="fas fa-university"></i> ${this.currentUser.campus}</p>
                    </div>
                `;
            }
        } else {
            if(this.userLoginLink) this.userLoginLink.style.display = 'block';
            if(this.userLogoutLink) this.userLogoutLink.style.display = 'none';
            if(this.dashboardLink) this.dashboardLink.style.display = 'none';
            if(this.dashboardSection) this.dashboardSection.style.display = 'none';
            if(this.heroLoginBtn) this.heroLoginBtn.style.display = 'inline-flex';
        }
    }
    
    openAuthModal(tab = 'login') {
        if (this.userAuthModal) {
            this.userAuthModal.style.display = 'flex';
            const tabBtn = this.userAuthModal.querySelector(`.tab-btn[data-tab="${tab}"]`);
            if (tabBtn) tabBtn.click();
        }
    }
    
    showNotification(message, type = 'info') {
        const colors = { success: '#27ae60', error: '#e74c3c', info: '#3498db' };
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background-color: ${colors[type]}; color: white;
            padding: 1rem 2rem; border-radius: 10px; z-index: 3000;
            animation: slideInRight 0.3s ease;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
    
    // For other modules to access user
    getCurrentUser() {
        return this.currentUser;
    }
    
    isUserLoggedIn() {
        return this.isLoggedIn;
    }
}

// Initialize
window.userSystem = new UserSystem();