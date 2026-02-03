// Shopping Cart Equivalent for Event Registration
class EventCart {
    constructor() {
        this.cartItems = [];
        this.loadCart();
        
        // DOM Elements
        this.cartCount = document.getElementById('cart-count');
        this.eventCart = document.getElementById('event-cart');
        this.checkoutBtn = document.getElementById('checkout-btn');
        this.clearCartBtn = document.getElementById('clear-cart-btn');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateCartDisplay();
    }
    
    setupEventListeners() {
        this.clearCartBtn.addEventListener('click', () => this.clearCart());
        this.checkoutBtn.addEventListener('click', () => this.checkout());
    }
    
    // Add event to cart
    addToCart(eventId) {
        if (!window.userSystem || !window.userSystem.isUserLoggedIn()) {
            alert('Please login to add events to your cart');
            window.userSystem.openAuthModal('login');
            return;
        }
        
        const event = window.db.read('events', eventId);
        if (!event) {
            alert('Event not found');
            return;
        }
        
        // Check if already in cart
        if (this.cartItems.find(item => item.id === eventId)) {
            alert('Event already in cart');
            return;
        }
        
        // Check if already registered
        const user = window.userSystem.getCurrentUser();
        const registrations = window.db.readAll('registrations', { 
            userId: user.id,
            eventId: eventId
        });
        
        if (registrations.length > 0) {
            alert('You are already registered for this event');
            return;
        }
        
        // Check capacity
        if (event.registered >= event.capacity) {
            alert('This event is full');
            return;
        }
        
        // Add to cart
        this.cartItems.push({
            id: eventId,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            campus: event.campus,
            category: event.category,
            capacity: event.capacity,
            registered: event.registered,
            available: event.capacity - event.registered
        });
        
        this.saveCart();
        this.updateCartDisplay();
        
        // Show notification
        this.showNotification(`Added "${event.title}" to cart`, 'success');
    }
    
    // Remove from cart
    removeFromCart(eventId) {
        this.cartItems = this.cartItems.filter(item => item.id !== eventId);
        this.saveCart();
        this.updateCartDisplay();
        
        this.showNotification('Event removed from cart', 'info');
    }
    
    // Clear cart
    clearCart() {
        if (this.cartItems.length === 0) return;
        
        if (!confirm('Are you sure you want to clear your cart?')) {
            return;
        }
        
        this.cartItems = [];
        this.saveCart();
        this.updateCartDisplay();
        
        this.showNotification('Cart cleared', 'info');
    }
    
    // Checkout (register for all events in cart)
    async checkout() {
        if (this.cartItems.length === 0) return;
        
        if (!window.userSystem || !window.userSystem.isUserLoggedIn()) {
            alert('Please login to checkout');
            window.userSystem.openAuthModal('login');
            return;
        }
        
        const user = window.userSystem.getCurrentUser();
        
        // Check capacity for all events
        for (const item of this.cartItems) {
            const event = window.db.read('events', item.id);
            if (!event) {
                alert(`Event "${item.title}" no longer exists`);
                return;
            }
            
            if (event.registered >= event.capacity) {
                alert(`Event "${item.title}" is now full`);
                return;
            }
        }
        
        // Process all registrations
        const results = [];
        
        for (const item of this.cartItems) {
            try {
                // Create registration
                const registration = {
                    eventId: item.id,
                    userId: user.id,
                    studentId: user.studentId,
                    studentName: user.name,
                    campus: user.campus,
                    status: 'registered',
                    registeredAt: new Date().toISOString()
                };
                
                window.db.create('registrations', registration);
                
                // Update event registration count
                const event = window.db.read('events', item.id);
                window.db.update('events', item.id, {
                    registered: event.registered + 1
                });
                
                results.push({
                    success: true,
                    event: item.title
                });
                
            } catch (error) {
                results.push({
                    success: false,
                    event: item.title,
                    error: error.message
                });
            }
        }
        
        // Clear cart
        this.cartItems = [];
        this.saveCart();
        this.updateCartDisplay();
        
        // Show results
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        let message = `Successfully registered for ${successful} event${successful !== 1 ? 's' : ''}`;
        if (failed > 0) {
            message += `, ${failed} failed`;
        }
        
        this.showNotification(message, successful > 0 ? 'success' : 'error');
        
        // Refresh dashboard
        if (window.userSystem) {
            window.userSystem.loadRegistrations();
        }
        
        // Refresh events display
        if (window.eventManager) {
            window.eventManager.filteredEvents = window.db.readAll('events');
            window.eventManager.renderEvents();
        }
    }
    
    // Update cart display
    updateCartDisplay() {
        // Update count
        this.cartCount.textContent = this.cartItems.length;
        
        // Update checkout button
        this.checkoutBtn.disabled = this.cartItems.length === 0;
        this.checkoutBtn.innerHTML = `<i class="fas fa-check-circle"></i> Register All (${this.cartItems.length})`;
        
        // Update cart items display
        this.renderCartItems();
    }
    
    renderCartItems() {
        if (this.cartItems.length === 0) {
            this.eventCart.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart fa-2x"></i>
                    <p>Your cart is empty</p>
                    <p>Add events from the events section</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="cart-items-list">';
        
        this.cartItems.forEach(item => {
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h5>${item.title}</h5>
                        <p><i class="fas fa-calendar"></i> ${item.date} at ${item.time}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${item.location}, ${item.campus}</p>
                        <p class="availability">${item.available} slots available</p>
                    </div>
                    <button class="btn-small btn-danger remove-from-cart" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
        this.eventCart.innerHTML = html;
        
        // Add remove event listeners
        document.querySelectorAll('.remove-from-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('button').dataset.id;
                this.removeFromCart(eventId);
            });
        });
    }
    
    // Save cart to localStorage
    saveCart() {
        const user = window.userSystem ? window.userSystem.getCurrentUser() : null;
        if (user) {
            localStorage.setItem(`cart_${user.id}`, JSON.stringify(this.cartItems));
        } else {
            localStorage.setItem('cart_guest', JSON.stringify(this.cartItems));
        }
    }
    
    // Load cart from localStorage
    loadCart() {
        let savedCart = null;
        const user = window.userSystem ? window.userSystem.getCurrentUser() : null;
        
        if (user) {
            savedCart = localStorage.getItem(`cart_${user.id}`);
        } else {
            savedCart = localStorage.getItem('cart_guest');
        }
        
        if (savedCart) {
            this.cartItems = JSON.parse(savedCart);
        }
    }
    
    // Transfer guest cart to user cart
    transferGuestCart(userId) {
        const guestCart = localStorage.getItem('cart_guest');
        if (guestCart) {
            localStorage.setItem(`cart_${userId}`, guestCart);
            localStorage.removeItem('cart_guest');
            this.loadCart();
            this.updateCartDisplay();
        }
    }
    
    // Check if event is in cart
    isInCart(eventId) {
        return this.cartItems.some(item => item.id === eventId);
    }
    
    // Get cart items count
    getCartCount() {
        return this.cartItems.length;
    }
    
    // Get cart items
    getCartItems() {
        return this.cartItems;
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db'
        };
        
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: ${colors[type] || colors.info};
                color: white;
                padding: 1rem 2rem;
                border-radius: var(--border-radius);
                box-shadow: var(--shadow);
                z-index: 3000;
                animation: slideInUp 0.3s ease;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2rem;">
                        ${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}
                    </span>
                    <div>${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize cart system
document.addEventListener('DOMContentLoaded', () => {
    window.eventCart = new EventCart();
});