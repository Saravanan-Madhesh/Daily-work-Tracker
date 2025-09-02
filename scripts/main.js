/**
 * Daily Work Tracker - Main Application Controller
 * Handles navigation, initialization, and global application state
 */

class DailyWorkTracker {
    constructor() {
        this.currentSection = 'roadmap';
        this.isInitialized = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
        this.updateCurrentDate = this.updateCurrentDate.bind(this);
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Daily Work Tracker...');
            
            // Check browser compatibility
            if (!this.checkBrowserCompatibility()) {
                this.showError('Browser not supported. Please use Chrome 86+ or Edge 86+');
                return;
            }

            // Initialize storage
            await StorageManager.init();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update current date
            this.updateCurrentDate();
            
            // Set up daily reset check
            this.setupDailyResetCheck();
            
            // Initialize navigation
            this.navigateToSection('roadmap');
            
            // Initialize modules
            await this.initializeModules();
            
            // Test layout responsiveness
            setTimeout(() => {
                this.testLayoutResponsiveness();
            }, 100);
            
            this.isInitialized = true;
            console.log('Daily Work Tracker initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Check if browser supports required APIs
     */
    checkBrowserCompatibility() {
        const requiredAPIs = [
            'localStorage' in window,
            'indexedDB' in window,
            'addEventListener' in window,
            'Date' in window,
            'requestAnimationFrame' in window,
            'getComputedStyle' in window
        ];
        
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edg/.test(navigator.userAgent); // Updated Edge detection
        
        // Check for CSS Grid and Flexbox support
        const supportsCSS = this.checkCSSSupport();
        
        return requiredAPIs.every(api => api) && (isChrome || isEdge) && supportsCSS;
    }

    /**
     * Check CSS feature support
     */
    checkCSSSupport() {
        const testElement = document.createElement('div');
        
        // Test CSS Grid support
        testElement.style.display = 'grid';
        const supportsGrid = testElement.style.display === 'grid';
        
        // Test CSS Flexbox support
        testElement.style.display = 'flex';
        const supportsFlex = testElement.style.display === 'flex';
        
        // Test CSS Custom Properties (CSS Variables)
        testElement.style.setProperty('--test-var', 'test');
        const supportsCustomProps = testElement.style.getPropertyValue('--test-var') === 'test';
        
        return supportsGrid && supportsFlex && supportsCustomProps;
    }

    /**
     * Test layout responsiveness
     */
    testLayoutResponsiveness() {
        if (!this.isInitialized) return false;
        
        const sidebar = document.querySelector('.sidebar');
        const contentArea = document.querySelector('.content-area');
        const appMain = document.querySelector('.app-main');
        
        if (!sidebar || !contentArea || !appMain) {
            console.error('Layout elements not found');
            return false;
        }
        
        // Test mobile layout
        const isMobile = window.innerWidth <= 768;
        const mainFlexDirection = getComputedStyle(appMain).flexDirection;
        
        if (isMobile && mainFlexDirection !== 'column') {
            console.warn('Mobile layout not applied correctly');
            return false;
        }
        
        if (!isMobile && mainFlexDirection !== 'row') {
            console.warn('Desktop layout not applied correctly');
            return false;
        }
        
        console.log('Layout responsiveness test passed');
        return true;
    }

    /**
     * Handle window resize events
     */
    handleWindowResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Test layout after resize
            this.testLayoutResponsiveness();
            
            // Notify roadmap to resize canvas if active
            if (this.currentSection === 'roadmap' && window.RoadmapManager) {
                RoadmapManager.resizeCanvas();
            }
            
            // Update any size-dependent components
            this.updateLayoutDependentComponents();
            
        }, 250);
    }

    /**
     * Update components that depend on layout size
     */
    updateLayoutDependentComponents() {
        // Update modal positioning if open
        const modal = document.querySelector('.modal-container.active');
        if (modal) {
            // Reposition modal if needed
            const modalContent = modal.querySelector('.modal');
            if (modalContent) {
                // Ensure modal fits in viewport
                const maxHeight = window.innerHeight * 0.9;
                modalContent.style.maxHeight = maxHeight + 'px';
            }
        }

        // Update any other size-dependent elements
        this.updateResponsiveElements();
    }

    /**
     * Update responsive elements based on screen size
     */
    updateResponsiveElements() {
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        // Update navigation behavior
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (isMobile) {
                link.classList.add('mobile-nav');
            } else {
                link.classList.remove('mobile-nav');
            }
        });

        // Update button sizes on very small screens
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            if (isSmallMobile) {
                button.classList.add('btn-small');
            } else {
                button.classList.remove('btn-small');
            }
        });

        // Update section headers
        const sectionHeaders = document.querySelectorAll('.section-header');
        sectionHeaders.forEach(header => {
            if (isMobile) {
                header.classList.add('mobile-header');
            } else {
                header.classList.remove('mobile-header');
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', this.handleNavigation);
        });

        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-container')) {
                this.hideModal();
            }
            if (e.target.classList.contains('modal-close')) {
                this.hideModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Create Journal button
        const createJournalBtn = document.getElementById('createJournal');
        if (createJournalBtn) {
            createJournalBtn.addEventListener('click', this.exportJournal.bind(this));
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this.showSettings.bind(this));
        }

        // Handle page visibility changes for daily reset
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkDailyReset();
            }
        });

        // Handle window focus for daily reset
        window.addEventListener('focus', () => {
            this.checkDailyReset();
        });

        // Handle window resize for responsive layout
        window.addEventListener('resize', this.handleWindowResize.bind(this));
    }

    /**
     * Handle navigation between sections
     */
    handleNavigation(e) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        if (href && href.startsWith('#')) {
            const sectionName = href.substring(1);
            this.navigateToSection(sectionName);
        }
    }

    /**
     * Navigate to a specific section
     */
    navigateToSection(sectionName) {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeNavLink = document.querySelector(`[href="#${sectionName}"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const activeSection = document.getElementById(`${sectionName}-section`);
        if (activeSection) {
            activeSection.classList.add('active');
            this.currentSection = sectionName;
        }

        // Trigger section-specific initialization
        this.onSectionChange(sectionName);
    }

    /**
     * Handle section change events
     */
    onSectionChange(sectionName) {
        switch (sectionName) {
            case 'roadmap':
                if (window.RoadmapManager) {
                    RoadmapManager.refresh();
                }
                break;
            case 'checklist':
                if (window.ChecklistManager) {
                    ChecklistManager.refresh();
                }
                break;
            case 'todos':
                if (window.TodosManager) {
                    TodosManager.refresh();
                }
                break;
            case 'meetings':
                if (window.MeetingsManager) {
                    MeetingsManager.refresh();
                }
                break;
        }
    }

    /**
     * Update current date display
     */
    updateCurrentDate() {
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                weekday: 'short'
            };
            currentDateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    /**
     * Set up daily reset check timer
     */
    setupDailyResetCheck() {
        // Check every minute for daily reset
        setInterval(() => {
            this.checkDailyReset();
        }, 60000);
        
        // Initial check
        this.checkDailyReset();
    }

    /**
     * Check if daily reset is needed
     */
    async checkDailyReset() {
        if (window.DailyResetManager) {
            await DailyResetManager.checkAndReset();
        }
    }

    /**
     * Initialize application modules
     */
    async initializeModules() {
        const modules = ['RoadmapManager', 'ChecklistManager', 'TodosManager', 'MeetingsManager'];
        
        for (const moduleName of modules) {
            try {
                if (window[moduleName] && typeof window[moduleName].init === 'function') {
                    await window[moduleName].init();
                    console.log(`${moduleName} initialized successfully`);
                } else if (moduleName === 'TodosManager') {
                    console.log(`${moduleName} will be loaded when todos.js is included`);
                }
            } catch (error) {
                console.error(`Failed to initialize ${moduleName}:`, error);
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'j':
                    e.preventDefault();
                    this.exportJournal();
                    break;
                case '1':
                    e.preventDefault();
                    this.navigateToSection('roadmap');
                    break;
                case '2':
                    e.preventDefault();
                    this.navigateToSection('checklist');
                    break;
                case '3':
                    e.preventDefault();
                    this.navigateToSection('todos');
                    break;
                case '4':
                    e.preventDefault();
                    this.navigateToSection('meetings');
                    break;
            }
        }

        // Escape key closes modals
        if (e.key === 'Escape') {
            this.hideModal();
        }
    }

    /**
     * Show modal dialog
     */
    showModal(content, options = {}) {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = content;

        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);
        modalContainer.classList.add('active');

        // Focus management
        const firstFocusable = modal.querySelector('input, textarea, button, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }

        return modal;
    }

    /**
     * Hide modal dialog
     */
    hideModal() {
        const modalContainer = document.getElementById('modalContainer');
        if (modalContainer) {
            modalContainer.classList.remove('active');
            setTimeout(() => {
                modalContainer.innerHTML = '';
            }, 300);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';
        errorDiv.textContent = message;
        
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.insertBefore(errorDiv, contentArea.firstChild);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'message success';
        successDiv.textContent = message;
        
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.insertBefore(successDiv, contentArea.firstChild);
            setTimeout(() => successDiv.remove(), 3000);
        }
    }

    /**
     * Export journal data
     */
    async exportJournal() {
        try {
            if (window.FileExportManager) {
                await FileExportManager.exportDailyJournal();
                this.showSuccess('Journal exported successfully!');
            } else {
                this.showError('Export functionality not available');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export journal: ' + error.message);
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        const settingsContent = `
            <div class="modal-header">
                <h3 class="modal-title">Settings</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Theme</label>
                    <select class="form-select" id="themeSelect">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Daily Reset Time</label>
                    <input type="time" class="form-input" id="resetTimeInput" value="00:00">
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="enableNotifications"> Enable Notifications
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="app.saveSettings()">Save Settings</button>
            </div>
        `;
        
        this.showModal(settingsContent);
    }

    /**
     * Save application settings
     */
    async saveSettings() {
        try {
            const settings = {
                theme: document.getElementById('themeSelect').value,
                resetTime: document.getElementById('resetTimeInput').value,
                notifications: document.getElementById('enableNotifications').checked
            };

            await StorageManager.set('app_settings', settings);
            this.hideModal();
            this.showSuccess('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError('Failed to save settings');
        }
    }

    /**
     * Get application version info
     */
    getVersionInfo() {
        return {
            version: '1.0.0',
            buildDate: new Date().toISOString().split('T')[0],
            features: ['roadmap', 'checklist', 'todos', 'meetings', 'journal-export']
        };
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DailyWorkTracker();
    window.app.init();
});

// Handle unload events
window.addEventListener('beforeunload', () => {
    // Perform any cleanup if needed
    console.log('Application shutting down...');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DailyWorkTracker;
}