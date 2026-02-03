// Advanced Search and Filter System
class SearchSystem {
    constructor() {
        this.searchInput = document.getElementById('event-search');
        this.searchBtn = document.getElementById('search-btn');
        this.advancedSearchBtn = document.getElementById('advanced-search-btn');
        this.searchCampus = document.getElementById('search-campus');
        this.searchCategory = document.getElementById('search-category');
        this.searchDate = document.getElementById('search-date');
        this.sortEvents = document.getElementById('sort-events');
        this.viewControls = document.querySelectorAll('.view-btn');
        
        this.currentSearch = '';
        this.currentFilters = {};
        this.currentSort = 'date';
        this.currentView = 'grid';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupViewControls();
    }
    
    setupEventListeners() {
        // Search button
        this.searchBtn.addEventListener('click', () => this.performSearch());
        
        // Enter key in search input
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        // Advanced search
        this.advancedSearchBtn.addEventListener('click', () => this.toggleAdvancedFilters());
        
        // Filter changes
        this.searchCampus.addEventListener('change', () => this.applyFilters());
        this.searchCategory.addEventListener('change', () => this.applyFilters());
        this.searchDate.addEventListener('change', () => this.applyFilters());
        this.sortEvents.addEventListener('change', () => this.applySorting());
    }
    
    setupViewControls() {
        this.viewControls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('button').dataset.view;
                this.switchView(view);
            });
        });
    }
    
    performSearch() {
        this.currentSearch = this.searchInput.value.trim();
        this.applyFilters();
    }
    
    applyFilters() {
        // Build filters object
        this.currentFilters = {};
        
        if (this.searchCampus.value !== 'all') {
            this.currentFilters.campus = this.searchCampus.value;
        }
        
        if (this.searchCategory.value !== 'all') {
            this.currentFilters.category = this.searchCategory.value;
        }
        
        if (this.searchDate.value) {
            this.currentFilters.date = this.searchDate.value;
        }
        
        // Get filtered events
        let events = window.db.readAll('events');
        
        // Apply search term
        if (this.currentSearch) {
            events = events.filter(event => {
                const searchableText = [
                    event.title,
                    event.description,
                    event.location,
                    event.speaker || ''
                ].join(' ').toLowerCase();
                
                return searchableText.includes(this.currentSearch.toLowerCase());
            });
        }
        
        // Apply filters
        if (this.currentFilters.campus) {
            events = events.filter(event => event.campus === this.currentFilters.campus);
        }
        
        if (this.currentFilters.category) {
            events = events.filter(event => event.category === this.currentFilters.category);
        }
        
        if (this.currentFilters.date) {
            events = events.filter(event => event.date === this.currentFilters.date);
        }
        
        // Apply sorting
        events = this.sortEventsList(events, this.currentSort);
        
        // Update event manager with filtered events
        if (window.eventManager) {
            window.eventManager.filteredEvents = events;
            window.eventManager.renderEvents();
            
            // Update pagination
            this.updatePagination(events.length);
        }
    }
    
    applySorting() {
        this.currentSort = this.sortEvents.value;
        this.applyFilters();
    }
    
    sortEventsList(events, sortBy) {
        return [...events].sort((a, b) => {
            switch(sortBy) {
                case 'date':
                    return new Date(a.date) - new Date(b.date);
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'popularity':
                    const aPercent = (a.registered / a.capacity) * 100;
                    const bPercent = (b.registered / b.capacity) * 100;
                    return bPercent - aPercent;
                case 'name':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Update active button
        this.viewControls.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update events container class
        const eventsContainer = document.getElementById('events-container');
        eventsContainer.className = view === 'grid' ? 'events-grid' : 'events-list';
        
        // Re-render events
        if (window.eventManager) {
            window.eventManager.renderEvents();
        }
    }
    
    toggleAdvancedFilters() {
        const filters = document.querySelector('.search-filters');
        filters.classList.toggle('expanded');
        
        if (filters.classList.contains('expanded')) {
            this.advancedSearchBtn.innerHTML = '<i class="fas fa-times"></i> Hide Filters';
        } else {
            this.advancedSearchBtn.innerHTML = '<i class="fas fa-filter"></i> Advanced Filters';
        }
    }
    
    updatePagination(totalEvents) {
        const pagination = document.getElementById('events-pagination');
        const itemsPerPage = 6;
        const totalPages = Math.ceil(totalEvents / itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination-controls">';
        
        // Previous button
        html += '<button class="page-btn prev-btn" disabled><i class="fas fa-chevron-left"></i></button>';
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === 1 ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        // Next button
        html += '<button class="page-btn next-btn"><i class="fas fa-chevron-right"></i></button>';
        
        html += '</div>';
        pagination.innerHTML = html;
        
        // Add event listeners
        this.setupPaginationEvents();
    }
    
    setupPaginationEvents() {
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.goToPage(page);
                } else if (e.target.closest('.prev-btn')) {
                    this.prevPage();
                } else if (e.target.closest('.next-btn')) {
                    this.nextPage();
                }
            });
        });
    }
    
    goToPage(page) {
        // Update active page
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page == page) {
                btn.classList.add('active');
            }
        });
        
        // Update prev/next buttons
        const totalPages = document.querySelectorAll('.page-btn[data-page]').length;
        document.querySelector('.prev-btn').disabled = page === 1;
        document.querySelector('.next-btn').disabled = page === totalPages;
        
        // Update events display (paginated)
        if (window.eventManager) {
            const itemsPerPage = 6;
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            
            window.eventManager.currentPageEvents = window.eventManager.filteredEvents.slice(startIndex, endIndex);
            window.eventManager.renderEvents();
        }
    }
    
    prevPage() {
        const activePage = document.querySelector('.page-btn.active');
        const currentPage = parseInt(activePage.dataset.page);
        if (currentPage > 1) {
            this.goToPage(currentPage - 1);
        }
    }
    
    nextPage() {
        const activePage = document.querySelector('.page-btn.active');
        const currentPage = parseInt(activePage.dataset.page);
        const totalPages = document.querySelectorAll('.page-btn[data-page]').length;
        if (currentPage < totalPages) {
            this.goToPage(currentPage + 1);
        }
    }
    
    // Quick search method for other components
    quickSearch(term) {
        this.searchInput.value = term;
        this.performSearch();
    }
    
    // Reset all filters
    resetFilters() {
        this.searchInput.value = '';
        this.searchCampus.value = 'all';
        this.searchCategory.value = 'all';
        this.searchDate.value = '';
        this.sortEvents.value = 'date';
        this.currentSearch = '';
        this.currentFilters = {};
        
        if (window.eventManager) {
            window.eventManager.filteredEvents = window.db.readAll('events');
            window.eventManager.renderEvents();
        }
    }
}

// Initialize search system
document.addEventListener('DOMContentLoaded', () => {
    window.searchSystem = new SearchSystem();
});