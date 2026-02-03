// Enhanced Admin Panel with Analytics, User Management, and Event CRUD
class AdminPanel {
    constructor() {
        // Analytics Elements
        this.totalStudents = document.getElementById('total-students');
        this.eventsThisMonth = document.getElementById('events-this-month');
        this.todaysAttendance = document.getElementById('todays-attendance');
        this.participationRate = document.getElementById('participation-rate');
        this.analyticsPeriod = document.getElementById('analytics-period');
        
        // User Management Elements
        this.userSearch = document.getElementById('user-search');
        this.exportUsersBtn = document.getElementById('export-users-btn');
        this.usersListAdmin = document.getElementById('users-list-admin');
        
        // Event Management Elements (New CRUD Elements)
        this.eventsListAdmin = document.getElementById('events-list-admin');
        this.addEventBtn = document.getElementById('add-event-btn');
        this.clearFormBtn = document.getElementById('clear-form-btn');
        
        // Event Form Inputs
        this.eventTitle = document.getElementById('event-title');
        this.eventCategory = document.getElementById('event-category');
        this.eventCampus = document.getElementById('event-campus');
        this.eventDate = document.getElementById('event-date');
        this.eventTime = document.getElementById('event-time');
        this.eventLocation = document.getElementById('event-location');
        this.eventDescription = document.getElementById('event-description');
        this.eventCapacity = document.getElementById('event-capacity');
        this.eventSpeaker = document.getElementById('event-speaker');
        this.eventImage = document.getElementById('event-image');
        
        // State for Editing
        this.editingEventId = null;

        // Scanner Elements
        this.adminScanInput = document.getElementById('admin-scan-input');
        this.adminScanBtn = document.getElementById('admin-scan-btn');
        this.adminAttendanceList = document.getElementById('admin-attendance-list');
        this.adminAttendanceRecords = [];
        
        this.init();
    }
    
    init() {
        // Initialize Listeners
        if (this.analyticsPeriod) this.analyticsPeriod.addEventListener('change', () => this.updateAnalytics());
        if (this.userSearch) this.userSearch.addEventListener('input', () => this.searchUsers());
        if (this.exportUsersBtn) this.exportUsersBtn.addEventListener('click', () => this.exportUsers());
        
        // Event CRUD Listeners
        if (this.addEventBtn) this.addEventBtn.addEventListener('click', () => this.handleEventSubmit());
        if (this.clearFormBtn) this.clearFormBtn.addEventListener('click', () => this.resetEventForm());
        
        // Scanner Listener
        if (this.adminScanBtn) this.adminScanBtn.addEventListener('click', () => this.adminScanAttendance());

        // Initial Data Load
        this.updateAnalytics();
        this.loadUsers();
        this.loadEvents(); // Load events on startup
    }
    
    // ==========================================
    // 1. EVENT CRUD OPERATIONS (Requirement Fix)
    // ==========================================

    // READ: Load all events into the list
    loadEvents() {
        if (!this.eventsListAdmin) return;
        const events = window.db.readAll('events');
        
        // Sort by date (newest first)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.renderEventsList(events);
    }

    renderEventsList(events) {
        this.eventsListAdmin.innerHTML = '';
        
        if (events.length === 0) {
            this.eventsListAdmin.innerHTML = '<p class="no-data">No events found.</p>';
            return;
        }

        events.forEach(event => {
            const item = document.createElement('div');
            item.className = 'admin-event-item';
            
            // Calculate fill percentage
            const percentage = Math.round((event.registered / event.capacity) * 100);
            
            item.innerHTML = `
                <div class="event-info">
                    <h4>${event.title}</h4>
                    <div class="event-meta">
                        <span class="category-badge">${event.category}</span>
                        <span class="campus-badge">${event.campus}</span>
                    </div>
                    <p class="date-info"><i class="fas fa-clock"></i> ${event.date} at ${event.time}</p>
                    <div class="event-stats">
                        <span><i class="fas fa-users"></i> ${event.registered}/${event.capacity} (${percentage}%)</span>
                    </div>
                </div>
                <div class="event-actions">
                    <button class="btn-secondary btn-small edit-event" data-id="${event.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger btn-small delete-event" data-id="${event.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            this.eventsListAdmin.appendChild(item);
        });

        // Add Listeners for Edit/Delete buttons
        document.querySelectorAll('.edit-event').forEach(btn => {
            btn.addEventListener('click', (e) => this.prepareEditEvent(e.target.closest('.edit-event').dataset.id));
        });

        document.querySelectorAll('.delete-event').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteEvent(e.target.closest('.delete-event').dataset.id));
        });
    }

    // CREATE & UPDATE: Handle Form Submit
    handleEventSubmit() {
        // Validation
        if (!this.eventTitle.value || !this.eventDate.value || !this.eventCapacity.value) {
            this.showNotification('Please fill in required fields (Title, Date, Capacity)', 'error');
            return;
        }

        const eventData = {
            title: this.eventTitle.value,
            category: this.eventCategory.value,
            campus: this.eventCampus.value,
            date: this.eventDate.value,
            time: this.eventTime.value,
            location: this.eventLocation.value,
            description: this.eventDescription.value,
            capacity: parseInt(this.eventCapacity.value),
            speaker: this.eventSpeaker.value,
            image: this.eventImage.value || 'assets/images/events/default.jpg',
            // Preserve registration count if editing, else 0
            registered: this.editingEventId ? window.db.read('events', this.editingEventId).registered : 0
        };

        try {
            if (this.editingEventId) {
                // UPDATE OPERATION
                window.db.update('events', this.editingEventId, eventData);
                this.showNotification('Event updated successfully', 'success');
            } else {
                // CREATE OPERATION
                window.db.create('events', eventData);
                this.showNotification('New event created successfully', 'success');
            }

            this.resetEventForm();
            this.loadEvents();
            this.updateAnalytics(); // Refresh stats
            
            // Refresh main event view if manager exists
            if (window.eventManager) {
                window.eventManager.filteredEvents = window.db.readAll('events');
                window.eventManager.renderEvents();
            }

        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    // PREPARE UPDATE: Fill form with existing data
    prepareEditEvent(id) {
        const event = window.db.read('events', id);
        if (!event) return;

        this.editingEventId = id;
        
        // Populate fields
        this.eventTitle.value = event.title;
        this.eventCategory.value = event.category;
        this.eventCampus.value = event.campus;
        this.eventDate.value = event.date;
        this.eventTime.value = event.time;
        this.eventLocation.value = event.location;
        this.eventDescription.value = event.description;
        this.eventCapacity.value = event.capacity;
        this.eventSpeaker.value = event.speaker || '';
        this.eventImage.value = event.image;

        // Change Button Text
        this.addEventBtn.innerHTML = '<i class="fas fa-save"></i> Update Event';
        this.addEventBtn.classList.remove('btn-primary');
        this.addEventBtn.classList.add('btn-success');
        
        // Scroll to form
        this.addEventBtn.scrollIntoView({ behavior: 'smooth' });
    }

    // DELETE: Remove event
    deleteEvent(id) {
        if (!confirm('Are you sure you want to delete this event? This will also cancel all student registrations for it.')) {
            return;
        }

        try {
            // 1. Delete the event
            window.db.delete('events', id);

            // 2. Delete associated registrations (Cleanup)
            const registrations = window.db.readAll('registrations', { eventId: id });
            registrations.forEach(reg => window.db.delete('registrations', reg.id));

            this.showNotification('Event deleted successfully', 'success');
            this.loadEvents();
            this.updateAnalytics();
            
            if (window.eventManager) {
                window.eventManager.filteredEvents = window.db.readAll('events');
                window.eventManager.renderEvents();
            }

        } catch (error) {
            this.showNotification('Failed to delete: ' + error.message, 'error');
        }
    }

    resetEventForm() {
        this.editingEventId = null;
        
        // Clear inputs
        this.eventTitle.value = '';
        this.eventDate.value = '';
        this.eventTime.value = '';
        this.eventLocation.value = '';
        this.eventDescription.value = '';
        this.eventCapacity.value = '';
        this.eventSpeaker.value = '';
        this.eventImage.value = 'assets/images/events/default.jpg';
        
        // Reset Button
        this.addEventBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Event';
        this.addEventBtn.classList.add('btn-primary');
        this.addEventBtn.classList.remove('btn-success');
    }

    // ==========================================
    // 2. ANALYTICS & STATS
    // ==========================================
    updateAnalytics() {
        if(!this.totalStudents) return;

        const period = this.analyticsPeriod.value;
        const now = new Date();
        let startDate, endDate;
        
        switch(period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                endDate = now;
                break;
            default: // all
                startDate = null;
                endDate = null;
        }
        
        this.updateStatistics(startDate, endDate);
    }
    
    updateStatistics(startDate, endDate) {
        // Total students
        const totalUsers = window.db.count('users', { role: 'student' });
        this.totalStudents.textContent = totalUsers;
        
        // Events this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const events = window.db.readAll('events');
        const monthlyEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.getMonth() === currentMonth && 
                   eventDate.getFullYear() === currentYear;
        });
        this.eventsThisMonth.textContent = monthlyEvents.length;
        
        // Today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendance = window.db.readAll('attendance');
        const todaysAttendance = attendance.filter(record => {
            return record.timestamp.includes(today); // Simple string check for demo
        });
        this.todaysAttendance.textContent = todaysAttendance.length;
        
        // Participation rate
        const totalRegistrations = window.db.count('registrations');
        const activeStudents = new Set(attendance.map(a => a.studentId)).size;
        const rate = totalUsers > 0 ? Math.round((activeStudents / totalUsers) * 100) : 0;
        this.participationRate.textContent = `${rate}%`;
    }
    
    // ==========================================
    // 3. USER MANAGEMENT
    // ==========================================
    loadUsers() {
        if (!this.usersListAdmin) return;
        const users = window.db.readAll('users');
        this.renderUsers(users);
    }
    
    searchUsers() {
        const searchTerm = this.userSearch.value.trim().toLowerCase();
        const users = window.db.readAll('users');
        
        if (!searchTerm) {
            this.renderUsers(users);
            return;
        }
        
        const filteredUsers = users.filter(user => {
            return user.name.toLowerCase().includes(searchTerm) ||
                   user.email.toLowerCase().includes(searchTerm) ||
                   user.studentId.toLowerCase().includes(searchTerm) ||
                   user.campus.toLowerCase().includes(searchTerm);
        });
        
        this.renderUsers(filteredUsers);
    }
    
    renderUsers(users) {
        this.usersListAdmin.innerHTML = '';
        
        if (users.length === 0) {
            this.usersListAdmin.innerHTML = '<p class="no-data">No users found</p>';
            return;
        }
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            const registrations = window.db.readAll('registrations', { userId: user.id });
            const attendance = window.db.readAll('attendance', { studentId: user.studentId });
            
            userElement.innerHTML = `
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <div class="user-meta">
                        <span>${user.email}</span>
                        <span>${user.studentId}</span>
                        <span class="campus-badge">${user.campus}</span>
                        <span class="user-role ${user.role}">${user.role}</span>
                    </div>
                </div>
                <div class="user-actions">
                    ${user.role !== 'admin' ? `
                        <button class="btn-secondary btn-small make-admin" data-id="${user.id}">
                            Promote
                        </button>
                    ` : ''}
                    <button class="btn-danger btn-small delete-user" data-id="${user.id}">
                        Delete
                    </button>
                </div>
            `;
            
            this.usersListAdmin.appendChild(userElement);
        });
        
        // Add User Action Listeners
        document.querySelectorAll('.make-admin').forEach(btn => {
            btn.addEventListener('click', (e) => this.makeAdmin(e.target.dataset.id));
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteUser(e.target.dataset.id));
        });
    }
    
    makeAdmin(userId) {
        if (!confirm('Are you sure you want to make this user an admin?')) return;
        try {
            window.db.update('users', userId, { role: 'admin' });
            this.showNotification('User promoted to admin', 'success');
            this.loadUsers();
        } catch (error) {
            this.showNotification('Failed: ' + error.message, 'error');
        }
    }
    
    deleteUser(userId) {
        if (!confirm('Delete this user? This removes all their data.')) return;
        try {
            // Delete related data
            const sessions = window.db.readAll('sessions', { userId: userId });
            sessions.forEach(s => window.db.delete('sessions', s.id));
            
            const qrCodes = window.db.readAll('qr_codes', { userId: userId });
            qrCodes.forEach(q => window.db.delete('qr_codes', q.id));
            
            const registrations = window.db.readAll('registrations', { userId: userId });
            registrations.forEach(r => {
                const event = window.db.read('events', r.eventId);
                if (event && event.registered > 0) {
                    window.db.update('events', event.id, { registered: event.registered - 1 });
                }
                window.db.delete('registrations', r.id);
            });
            
            window.db.delete('users', userId);
            
            this.showNotification('User deleted', 'success');
            this.loadUsers();
            this.updateAnalytics();
        } catch (error) {
            this.showNotification('Failed: ' + error.message, 'error');
        }
    }

    exportUsers() {
        const users = window.db.readAll('users');
        if (users.length === 0) {
            this.showNotification('No users to export', 'error');
            return;
        }
        
        const headers = ['Name', 'Email', 'Student ID', 'Campus', 'Role', 'Created At'];
        const csvRows = [headers.join(',')];
        
        users.forEach(user => {
            const row = [
                `"${user.name}"`,
                `"${user.email}"`,
                `"${user.studentId}"`,
                `"${user.campus}"`,
                `"${user.role}"`,
                `"${new Date(user.createdAt).toLocaleDateString()}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ICCT_Users_Export.csv`;
        a.click();
        this.showNotification('Users exported successfully', 'success');
    }

    // ==========================================
    // 4. ADMIN SCANNER
    // ==========================================
    adminScanAttendance() {
        const scanData = this.adminScanInput.value.trim();
        if (!scanData) {
            this.showNotification('Please enter QR data or ID', 'error');
            return;
        }

        // Simple mock scan logic
        const record = {
            id: scanData,
            name: 'Scanned Student', // In real app, look up user by ID
            campus: 'Main Campus',
            timestamp: new Date().toLocaleString(),
            status: 'Present',
            scanMethod: 'Admin Manual'
        };

        this.adminAttendanceRecords.unshift(record);
        window.db.create('attendance', record);
        
        this.renderAdminAttendanceList();
        this.updateAnalytics();
        this.showNotification('Attendance recorded', 'success');
        this.adminScanInput.value = '';
    }

    renderAdminAttendanceList() {
        this.adminAttendanceList.innerHTML = '';
        this.adminAttendanceRecords.slice(0, 10).forEach(record => {
            const item = document.createElement('div');
            item.className = 'attendance-item fade-in';
            item.innerHTML = `
                <div>
                    <strong>${record.id}</strong>
                    <br><small>${record.timestamp}</small>
                </div>
                <span class="status-indicator">${record.status}</span>
            `;
            this.adminAttendanceList.appendChild(item);
        });
    }

    // Helper: Notifications
    showNotification(message, type = 'info') {
        const colors = { success: '#27ae60', error: '#e74c3c', warning: '#f39c12', info: '#3498db' };
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background-color: ${colors[type]}; color: white;
            padding: 1rem 2rem; border-radius: 8px; z-index: 9999;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: slideInUp 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Only init if not already done in main.js to avoid duplicates
    if (!window.adminPanel) {
        window.adminPanel = new AdminPanel();
    }
});