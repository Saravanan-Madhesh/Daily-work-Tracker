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

        // Configure Project button
        const configureProjectBtn = document.getElementById('configureProject');
        if (configureProjectBtn) {
            configureProjectBtn.addEventListener('click', () => {
                if (window.RoadmapManager) {
                    RoadmapManager.showProjectConfig();
                } else {
                    this.showError('Roadmap manager not available');
                }
            });
        }

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
        // Initialize DailyResetManager first since other modules depend on it
        try {
            if (window.DailyResetManager && typeof window.DailyResetManager.init === 'function') {
                await window.DailyResetManager.init();
                console.log('DailyResetManager initialized successfully');
            }
        } catch (error) {
            console.error('Failed to initialize DailyResetManager:', error);
        }
        
        // Initialize other modules
        const modules = ['RoadmapManager', 'ChecklistManager', 'TodosManager', 'MeetingsManager'];
        
        for (const moduleName of modules) {
            try {
                if (window[moduleName] && typeof window[moduleName].init === 'function') {
                    await window[moduleName].init();
                    console.log(`${moduleName} initialized successfully`);
                } else if (moduleName === 'TodosManager') {
                    console.log(`${moduleName} will be loaded when todos.js is included`);
                } else {
                    console.log(`${moduleName} not available or init method not found`);
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
            // Check if this is a settings modal and auto-save
            const settingsModal = modalContainer.querySelector('.settings-modal');
            if (settingsModal && !this._isClosingSettings) {
                this.autoSaveSettings();
            }
            
            modalContainer.classList.remove('active');
            setTimeout(() => {
                modalContainer.innerHTML = '';
            }, 300);
        }
    }

    /**
     * Close settings with explicit save
     */
    async closeSettingsWithSave() {
        this._isClosingSettings = true;
        await this.saveSettings();
        this._isClosingSettings = false;
    }

    /**
     * Auto-save settings when modal is closed
     */
    async autoSaveSettings() {
        try {
            // Check if settings elements exist
            const themeSelect = document.getElementById('themeSelect');
            if (!themeSelect) return; // Not a settings modal
            
            const settings = {
                theme: document.getElementById('themeSelect').value,
                resetTime: document.getElementById('resetTimeInput').value,
                notifications: document.getElementById('enableNotifications').checked,
                soundNotifications: document.getElementById('enableSoundNotifications').checked,
                autoReset: document.getElementById('autoReset').checked,
                dataRetentionDays: parseInt(document.getElementById('dataRetentionDays').value) || 30,
                debugMode: document.getElementById('enableDebugMode').checked
            };

            // Validate settings
            if (settings.dataRetentionDays < 7 || settings.dataRetentionDays > 365) {
                settings.dataRetentionDays = 30; // Reset to default if invalid
            }

            // Validate reset time format
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.resetTime)) {
                settings.resetTime = '00:00'; // Reset to default if invalid
            }

            await StorageManager.set('app_settings', settings);
            
            // Update daily reset time if changed
            if (window.DailyResetManager) {
                await DailyResetManager.updateResetTime(settings.resetTime);
            }
            
            // Apply theme
            this.applyTheme(settings.theme);
            
            // Show subtle success message
            this.showSuccess('Settings saved automatically ✅');
            
        } catch (error) {
            console.error('Failed to auto-save settings:', error);
            this.showError('Failed to save settings automatically');
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
    async showSettings() {
        // Get current settings and storage info
        const settings = await StorageManager.get('app_settings') || {};
        const storageStats = await this.getStorageStats();
        
        const settingsContent = `
            <div class="modal-header">
                <h3 class="modal-title">⚙️ Application Settings</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body settings-modal">
                <!-- Theme Settings -->
                <div class="settings-section">
                    <h4>🎨 Appearance</h4>
                    <div class="form-group">
                        <label class="form-label">Theme</label>
                        <select class="form-select" id="themeSelect">
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>☀️ Light</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>🌙 Dark</option>
                            <option value="auto" ${settings.theme === 'auto' || !settings.theme ? 'selected' : ''}>🔄 Auto</option>
                        </select>
                        <small class="form-help">Choose your preferred color scheme</small>
                    </div>
                </div>

                <!-- Daily Reset Settings -->
                <div class="settings-section">
                    <h4>⏰ Daily Reset</h4>
                    <div class="form-group">
                        <label class="form-label">Daily Reset Time</label>
                        <input type="time" class="form-input" id="resetTimeInput" 
                               value="${settings.resetTime || '00:00'}">
                        <small class="form-help">Time when daily checklist resets (24-hour format)</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="autoReset" ${settings.autoReset !== false ? 'checked' : ''}> 
                            Enable automatic daily reset
                        </label>
                        <small class="form-help">Automatically reset checklist items each day</small>
                    </div>
                </div>

                <!-- Notification Settings -->
                <div class="settings-section">
                    <h4>🔔 Notifications</h4>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="enableNotifications" ${settings.notifications ? 'checked' : ''}> 
                            Enable browser notifications
                        </label>
                        <small class="form-help">Get notified about completed tasks and daily resets</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="enableSoundNotifications" ${settings.soundNotifications ? 'checked' : ''}> 
                            Enable sound notifications
                        </label>
                        <small class="form-help">Play sounds for task completion and alerts</small>
                    </div>
                </div>

                <!-- Data Storage Information -->
                <div class="settings-section">
                    <h4>💾 Data Storage</h4>
                    <div class="storage-info-box">
                        <div class="storage-location">
                            <div class="storage-label">📍 Storage Location:</div>
                            <div class="storage-path">Browser LocalStorage & IndexedDB</div>
                            <div class="storage-details">
                                Data is stored locally in your browser's storage system. This ensures:
                                <ul>
                                    <li>✅ Complete privacy - data never leaves your device</li>
                                    <li>✅ Fast performance - no network requests needed</li>
                                    <li>✅ Works offline - no internet connection required</li>
                                    <li>⚠️ Browser-specific - data tied to this browser/device</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="storage-stats">
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-value">${storageStats.totalItems}</div>
                                    <div class="stat-label">Total Items</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${storageStats.dataSize}</div>
                                    <div class="stat-label">Data Size</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${storageStats.lastBackup || 'Never'}</div>
                                    <div class="stat-label">Last Backup</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="storage-actions">
                        <button type="button" class="btn btn-outline" onclick="app.exportAllData()">
                            📤 Export All Data
                        </button>
                        <button type="button" class="btn btn-outline" onclick="app.importData()">
                            📥 Import Data
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="app.clearStorageData()">
                            🗑️ Clear All Data
                        </button>
                    </div>
                </div>

                <!-- Advanced Settings -->
                <div class="settings-section">
                    <h4>🔧 Advanced</h4>
                    <div class="form-group">
                        <label class="form-label">Data Retention (days)</label>
                        <input type="number" class="form-input" id="dataRetentionDays" 
                               value="${settings.dataRetentionDays || 30}" min="7" max="365">
                        <small class="form-help">How long to keep completed items (7-365 days)</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="enableDebugMode" ${settings.debugMode ? 'checked' : ''}> 
                            Enable debug mode
                        </label>
                        <small class="form-help">Show additional logging in browser console</small>
                    </div>
                </div>

                <!-- Application Info -->
                <div class="settings-section">
                    <h4>ℹ️ Application Information</h4>
                    <div class="app-info">
                        <div class="info-row">
                            <span class="info-label">Version:</span>
                            <span class="info-value">1.0.0</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Built:</span>
                            <span class="info-value">${new Date().toLocaleDateString()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Browser:</span>
                            <span class="info-value">${navigator.userAgent.split(' ').pop()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Platform:</span>
                            <span class="info-value">${navigator.platform}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="settings-footer-info">
                    <small class="text-muted">💡 Settings are saved automatically when you close this dialog</small>
                </div>
                <button class="btn btn-primary" onclick="app.closeSettingsWithSave()">Close & Save</button>
            </div>
        `;
        
        this.showModal(settingsContent);
        
        // Set up file input for import functionality
        this.setupFileImport();
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            let totalItems = 0;
            let dataSize = 0;
            
            // Count items from different stores
            const checklistItems = await StorageManager.getAllFromStore('checklistItems') || [];
            const todos = await StorageManager.getAllFromStore('todos') || [];
            const milestones = await StorageManager.getAllFromStore('milestones') || [];
            const meetings = await StorageManager.getAllFromStore('meetings') || [];
            
            totalItems = checklistItems.length + todos.length + milestones.length + meetings.length;
            
            // Estimate data size
            const allData = JSON.stringify({
                checklistItems, todos, milestones, meetings
            });
            dataSize = (allData.length / 1024).toFixed(1) + ' KB';
            
            // Get last backup info
            const lastBackup = await StorageManager.get('last_backup_date');
            const lastBackupFormatted = lastBackup ? 
                new Date(lastBackup).toLocaleDateString() : 'Never';
            
            return {
                totalItems,
                dataSize,
                lastBackup: lastBackupFormatted
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                totalItems: 0,
                dataSize: '0 KB',
                lastBackup: 'Error'
            };
        }
    }

    /**
     * Save application settings
     */
    async saveSettings() {
        try {
            const settings = {
                theme: document.getElementById('themeSelect').value,
                resetTime: document.getElementById('resetTimeInput').value,
                notifications: document.getElementById('enableNotifications').checked,
                soundNotifications: document.getElementById('enableSoundNotifications').checked,
                autoReset: document.getElementById('autoReset').checked,
                dataRetentionDays: parseInt(document.getElementById('dataRetentionDays').value) || 30,
                debugMode: document.getElementById('enableDebugMode').checked
            };

            // Validate settings
            if (settings.dataRetentionDays < 7 || settings.dataRetentionDays > 365) {
                throw new Error('Data retention must be between 7 and 365 days');
            }

            // Validate reset time format
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.resetTime)) {
                throw new Error('Invalid reset time format');
            }

            await StorageManager.set('app_settings', settings);
            
            // Update daily reset time if changed
            if (window.DailyResetManager) {
                await DailyResetManager.updateResetTime(settings.resetTime);
            }
            
            // Apply theme
            this.applyTheme(settings.theme);
            
            this.hideModal();
            this.showSuccess('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError(`Failed to save settings: ${error.message}`);
        }
    }

    /**
     * Apply theme
     */
    applyTheme(theme) {
        const body = document.body;
        body.classList.remove('theme-light', 'theme-dark');
        
        if (theme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add(`theme-${theme}`);
        }
    }

    /**
     * Export all application data
     */
    async exportAllData() {
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                application: 'Daily Work Tracker',
                data: {
                    settings: await StorageManager.get('app_settings') || {},
                    projectConfig: await StorageManager.get('project_config') || null,
                    checklistItems: await StorageManager.getAllFromStore('checklistItems') || [],
                    todos: await StorageManager.getAllFromStore('todos') || [],
                    milestones: await StorageManager.getAllFromStore('milestones') || [],
                    meetings: await StorageManager.getAllFromStore('meetings') || [],
                    journals: await StorageManager.getAllFromStore('journals') || []
                }
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `daily-work-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            // Update last backup date
            await StorageManager.set('last_backup_date', new Date().toISOString());
            
            this.showSuccess('Data exported successfully!');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data: ' + error.message);
        }
    }

    /**
     * Set up file import functionality
     */
    setupFileImport() {
        // Create hidden file input
        if (!this.fileInput) {
            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = '.json';
            this.fileInput.style.display = 'none';
            document.body.appendChild(this.fileInput);
        }
        
        this.fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processImportFile(file);
            }
        };
    }

    /**
     * Import data from file
     */
    importData() {
        if (this.fileInput) {
            this.fileInput.click();
        } else {
            this.showError('File import not available');
        }
    }

    /**
     * Process import file
     */
    async processImportFile(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data structure
            if (!importData.data || !importData.version) {
                throw new Error('Invalid backup file format');
            }
            
            // Show confirmation
            const confirmMessage = `Import data from backup file?\n\nThis will:\n- Replace all current data\n- Cannot be undone\n\nBackup date: ${new Date(importData.exportDate).toLocaleString()}\n\nContinue?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Import data
            const data = importData.data;
            
            // Clear existing data
            await this.clearAllStorageData(false);
            
            // Import settings
            if (data.settings) {
                await StorageManager.set('app_settings', data.settings);
            }
            
            // Import project config
            if (data.projectConfig) {
                await StorageManager.set('project_config', data.projectConfig);
            }
            
            // Import data stores
            const stores = ['checklistItems', 'todos', 'milestones', 'meetings', 'journals'];
            
            for (const store of stores) {
                if (data[store] && Array.isArray(data[store])) {
                    for (const item of data[store]) {
                        await StorageManager.saveToStore(store, item);
                    }
                }
            }
            
            this.hideModal();
            this.showSuccess(`Data imported successfully! ${Object.keys(data).length} data types restored. Please refresh the page.`);
            
            // Refresh page after 3 seconds
            setTimeout(() => {
                location.reload();
            }, 3000);
            
        } catch (error) {
            console.error('Failed to import data:', error);
            this.showError('Failed to import data: ' + error.message);
        }
    }

    /**
     * Clear all storage data
     */
    async clearStorageData() {
        const confirmMessage = 'Are you sure you want to clear ALL data?\n\nThis will permanently delete:\n- All checklist items\n- All todos\n- All milestones\n- All meetings\n- Project configuration\n- Application settings\n\nThis action cannot be undone!';
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const doubleConfirm = 'Type "DELETE" to confirm permanent data deletion:';
        const userInput = prompt(doubleConfirm);
        
        if (userInput !== 'DELETE') {
            this.showError('Data deletion cancelled - incorrect confirmation');
            return;
        }
        
        await this.clearAllStorageData(true);
    }

    /**
     * Clear all storage data (internal method)
     */
    async clearAllStorageData(showFeedback = true) {
        try {
            // Clear all IndexedDB stores
            const stores = ['checklistItems', 'todos', 'milestones', 'meetings', 'journals'];
            
            for (const store of stores) {
                await StorageManager.clearStore(store);
            }
            
            // Clear localStorage
            const localStorageKeys = [
                'app_settings', 'project_config', 'last_reset_date', 
                'last_reset_timestamp', 'reset_history', 'last_backup_date'
            ];
            
            for (const key of localStorageKeys) {
                await StorageManager.remove(key);
            }
            
            if (showFeedback) {
                this.hideModal();
                this.showSuccess('All data cleared successfully! Page will refresh in 3 seconds.');
                
                // Refresh page after 3 seconds
                setTimeout(() => {
                    location.reload();
                }, 3000);
            }
            
        } catch (error) {
            console.error('Failed to clear data:', error);
            if (showFeedback) {
                this.showError('Failed to clear data: ' + error.message);
            }
            throw error;
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