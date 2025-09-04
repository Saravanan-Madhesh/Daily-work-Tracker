/**
 * Checklist Manager - Handles daily checklist functionality
 * Manages checklist items, templates, and daily reset integration
 */

class ChecklistManager {
    static checklistItems = [];
    static templates = [];
    static isInitialized = false;
    static currentDate = null;

    /**
     * Initialize the checklist system
     */
    static async init() {
        try {
            console.log('Initializing ChecklistManager...');
            
            // Load checklist data
            await this.loadChecklistData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update current date
            this.currentDate = StorageManager.getCurrentDateString();
            
            // Initial render
            this.renderChecklistItems();
            
            this.isInitialized = true;
            console.log('ChecklistManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize ChecklistManager:', error);
            throw error;
        }
    }

    /**
     * Load checklist data from storage
     */
    static async loadChecklistData() {
        try {
            // Load all checklist items
            const allItems = await StorageManager.getAllFromStore('checklistItems') || [];
            
            // Separate templates from daily items
            this.templates = allItems.filter(item => item.isTemplate);
            this.checklistItems = allItems.filter(item => !item.isTemplate);
            
            // Sort templates by order
            this.templates.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // Filter today's items
            const today = StorageManager.getCurrentDateString();
            this.checklistItems = this.checklistItems.filter(item => item.date === today);
            
            console.log(`Loaded ${this.templates.length} templates and ${this.checklistItems.length} checklist items`);
            
        } catch (error) {
            console.error('Failed to load checklist data:', error);
            this.templates = [];
            this.checklistItems = [];
        }
    }

    /**
     * Set up event listeners
     */
    static setupEventListeners() {
        // Add checklist item button
        const addBtn = document.getElementById('addChecklistItem');
        if (addBtn) {
            addBtn.addEventListener('click', this.showAddItemModal.bind(this));
        }

        // Analytics button
        const analyticsBtn = document.getElementById('checklistAnalytics');
        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', this.showAnalytics.bind(this));
        }

        // Listen for daily reset events
        document.addEventListener('dailyResetComplete', this.handleDailyReset.bind(this));
    }

    /**
     * Render checklist items
     */
    static renderChecklistItems() {
        const container = document.getElementById('checklistItems');
        if (!container) return;

        if (this.checklistItems.length === 0) {
            this.renderEmptyState(container);
            return;
        }

        // Sort items by completion status (incomplete first) then by order
        const sortedItems = [...this.checklistItems].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return (a.order || 0) - (b.order || 0);
        });

        const itemsHTML = sortedItems.map((item, index) => this.createChecklistItemHTML(item, index)).join('');
        container.innerHTML = itemsHTML;

        // Update progress indicator
        this.updateProgressIndicator();
    }

    /**
     * Render empty state
     */
    static renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-title">No checklist items for today</div>
                <div class="empty-state-text">
                    Add your first checklist item to get started with your daily tasks.
                    <br>You can also create templates for recurring daily tasks.
                </div>
                <button class="btn btn-primary" onclick="ChecklistManager.showAddItemModal()">
                    + Add First Item
                </button>
            </div>
        `;
    }

    /**
     * Create HTML for a single checklist item
     */
    static createChecklistItemHTML(item, index) {
        const completedClass = item.completed ? 'completed' : '';
        const completedTime = item.completedAt ? new Date(item.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        const carriedFromText = item.carriedFrom ? ` (carried from ${new Date(item.carriedFrom).toLocaleDateString()})` : '';

        return `
            <div class="checklist-item ${completedClass}" data-item-id="${item.id}">
                <div class="checklist-main">
                    <input type="checkbox" 
                           class="checklist-checkbox" 
                           ${item.completed ? 'checked' : ''}
                           onchange="ChecklistManager.toggleItemCompletion('${item.id}')">
                    
                    <div class="checklist-content">
                        <div class="checklist-text">${this.escapeHtml(item.text)}${carriedFromText}</div>
                        ${completedTime ? `<div class="completion-time">✅ Completed at ${completedTime}</div>` : ''}
                    </div>
                </div>
                
                <div class="checklist-actions">
                    <button class="checklist-edit" onclick="ChecklistManager.showEditItemModal('${item.id}')" title="Edit item">
                        ✏️
                    </button>
                    <button class="checklist-remove" onclick="ChecklistManager.deleteItem('${item.id}')" title="Remove item">
                        ❌
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Toggle item completion status
     */
    static async toggleItemCompletion(itemId) {
        try {
            const item = this.checklistItems.find(item => item.id === itemId);
            if (!item) {
                throw new Error('Checklist item not found');
            }

            // Toggle completion status
            item.completed = !item.completed;
            item.completedAt = item.completed ? new Date().toISOString() : null;
            item.updatedAt = new Date().toISOString();

            // Save to storage
            await StorageManager.saveToStore('checklistItems', item);

            // Update local array
            const index = this.checklistItems.findIndex(i => i.id === itemId);
            if (index !== -1) {
                this.checklistItems[index] = item;
            }

            // Re-render items to update sorting
            this.renderChecklistItems();

            // Show success feedback
            if (item.completed) {
                this.showCompletionFeedback(item.text);
            }

            console.log(`Checklist item ${item.completed ? 'completed' : 'uncompleted'}:`, item.text);

        } catch (error) {
            console.error('Failed to toggle item completion:', error);
            app.showError('Failed to update checklist item');
        }
    }

    /**
     * Show completion feedback
     */
    static showCompletionFeedback(itemText) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'completion-feedback';
        feedback.innerHTML = `✅ "${itemText}" completed!`;
        
        // Add to page
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    /**
     * Show add item modal
     */
    static showAddItemModal() {
        const templateOptions = this.templates.map(template => 
            `<option value="${template.id}">${template.text}</option>`
        ).join('');

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Add Checklist Item</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Quick Add from Template</label>
                    <select class="form-select" id="templateSelect" onchange="ChecklistManager.fillFromTemplate()">
                        <option value="">Choose a template...</option>
                        ${templateOptions}
                    </select>
                </div>
                
                <div class="form-divider">OR</div>
                
                <div class="form-group">
                    <label class="form-label">Custom Item Text *</label>
                    <input type="text" class="form-input" id="itemText" 
                           placeholder="Enter checklist item (e.g., Review daily reports)"
                           maxlength="200">
                    <small class="form-help">Describe the task you want to track</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="saveAsTemplate"> 
                        Save as template for future use
                    </label>
                    <small class="form-help">Templates will appear in your daily checklist automatically</small>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="ChecklistManager.addItem()">Add Item</button>
            </div>
        `;

        app.showModal(modalContent);

        // Focus on text input
        setTimeout(() => {
            const textInput = document.getElementById('itemText');
            if (textInput) textInput.focus();
        }, 100);
    }

    /**
     * Fill form from template
     */
    static fillFromTemplate() {
        const templateSelect = document.getElementById('templateSelect');
        const textInput = document.getElementById('itemText');
        
        if (!templateSelect || !textInput) return;

        const selectedTemplateId = templateSelect.value;
        if (!selectedTemplateId) {
            textInput.value = '';
            return;
        }

        const template = this.templates.find(t => t.id === selectedTemplateId);
        if (template) {
            textInput.value = template.text;
        }
    }

    /**
     * Add new checklist item
     */
    static async addItem() {
        try {
            const textInput = document.getElementById('itemText');
            const saveAsTemplateCheckbox = document.getElementById('saveAsTemplate');
            
            if (!textInput) {
                throw new Error('Text input not found');
            }

            const itemText = textInput.value.trim();
            if (!itemText) {
                throw new Error('Item text is required');
            }

            if (itemText.length < 3) {
                throw new Error('Item text must be at least 3 characters');
            }

            // Check for duplicates
            const isDuplicate = this.checklistItems.some(item => 
                item.text.toLowerCase() === itemText.toLowerCase()
            );

            if (isDuplicate) {
                throw new Error('This item already exists in your checklist');
            }

            const today = StorageManager.getCurrentDateString();

            // Create checklist item
            const itemData = {
                text: itemText,
                date: today,
                completed: false,
                isTemplate: false,
                order: this.checklistItems.length
            };

            const checklistItem = StorageManager.createChecklistModel(itemData);

            // Validate item
            const validation = StorageManager.validateChecklistData(checklistItem);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Save to storage
            await StorageManager.saveToStore('checklistItems', checklistItem);

            // Add to local array
            this.checklistItems.push(checklistItem);

            // Save as template if requested
            if (saveAsTemplateCheckbox && saveAsTemplateCheckbox.checked) {
                await this.saveAsTemplate(itemText);
            }

            // Re-render
            this.renderChecklistItems();

            // Hide modal and show success
            app.hideModal();
            app.showSuccess('Checklist item added successfully!');

            console.log('Checklist item added:', checklistItem);

        } catch (error) {
            console.error('Failed to add checklist item:', error);
            app.showError(error.message);
        }
    }

    /**
     * Save item as template
     */
    static async saveAsTemplate(text) {
        try {
            // Check if template already exists
            const templateExists = this.templates.some(template => 
                template.text.toLowerCase() === text.toLowerCase()
            );

            if (templateExists) {
                console.log('Template already exists, skipping save');
                return;
            }

            const templateData = {
                text: text,
                isTemplate: true,
                order: this.templates.length
            };

            const template = StorageManager.createChecklistModel(templateData);
            await StorageManager.saveToStore('checklistItems', template);

            // Add to local templates
            this.templates.push(template);

            console.log('Template saved:', template);

        } catch (error) {
            console.error('Failed to save template:', error);
            // Don't show error to user as this is secondary functionality
        }
    }

    /**
     * Show edit item modal
     */
    static showEditItemModal(itemId) {
        const item = this.checklistItems.find(item => item.id === itemId);
        if (!item) {
            app.showError('Checklist item not found');
            return;
        }

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">Edit Checklist Item</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Item Text *</label>
                    <input type="text" class="form-input" id="editItemText" 
                           value="${this.escapeHtml(item.text)}"
                           placeholder="Enter checklist item"
                           maxlength="200">
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="editItemCompleted" ${item.completed ? 'checked' : ''}> 
                        Mark as completed
                    </label>
                </div>
                
                ${item.completedAt ? `
                    <div class="completion-info">
                        <small>Previously completed: ${new Date(item.completedAt).toLocaleString()}</small>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="ChecklistManager.deleteItem('${item.id}')">Delete</button>
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="ChecklistManager.updateItem('${item.id}')">Update Item</button>
            </div>
        `;

        app.showModal(modalContent);

        // Focus on text input and select all
        setTimeout(() => {
            const textInput = document.getElementById('editItemText');
            if (textInput) {
                textInput.focus();
                textInput.select();
            }
        }, 100);
    }

    /**
     * Update checklist item
     */
    static async updateItem(itemId) {
        try {
            const textInput = document.getElementById('editItemText');
            const completedCheckbox = document.getElementById('editItemCompleted');
            
            if (!textInput) {
                throw new Error('Text input not found');
            }

            const item = this.checklistItems.find(item => item.id === itemId);
            if (!item) {
                throw new Error('Checklist item not found');
            }

            const newText = textInput.value.trim();
            if (!newText) {
                throw new Error('Item text is required');
            }

            if (newText.length < 3) {
                throw new Error('Item text must be at least 3 characters');
            }

            const wasCompleted = item.completed;
            const isNowCompleted = completedCheckbox ? completedCheckbox.checked : item.completed;

            // Update item
            item.text = newText;
            item.completed = isNowCompleted;
            item.updatedAt = new Date().toISOString();

            // Update completion timestamp
            if (!wasCompleted && isNowCompleted) {
                item.completedAt = new Date().toISOString();
            } else if (wasCompleted && !isNowCompleted) {
                item.completedAt = null;
            }

            // Validate
            const validation = StorageManager.validateChecklistData(item);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Save to storage
            await StorageManager.saveToStore('checklistItems', item);

            // Update local array
            const index = this.checklistItems.findIndex(i => i.id === itemId);
            if (index !== -1) {
                this.checklistItems[index] = item;
            }

            // Re-render
            this.renderChecklistItems();

            // Hide modal and show success
            app.hideModal();
            app.showSuccess('Checklist item updated successfully!');

            console.log('Checklist item updated:', item);

        } catch (error) {
            console.error('Failed to update checklist item:', error);
            app.showError(error.message);
        }
    }

    /**
     * Delete checklist item
     */
    static async deleteItem(itemId) {
        try {
            const item = this.checklistItems.find(item => item.id === itemId);
            if (!item) {
                throw new Error('Checklist item not found');
            }

            // Confirm deletion
            const confirmMessage = `Are you sure you want to delete "${item.text}"?`;
            if (!confirm(confirmMessage)) {
                return;
            }

            // Delete from storage
            await StorageManager.deleteFromStore('checklistItems', item.id);

            // Remove from local array
            const index = this.checklistItems.findIndex(i => i.id === itemId);
            if (index !== -1) {
                this.checklistItems.splice(index, 1);
            }

            // Re-render
            this.renderChecklistItems();

            // Hide modal if open and show success
            app.hideModal();
            app.showSuccess('Checklist item deleted successfully!');

            console.log('Checklist item deleted:', item.text);

        } catch (error) {
            console.error('Failed to delete checklist item:', error);
            app.showError('Failed to delete checklist item');
        }
    }

    /**
     * Update progress indicator
     */
    static updateProgressIndicator() {
        const totalItems = this.checklistItems.length;
        const completedItems = this.checklistItems.filter(item => item.completed).length;
        const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Save checklist state for persistence and history tracking
        this.saveChecklistProgress(completedItems, totalItems);

        // Update section header with progress
        const sectionHeader = document.querySelector('#checklist-section .section-header h2');
        if (sectionHeader) {
            sectionHeader.innerHTML = `Daily Checklist <span class="progress-badge">${completedItems}/${totalItems} (${progressPercent}%)</span>`;
        }

        // Add progress bar if items exist
        const container = document.getElementById('checklistItems');
        if (container && totalItems > 0) {
            const progressBar = this.createProgressBar(progressPercent, completedItems, totalItems);
            
            // Remove existing progress bar
            const existingBar = container.querySelector('.progress-bar-container');
            if (existingBar) {
                existingBar.remove();
            }

            // Add new progress bar at the top
            container.insertAdjacentHTML('afterbegin', progressBar);
        }
    }

    /**
     * Save checklist progress for persistence and history tracking
     */
    static async saveChecklistProgress(completedItems, totalItems) {
        try {
            const today = StorageManager.getCurrentDateString();
            await StorageManager.saveChecklistState(today, completedItems, totalItems);
            
            // Monitor storage quota periodically
            if (Math.random() < 0.1) { // 10% chance to check quota
                const quotaStatus = await StorageManager.monitorStorageQuota();
                if (quotaStatus && quotaStatus.isOverThreshold) {
                    this.showStorageWarning(quotaStatus);
                }
            }
        } catch (error) {
            console.error('Failed to save checklist progress:', error);
        }
    }

    /**
     * Show storage warning when quota is exceeded
     */
    static showStorageWarning(quotaStatus) {
        const warning = document.createElement('div');
        warning.className = 'storage-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <div class="warning-text">
                    <strong>Storage Warning</strong>
                    <p>You're using ${quotaStatus.usagePercent}% of your storage space. Consider exporting old data.</p>
                </div>
                <button class="warning-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        const container = document.getElementById('checklist-section');
        if (container) {
            container.insertBefore(warning, container.firstChild);
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (warning.parentElement) {
                    warning.remove();
                }
            }, 10000);
        }
    }

    /**
     * Create progress bar HTML
     */
    static createProgressBar(percent, completed, total) {
        return `
            <div class="progress-bar-container">
                <div class="progress-header">
                    <span class="progress-text">Progress: ${completed} of ${total} completed</span>
                    <span class="progress-percent">${percent}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * Handle daily reset
     */
    static async handleDailyReset(event) {
        console.log('Daily reset detected, refreshing checklist...');
        
        // Update current date
        this.currentDate = StorageManager.getCurrentDateString();
        
        // Reload checklist data
        await this.loadChecklistData();
        
        // Re-render
        this.renderChecklistItems();
        
        console.log('Checklist refreshed after daily reset');
    }

    /**
     * Refresh checklist display
     */
    static async refresh() {
        if (!this.isInitialized) return;
        
        await this.loadChecklistData();
        this.renderChecklistItems();
    }

    /**
     * Get checklist statistics
     */
    static getStatistics() {
        const totalItems = this.checklistItems.length;
        const completedItems = this.checklistItems.filter(item => item.completed).length;
        const incompleteItems = totalItems - completedItems;
        const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return {
            totalItems,
            completedItems,
            incompleteItems,
            completionRate,
            totalTemplates: this.templates.length
        };
    }

    /**
     * Get comprehensive checklist analytics
     */
    static async getChecklistAnalytics() {
        try {
            const currentStats = this.getStatistics();
            const history = await StorageManager.getChecklistHistory(30);
            const storageStats = await StorageManager.getChecklistStorageStats();

            return {
                current: currentStats,
                history: history,
                storage: storageStats,
                trends: this.calculateTrends(history),
                achievements: this.calculateAchievements(history)
            };
        } catch (error) {
            console.error('Failed to get checklist analytics:', error);
            return null;
        }
    }

    /**
     * Calculate completion trends
     */
    static calculateTrends(history) {
        if (!history || !history.recentData) return null;

        const recentData = history.recentData.slice(-7); // Last 7 days
        const averageRate = recentData.reduce((sum, day) => sum + day.completionRate, 0) / recentData.length;
        
        // Calculate trend direction
        const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
        const secondHalf = recentData.slice(Math.floor(recentData.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.completionRate, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.completionRate, 0) / secondHalf.length;
        
        const trendDirection = secondHalfAvg > firstHalfAvg ? 'improving' : 
                              secondHalfAvg < firstHalfAvg ? 'declining' : 'stable';

        return {
            weeklyAverageCompletionRate: Math.round(averageRate),
            trendDirection,
            trendStrength: Math.abs(secondHalfAvg - firstHalfAvg),
            bestDay: recentData.reduce((best, day) => 
                day.completionRate > best.completionRate ? day : best, recentData[0]),
            worstDay: recentData.reduce((worst, day) => 
                day.completionRate < worst.completionRate ? day : worst, recentData[0])
        };
    }

    /**
     * Calculate achievements and milestones
     */
    static calculateAchievements(history) {
        if (!history) return [];

        const achievements = [];

        // Streak achievements
        if (history.streak >= 7) {
            achievements.push({
                type: 'streak',
                title: '7-Day Streak',
                description: `Current streak: ${history.streak} days`,
                icon: '🔥',
                level: 'gold'
            });
        } else if (history.streak >= 3) {
            achievements.push({
                type: 'streak',
                title: '3-Day Streak',
                description: `Current streak: ${history.streak} days`,
                icon: '⚡',
                level: 'silver'
            });
        }

        // Consistency achievement
        if (history.averageCompletionRate >= 90) {
            achievements.push({
                type: 'consistency',
                title: 'Consistency Master',
                description: `${history.averageCompletionRate}% average completion rate`,
                icon: '🎯',
                level: 'gold'
            });
        } else if (history.averageCompletionRate >= 75) {
            achievements.push({
                type: 'consistency',
                title: 'Steady Progress',
                description: `${history.averageCompletionRate}% average completion rate`,
                icon: '📈',
                level: 'silver'
            });
        }

        // Milestone achievements
        if (history.totalDays >= 30) {
            achievements.push({
                type: 'milestone',
                title: '30-Day Journey',
                description: `${history.totalDays} days of tracking`,
                icon: '🏆',
                level: 'gold'
            });
        } else if (history.totalDays >= 7) {
            achievements.push({
                type: 'milestone',
                title: 'First Week',
                description: `${history.totalDays} days of tracking`,
                icon: '🌟',
                level: 'bronze'
            });
        }

        return achievements;
    }

    /**
     * Show checklist history and analytics
     */
    static async showAnalytics() {
        try {
            const analytics = await this.getChecklistAnalytics();
            if (!analytics) {
                app.showError('Failed to load analytics data');
                return;
            }

            const modalContent = this.createAnalyticsModal(analytics);
            app.showModal(modalContent);
        } catch (error) {
            console.error('Failed to show analytics:', error);
            app.showError('Failed to load analytics');
        }
    }

    /**
     * Create analytics modal content
     */
    static createAnalyticsModal(analytics) {
        const { current, history, storage, trends, achievements } = analytics;

        const achievementsBadges = achievements.map(achievement => `
            <div class="achievement-badge ${achievement.level}">
                <span class="achievement-icon">${achievement.icon}</span>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
        `).join('');

        const recentDays = history?.recentData?.slice(-7).map(day => `
            <div class="history-day ${day.completed ? 'completed' : ''}">
                <div class="day-date">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</div>
                <div class="day-rate">${day.completionRate}%</div>
                <div class="day-items">${day.completedItems}/${day.totalItems}</div>
            </div>
        `).join('') || '<p>No recent data available</p>';

        return `
            <div class="modal-header">
                <h3 class="modal-title">📊 Checklist Analytics</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body analytics-modal">
                <!-- Current Stats -->
                <div class="analytics-section">
                    <h4>Today's Progress</h4>
                    <div class="current-stats">
                        <div class="stat-item">
                            <span class="stat-value">${current.completedItems}</span>
                            <span class="stat-label">Completed</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${current.totalItems}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${current.completionRate}%</span>
                            <span class="stat-label">Rate</span>
                        </div>
                    </div>
                </div>

                <!-- Achievements -->
                ${achievements.length > 0 ? `
                <div class="analytics-section">
                    <h4>🏆 Achievements</h4>
                    <div class="achievements-grid">
                        ${achievementsBadges}
                    </div>
                </div>
                ` : ''}

                <!-- History Overview -->
                ${history ? `
                <div class="analytics-section">
                    <h4>📈 Overview</h4>
                    <div class="overview-stats">
                        <div class="overview-item">
                            <span class="overview-label">Current Streak</span>
                            <span class="overview-value">${history.streak} days</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Longest Streak</span>
                            <span class="overview-value">${history.longestStreak} days</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Average Rate</span>
                            <span class="overview-value">${history.averageCompletionRate}%</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Total Days</span>
                            <span class="overview-value">${history.totalDays}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Recent Activity -->
                <div class="analytics-section">
                    <h4>📅 Recent Activity (Last 7 Days)</h4>
                    <div class="recent-activity">
                        ${recentDays}
                    </div>
                </div>

                <!-- Storage Info -->
                ${storage ? `
                <div class="analytics-section">
                    <h4>💾 Storage Usage</h4>
                    <div class="storage-info">
                        <div class="storage-item">
                            <span class="storage-label">Total Items</span>
                            <span class="storage-value">${storage.total}</span>
                        </div>
                        <div class="storage-item">
                            <span class="storage-label">Templates</span>
                            <span class="storage-value">${storage.templates}</span>
                        </div>
                        <div class="storage-item">
                            <span class="storage-label">This Month</span>
                            <span class="storage-value">${storage.thisMonthItems}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Close</button>
                <button class="btn btn-primary" onclick="ChecklistManager.exportAnalytics()">Export Data</button>
            </div>
        `;
    }

    /**
     * Export analytics data
     */
    static async exportAnalytics() {
        try {
            const analytics = await this.getChecklistAnalytics();
            if (!analytics) return;

            const exportData = {
                exportDate: new Date().toISOString(),
                analytics: analytics,
                rawData: {
                    items: this.checklistItems,
                    templates: this.templates
                }
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `checklist-analytics-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            app.hideModal();
            app.showSuccess('Analytics data exported successfully!');
        } catch (error) {
            console.error('Failed to export analytics:', error);
            app.showError('Failed to export analytics data');
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clean up resources
     */
    static cleanup() {
        this.checklistItems = [];
        this.templates = [];
        this.isInitialized = false;
        this.currentDate = null;
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.ChecklistManager = ChecklistManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChecklistManager;
}