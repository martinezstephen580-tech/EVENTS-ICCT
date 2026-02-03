// Advanced LocalStorage Database Simulation
class Database {
    constructor() {
        this.init();
    }
    
    init() {
        // Initialize tables if they don't exist
        this.tables = {
            users: 'icct_users_v2',
            events: 'icct_events_v2',
            attendance: 'icct_attendance_v2',
            registrations: 'icct_registrations_v2',
            qr_codes: 'icct_qr_codes_v2',
            sessions: 'icct_sessions_v2',
            analytics: 'icct_analytics_v2'
        };
        
        // Initialize with sample data if empty
        this.initializeSampleData();
    }
    
    // CRUD Operations with validation
    create(table, data) {
        if (!this.tables[table]) {
            throw new Error(`Table ${table} does not exist`);
        }
        
        // Generate ID if not provided
        if (!data.id) {
            data.id = this.generateId();
        }
        
        // Add timestamps
        data.createdAt = new Date().toISOString();
        data.updatedAt = data.createdAt;
        
        // Get existing data
        const existingData = this.readAll(table);
        
        // Check for duplicates (based on email for users, title for events)
        if (table === 'users' && data.email) {
            const duplicate = existingData.find(item => item.email === data.email);
            if (duplicate) {
                throw new Error('User with this email already exists');
            }
        }
        
        if (table === 'events' && data.title) {
            const duplicate = existingData.find(item => 
                item.title === data.title && 
                item.date === data.date
            );
            if (duplicate) {
                throw new Error('Event with this title and date already exists');
            }
        }
        
        // Add to array and save
        existingData.push(data);
        localStorage.setItem(this.tables[table], JSON.stringify(existingData));
        
        // Update analytics
        this.updateAnalytics(table, 'create');
        
        return data;
    }
    
    read(table, id) {
        const data = this.readAll(table);
        return data.find(item => item.id === id);
    }
    
    readAll(table, filters = {}) {
        if (!this.tables[table]) {
            throw new Error(`Table ${table} does not exist`);
        }
        
        const data = JSON.parse(localStorage.getItem(this.tables[table]) || '[]');
        
        // Apply filters if provided
        if (Object.keys(filters).length > 0) {
            return data.filter(item => {
                return Object.entries(filters).every(([key, value]) => {
                    if (value === undefined || value === null) return true;
                    if (typeof value === 'string') {
                        return item[key] && item[key].toString().toLowerCase().includes(value.toLowerCase());
                    }
                    return item[key] === value;
                });
            });
        }
        
        return data;
    }
    
    update(table, id, updates) {
        const data = this.readAll(table);
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) {
            throw new Error(`${table.slice(0, -1)} with id ${id} not found`);
        }
        
        // Update with new data
        data[index] = {
            ...data[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Save back to localStorage
        localStorage.setItem(this.tables[table], JSON.stringify(data));
        
        // Update analytics
        this.updateAnalytics(table, 'update');
        
        return data[index];
    }
    
    delete(table, id) {
        const data = this.readAll(table);
        const filteredData = data.filter(item => item.id !== id);
        
        if (filteredData.length === data.length) {
            throw new Error(`${table.slice(0, -1)} with id ${id} not found`);
        }
        
        localStorage.setItem(this.tables[table], JSON.stringify(filteredData));
        
        // Update analytics
        this.updateAnalytics(table, 'delete');
        
        return true;
    }
    
    // Advanced query methods
    query(table, conditions) {
        const data = this.readAll(table);
        
        return data.filter(item => {
            return Object.entries(conditions).every(([key, condition]) => {
                if (typeof condition === 'object') {
                    // Handle comparison operators
                    if (condition.$eq !== undefined) return item[key] === condition.$eq;
                    if (condition.$ne !== undefined) return item[key] !== condition.$ne;
                    if (condition.$gt !== undefined) return item[key] > condition.$gt;
                    if (condition.$lt !== undefined) return item[key] < condition.$lt;
                    if (condition.$gte !== undefined) return item[key] >= condition.$gte;
                    if (condition.$lte !== undefined) return item[key] <= condition.$lte;
                    if (condition.$in !== undefined) return condition.$in.includes(item[key]);
                    if (condition.$like !== undefined) {
                        return item[key] && item[key].toString().toLowerCase().includes(condition.$like.toLowerCase());
                    }
                }
                // Simple equality check
                return item[key] === condition;
            });
        });
    }
    
    // Count records
    count(table, filters = {}) {
        return this.readAll(table, filters).length;
    }
    
    // Get paginated results
    paginate(table, page = 1, limit = 10, filters = {}) {
        const data = this.readAll(table, filters);
        const total = data.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return {
            data: data.slice(startIndex, endIndex),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
    
    // Search across multiple fields
    search(table, searchTerm, fields = []) {
        const data = this.readAll(table);
        
        if (!searchTerm) return data;
        
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (!value) return false;
                return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
            });
        });
    }
    
    // Analytics methods
    updateAnalytics(table, operation) {
        const today = new Date().toISOString().split('T')[0];
        const analytics = this.readAll('analytics');
        
        let dayAnalytics = analytics.find(a => a.date === today);
        
        if (!dayAnalytics) {
            dayAnalytics = {
                id: today,
                date: today,
                operations: {},
                userActivity: {},
                eventStats: {}
            };
            analytics.push(dayAnalytics);
        }
        
        // Update operation count
        if (!dayAnalytics.operations[operation]) {
            dayAnalytics.operations[operation] = 0;
        }
        dayAnalytics.operations[operation]++;
        
        // Update table-specific stats
        if (!dayAnalytics.operations[table]) {
            dayAnalytics.operations[table] = 0;
        }
        dayAnalytics.operations[table]++;
        
        localStorage.setItem(this.tables.analytics, JSON.stringify(analytics));
    }
    
    getAnalytics(startDate, endDate) {
        const analytics = this.readAll('analytics');
        return analytics.filter(a => {
            const date = new Date(a.date);
            return (!startDate || date >= new Date(startDate)) && 
                   (!endDate || date <= new Date(endDate));
        });
    }
    
    // Initialize with sample data
    initializeSampleData() {
        // Users table
        if (this.count('users') === 0) {
            const sampleUsers = [
                {
                    id: 'user001',
                    name: 'Juan Dela Cruz',
                    email: 'juan.delacruz@icct.edu.ph',
                    studentId: '2023-00123',
                    campus: 'Main Campus',
                    password: this.hashPassword('password123'),
                    role: 'student',
                    createdAt: '2024-01-15T08:30:00Z'
                },
                {
                    id: 'user002',
                    name: 'Maria Santos',
                    email: 'maria.santos@icct.edu.ph',
                    studentId: '2023-00234',
                    campus: 'Cainta Campus',
                    password: this.hashPassword('password123'),
                    role: 'student',
                    createdAt: '2024-01-16T09:15:00Z'
                }
            ];
            
            sampleUsers.forEach(user => this.create('users', user));
        }
        
        // Events table (if empty)
        if (this.count('events') === 0) {
            // Use existing eventsData
            if (typeof window.eventsData !== 'undefined') {
                window.eventsData.forEach(event => {
                    this.create('events', event);
                });
            }
        }
    }
    
    // Helper methods
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    hashPassword(password) {
        // Simple hash for demo purposes (in real app, use bcrypt)
        return btoa(password + 'icct_salt');
    }
    
    verifyPassword(hashedPassword, password) {
        return hashedPassword === this.hashPassword(password);
    }
    
    // Transaction support
    transaction(operations) {
        try {
            const results = [];
            operations.forEach(op => {
                const { table, type, data } = op;
                switch(type) {
                    case 'create':
                        results.push(this.create(table, data));
                        break;
                    case 'update':
                        results.push(this.update(table, data.id, data));
                        break;
                    case 'delete':
                        results.push(this.delete(table, data.id));
                        break;
                }
            });
            return results;
        } catch (error) {
            // In a real DB, we would rollback here
            throw error;
        }
    }
    
    // Backup and restore
    backup() {
        const backup = {};
        Object.keys(this.tables).forEach(table => {
            backup[table] = this.readAll(table);
        });
        return backup;
    }
    
    restore(backupData) {
        Object.keys(backupData).forEach(table => {
            if (this.tables[table]) {
                localStorage.setItem(this.tables[table], JSON.stringify(backupData[table]));
            }
        });
    }
    
    // Export data
    exportToJSON(table) {
        return JSON.stringify(this.readAll(table), null, 2);
    }
    
    importFromJSON(table, jsonData) {
        const data = JSON.parse(jsonData);
        if (Array.isArray(data)) {
            localStorage.setItem(this.tables[table], JSON.stringify(data));
        }
    }
    
    // Clear all data (use with caution!)
    clearAll() {
        Object.values(this.tables).forEach(table => {
            localStorage.removeItem(table);
        });
    }
}

// Create global database instance
window.db = new Database();