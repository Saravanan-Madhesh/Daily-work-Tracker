/**
 * Daily Reset Manager - Handles daily reset functionality for checklists
 * Manages automatic reset at midnight and tracks daily progress
 */

class DailyResetManager {
    static lastResetDate = null;
    static resetTime = '00:00'; // Default reset time
    static isInitialized = false;
    static resetInProgress = false;

    /**
     * Initialize the daily reset system
     */
    static async init() {
        try {
            console.log('Initializing DailyResetManager...');
            
            // Load last reset date and settings
            await this.loadSettings();
            
            // Set up timezone detection and handling
            this.setupTimezoneHandling();
            
            // Set up automatic reset timer
            this.setupResetTimer();
            
            // Check if reset is needed on startup
            await this.checkAndReset();
            
            // Set up browser session handlers
            this.setupSessionHandlers();
            
            this.isInitialized = true;
            console.log('DailyResetManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize DailyResetManager:', error);
            throw error;
        }
    }

    /**
     * Set up timezone detection and handling
     */
    static setupTimezoneHandling() {
        try {
            // Detect user's timezone
            this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Check for timezone changes (traveling, DST, etc.)
            const savedTimezone = localStorage.getItem('app_timezone');
            if (savedTimezone && savedTimezone !== this.userTimezone) {
                console.log(`Timezone changed from ${savedTimezone} to ${this.userTimezone}`);
                // Force a reset check due to timezone change
                setTimeout(() => this.checkAndReset(), 1000);
            }
            
            localStorage.setItem('app_timezone', this.userTimezone);
            console.log(`Timezone detected: ${this.userTimezone}`);
            
        } catch (error) {
            console.error('Error setting up timezone handling:', error);
            this.userTimezone = 'UTC'; // Fallback
        }
    }

    /**
     * Set up automatic reset timer
     */
    static setupResetTimer() {
        // Clear existing timer if any
        if (this.resetTimer) {
            clearInterval(this.resetTimer);
        }
        
        // Check every minute for reset time
        this.resetTimer = setInterval(async () => {
            if (!this.resetInProgress) {
                await this.checkAndReset();
            }
        }, 60000); // 1 minute intervals
        
        // Also set up a more precise timer for the exact reset time
        const nextReset = this.getNextResetTime();
        const now = new Date();
        const timeUntilReset = nextReset.getTime() - now.getTime();
        
        if (timeUntilReset > 0 && timeUntilReset < 24 * 60 * 60 * 1000) { // Within 24 hours
            setTimeout(async () => {
                await this.checkAndReset();
            }, timeUntilReset);
            
            console.log(`Precise reset timer set for ${nextReset.toLocaleString()}`);
        }
    }

    /**
     * Set up browser session handlers
     */
    static setupSessionHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.isInitialized) {
                console.log('Page became visible, checking for daily reset...');
                await this.checkAndReset();
            }
        });

        // Handle window focus
        window.addEventListener('focus', async () => {
            if (this.isInitialized) {
                console.log('Window focused, checking for daily reset...');
                await this.checkAndReset();
            }
        });

        // Handle before page unload
        window.addEventListener('beforeunload', () => {
            // Save current state before closing
            this.saveSessionState();
        });
    }

    /**
     * Save session state before page closes
     */
    static saveSessionState() {
        try {
            const sessionState = {
                lastActiveTime: Date.now(),
                currentDate: this.getCurrentDateString(),
                resetInProgress: this.resetInProgress,
                userTimezone: this.userTimezone
            };
            
            localStorage.setItem('daily_reset_session', JSON.stringify(sessionState));
        } catch (error) {
            console.error('Error saving session state:', error);
        }
    }

    /**
     * Check session state on startup
     */
    static checkSessionState() {
        try {
            const sessionData = localStorage.getItem('daily_reset_session');
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);
            const now = Date.now();
            const timeSinceLastActive = now - session.lastActiveTime;
            
            // If more than 2 hours since last active, consider it a new session
            const isNewSession = timeSinceLastActive > 2 * 60 * 60 * 1000;
            
            return {
                ...session,
                isNewSession,
                timeSinceLastActive
            };
            
        } catch (error) {
            console.error('Error checking session state:', error);
            return null;
        }
    }

    /**
     * Load settings from storage
     */
    static async loadSettings() {
        try {
            // Load last reset date
            this.lastResetDate = await StorageManager.get('last_reset_date');
            
            // Load reset time from settings
            const settings = await StorageManager.get('app_settings') || {};
            this.resetTime = settings.resetTime || '00:00';
            
            console.log(`Daily reset settings loaded. Last reset: ${this.lastResetDate}, Reset time: ${this.resetTime}`);
            
        } catch (error) {
            console.error('Failed to load daily reset settings:', error);
        }
    }

    /**
     * Check if daily reset is needed and perform it
     */
    static async checkAndReset() {
        if (this.resetInProgress) {
            console.log('Reset already in progress, skipping...');
            return;
        }

        try {
            const today = this.getCurrentDateString();
            const now = new Date();
            const resetDateTime = this.getResetDateTime(today);
            
            // Determine if reset is needed
            const needsReset = this.shouldPerformReset(today, now, resetDateTime);
            
            if (needsReset) {
                console.log('Daily reset needed, performing reset...');
                await this.performDailyReset();
            } else {
                console.log('No daily reset needed');
            }
            
        } catch (error) {
            console.error('Error during daily reset check:', error);
        }
    }

    /**
     * Determine if daily reset should be performed
     */
    static shouldPerformReset(today, now, resetDateTime) {
        // Check session state for additional context
        const sessionState = this.checkSessionState();
        
        // If no last reset date, perform reset
        if (!this.lastResetDate) {
            console.log('No previous reset date found, performing initial reset');
            return true;
        }

        // If returning from a long session break and date changed
        if (sessionState && sessionState.isNewSession && sessionState.currentDate !== today) {
            console.log('New session detected with date change, performing reset');
            return true;
        }

        // If last reset was on a different day
        if (this.lastResetDate !== today) {
            // Check if we've passed the reset time today
            if (now >= resetDateTime) {
                console.log(`Last reset was ${this.lastResetDate}, today is ${today}, reset time passed`);
                return true;
            }
            
            // Special case: If it's early morning but past reset time, and we missed yesterday's reset
            const yesterday = this.getYesterdayString();
            const yesterdayResetTime = this.getResetDateTime(yesterday);
            if (this.lastResetDate < yesterday && now >= resetDateTime) {
                console.log('Missed reset(s) detected, performing catch-up reset');
                return true;
            }
        }

        // If same day but reset time just passed (for custom reset times)
        if (this.lastResetDate === today) {
            const lastResetTimestamp = await StorageManager.get('last_reset_timestamp');
            if (lastResetTimestamp) {
                const lastResetDateTime = new Date(lastResetTimestamp);
                if (now >= resetDateTime && lastResetDateTime < resetDateTime) {
                    console.log('Reset time passed since last reset today');
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Enhanced daily reset with better checklist integration
     */
    static async performDailyReset() {
        if (this.resetInProgress) return;
        
        this.resetInProgress = true;
        
        try {
            const today = this.getCurrentDateString();
            const now = new Date();
            
            console.log(`Performing enhanced daily reset for ${today}`);
            
            // Show reset progress indicator
            this.showResetProgress('Starting daily reset...');
            
            // 1. Archive completed items from previous day
            this.showResetProgress('Archiving completed items...');
            await this.archivePreviousDay();
            
            // 2. Reset daily checklist with enhanced template handling
            this.showResetProgress('Resetting daily checklist...');
            await this.resetDailyChecklistEnhanced();
            
            // 3. Handle carryforward todos with smart detection
            this.showResetProgress('Handling todo carryforward...');
            await this.handleTodoCarryforwardEnhanced();
            
            // 4. Reset meeting completion status
            this.showResetProgress('Resetting meetings...');
            await this.resetMeetingStatus();
            
            // 5. Clean up old data
            this.showResetProgress('Cleaning up old data...');
            await this.performDataCleanup();
            
            // 6. Update reset tracking
            this.showResetProgress('Updating tracking data...');
            await this.updateResetTracker(today, now);
            
            // 7. Refresh checklist manager if available
            if (window.ChecklistManager) {
                await window.ChecklistManager.resetForNewDay();
            }
            
            // 8. Notify components
            this.showResetProgress('Notifying components...');
            this.notifyResetComplete();
            
            console.log('Enhanced daily reset completed successfully');
            
        } catch (error) {
            console.error('Error during enhanced daily reset:', error);
            this.showResetError('Daily reset failed: ' + error.message);
        } finally {
            this.resetInProgress = false;
            this.hideResetProgress();
        }
    }

    /**
     * Enhanced daily checklist reset with better template handling
     */
    static async resetDailyChecklistEnhanced() {
        try {
            const today = this.getCurrentDateString();
            
            // Get all template items (both global templates and custom recurring items)
            const templates = await StorageManager.getAllFromStore('checklistItems') || [];
            const templateItems = templates.filter(item => item.isTemplate);
            const customItems = await StorageManager.get('checklist-custom-items') || [];
            const recurringCustomItems = customItems.filter(item => item.recurring);
            
            // Delete old non-template checklist items for current date
            const oldItems = await StorageManager.getAllFromStore('checklistItems') || [];
            const oldDailyItems = oldItems.filter(item => !item.isTemplate && item.date === today);
            
            for (const item of oldDailyItems) {
                await StorageManager.deleteFromStore('checklistItems', item.id);
            }
            
            // Create new checklist items from templates
            const newItems = [];
            
            // From template items
            for (const template of templateItems) {
                const newItem = StorageManager.createChecklistModel({
                    text: template.text,
                    category: template.category || 'general',
                    completed: false,
                    date: today,
                    templateId: template.id,
                    isTemplate: false,
                    order: template.order || 0
                });
                newItems.push(newItem);
            }
            
            // From custom recurring items
            for (const customItem of recurringCustomItems) {
                const newItem = StorageManager.createChecklistModel({
                    text: customItem.text,
                    category: customItem.category || 'general',
                    completed: false,
                    date: today,
                    isCustom: true,
                    recurring: true,
                    isTemplate: false
                });
                newItems.push(newItem);
            }
            
            // Save new items
            for (const item of newItems) {
                await StorageManager.saveToStore('checklistItems', item);
            }
            
            console.log(`Reset checklist with ${newItems.length} items for ${today}`);
            
        } catch (error) {
            console.error('Error in enhanced checklist reset:', error);
            throw error;
        }
    }

    /**
     * Enhanced todo carryforward with smart detection
     */
    static async handleTodoCarryforwardEnhanced() {
        try {
            const today = this.getCurrentDateString();
            const cutoffDate = this.getDaysAgo(7); // Don't carry forward items older than 7 days
            
            // Get all todos
            const allTodos = await StorageManager.getAllFromStore('todos') || [];
            
            // Find incomplete todos that should be carried forward
            const todosToCaryForward = allTodos.filter(todo => 
                !todo.completed && 
                todo.date < today &&
                todo.date >= cutoffDate &&
                todo.carryForward !== false // Allow explicit opt-out
            );
            
            // Carry forward todos
            let carriedCount = 0;
            for (const todo of todosToCaryForward) {
                // Don't carry forward if already carried today
                if (todo.date === today) continue;
                
                todo.date = today;
                todo.carriedFrom = todo.carriedFrom || todo.date;
                todo.carryCount = (todo.carryCount || 0) + 1;
                todo.updatedAt = new Date().toISOString();
                
                // Mark as high priority if carried multiple times
                if (todo.carryCount >= 3 && todo.priority !== 'high') {
                    todo.priority = 'high';
                    todo.autoPromoted = true;
                }
                
                await StorageManager.saveToStore('todos', todo);
                carriedCount++;
            }
            
            console.log(`Carried forward ${carriedCount} todos to ${today}`);
            
        } catch (error) {
            console.error('Error in enhanced todo carryforward:', error);
            throw error;
        }
    }

    /**
     * Perform data cleanup for old items
     */
    static async performDataCleanup() {
        try {
            const cutoffDate = this.getDaysAgo(30); // Keep 30 days of data
            
            // Clean up old checklist items (non-templates)
            const allChecklistItems = await StorageManager.getAllFromStore('checklistItems') || [];
            const oldChecklistItems = allChecklistItems.filter(item => 
                !item.isTemplate && item.date < cutoffDate
            );
            
            for (const item of oldChecklistItems) {
                await StorageManager.deleteFromStore('checklistItems', item.id);
            }
            
            // Clean up very old todos (completed ones older than 30 days)
            const allTodos = await StorageManager.getAllFromStore('todos') || [];
            const oldCompletedTodos = allTodos.filter(todo => 
                todo.completed && 
                todo.date < cutoffDate
            );
            
            for (const todo of oldCompletedTodos) {
                await StorageManager.deleteFromStore('todos', todo.id);
            }
            
            console.log(`Cleaned up ${oldChecklistItems.length} old checklist items and ${oldCompletedTodos.length} old todos`);
            
        } catch (error) {
            console.error('Error during data cleanup:', error);
        }
    }

    /**
     * Get reset date/time for a given date
     */
    static getResetDateTime(dateString) {
        const [hours, minutes] = this.resetTime.split(':').map(Number);
        const resetDate = new Date(dateString + 'T00:00:00');
        resetDate.setHours(hours, minutes, 0, 0);
        return resetDate;
    }

    /**
     * Get the last reset date/time
     */
    static getLastResetDateTime() {
        const lastResetTimestamp = StorageManager.get('last_reset_timestamp');
        return lastResetTimestamp ? new Date(lastResetTimestamp) : null;
    }

    /**
     * Perform the daily reset
     */
    static async performDailyReset() {
        if (this.resetInProgress) return;
        
        this.resetInProgress = true;
        
        try {
            const today = this.getCurrentDateString();
            const now = new Date();
            
            console.log(`Performing daily reset for ${today}`);
            
            // 1. Archive completed items from previous day
            await this.archivePreviousDay();
            
            // 2. Reset daily checklist
            await this.resetDailyChecklist();
            
            // 3. Handle carryforward todos
            await this.handleTodoCarryforward();
            
            // 4. Reset meeting completion status (keep meetings but mark as not completed)
            await this.resetMeetingStatus();
            
            // 5. Update last reset date and timestamp
            await this.updateResetTracker(today, now);
            
            // 6. Notify other components about the reset
            this.notifyResetComplete();
            
            console.log('Daily reset completed successfully');
            
        } catch (error) {
            console.error('Error during daily reset:', error);
        } finally {
            this.resetInProgress = false;
        }
    }

    /**
     * Archive data from previous day
     */
    static async archivePreviousDay() {
        try {
            const yesterday = this.getYesterdayString();
            
            // Archive completed checklist items
            const yesterdayChecklist = await StorageManager.getAllFromStore('checklistItems', 'date', yesterday);
            const completedItems = yesterdayChecklist.filter(item => item.completed && !item.isTemplate);
            
            if (completedItems.length > 0) {
                // Save to journal history
                const archiveData = {
                    date: yesterday,
                    type: 'daily_archive',
                    checklist: completedItems,
                    createdAt: new Date().toISOString()
                };
                
                await StorageManager.saveToStore('journals', archiveData);
                console.log(`Archived ${completedItems.length} completed checklist items from ${yesterday}`);
            }
            
        } catch (error) {
            console.error('Error archiving previous day data:', error);
        }
    }

    /**
     * Reset daily checklist
     */
    static async resetDailyChecklist() {
        try {
            const today = this.getCurrentDateString();
            
            // Get template checklist items
            const templates = await StorageManager.getAllFromStore('checklistItems', 'isTemplate', true);
            
            // Create new checklist items for today based on templates
            const todayItems = templates.map(template => ({
                text: template.text,
                completed: false,
                date: today,
                order: template.order,
                isTemplate: false,
                createdAt: new Date().toISOString()
            }));
            
            // Delete old checklist items (non-templates)
            const oldItems = await StorageManager.getAllFromStore('checklistItems', 'isTemplate', false);
            for (const item of oldItems) {
                await StorageManager.deleteFromStore('checklistItems', item.id);
            }
            
            // Save new checklist items
            for (const item of todayItems) {
                await StorageManager.saveToStore('checklistItems', item);
            }
            
            console.log(`Reset daily checklist with ${todayItems.length} items`);
            
        } catch (error) {
            console.error('Error resetting daily checklist:', error);
        }
    }

    /**
     * Handle todo carryforward
     */
    static async handleTodoCarryforward() {
        try {
            const today = this.getCurrentDateString();
            const yesterday = this.getYesterdayString();
            
            // Get incomplete todos from previous days
            const allTodos = await StorageManager.getAllFromStore('todos');
            const incompleteTodos = allTodos.filter(todo => 
                !todo.completed && 
                todo.date < today &&
                todo.carryForward !== false // Allow opt-out of carry forward
            );
            
            // Update dates of carried forward todos
            for (const todo of incompleteTodos) {
                todo.date = today;
                todo.carriedFrom = todo.carriedFrom || todo.date;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
            }
            
            if (incompleteTodos.length > 0) {
                console.log(`Carried forward ${incompleteTodos.length} incomplete todos`);
            }
            
        } catch (error) {
            console.error('Error handling todo carryforward:', error);
        }
    }

    /**
     * Reset meeting completion status
     */
    static async resetMeetingStatus() {
        try {
            const today = this.getCurrentDateString();
            
            // Get today's meetings and reset completion status
            const todayMeetings = await StorageManager.getAllFromStore('meetings', 'date', today);
            
            for (const meeting of todayMeetings) {
                if (meeting.completed) {
                    meeting.completed = false;
                    meeting.completedAt = null;
                    meeting.updatedAt = new Date().toISOString();
                    await StorageManager.saveToStore('meetings', meeting);
                }
            }
            
            if (todayMeetings.length > 0) {
                console.log(`Reset completion status for ${todayMeetings.length} meetings`);
            }
            
        } catch (error) {
            console.error('Error resetting meeting status:', error);
        }
    }

    /**
     * Update reset tracker
     */
    static async updateResetTracker(today, timestamp) {
        try {
            this.lastResetDate = today;
            await StorageManager.set('last_reset_date', today);
            await StorageManager.set('last_reset_timestamp', timestamp.toISOString());
            
            // Store reset history
            const resetHistory = await StorageManager.get('reset_history') || [];
            resetHistory.push({
                date: today,
                timestamp: timestamp.toISOString(),
                type: 'automatic'
            });
            
            // Keep only last 30 days of reset history
            const recentHistory = resetHistory.slice(-30);
            await StorageManager.set('reset_history', recentHistory);
            
        } catch (error) {
            console.error('Error updating reset tracker:', error);
        }
    }

    /**
     * Notify other components about reset completion
     */
    static notifyResetComplete() {
        // Dispatch custom event
        const resetEvent = new CustomEvent('dailyResetComplete', {
            detail: {
                date: this.getCurrentDateString(),
                timestamp: new Date().toISOString()
            }
        });
        
        document.dispatchEvent(resetEvent);
        
        // Update UI indicators if needed
        this.updateResetIndicators();
    }

    /**
     * Update reset indicators in UI
     */
    static updateResetIndicators() {
        // Add reset indicator to checklist section
        const checklistSection = document.getElementById('checklist-section');
        if (checklistSection) {
            // Remove existing indicators
            const existingIndicator = checklistSection.querySelector('.daily-reset-info');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Add new reset indicator
            const indicator = document.createElement('div');
            indicator.className = 'daily-reset-info success';
            indicator.innerHTML = `
                <span class="reset-icon">✅</span>
                <span class="reset-message">Daily checklist reset for ${this.formatDate(this.getCurrentDateString())}</span>
                <button class="reset-dismiss" onclick="this.parentElement.remove()">×</button>
            `;
            
            const container = checklistSection.querySelector('.checklist-container');
            if (container) {
                container.insertBefore(indicator, container.firstChild);
                
                // Auto-hide after 8 seconds
                setTimeout(() => {
                    if (indicator.parentElement) {
                        indicator.remove();
                    }
                }, 8000);
            }
        }
    }

    /**
     * Show reset progress indicator
     */
    static showResetProgress(message) {
        // Create or update progress indicator
        let progressIndicator = document.getElementById('resetProgressIndicator');
        
        if (!progressIndicator) {
            progressIndicator = document.createElement('div');
            progressIndicator.id = 'resetProgressIndicator';
            progressIndicator.className = 'reset-progress-indicator';
            document.body.appendChild(progressIndicator);
        }
        
        progressIndicator.innerHTML = `
            <div class="reset-progress-content">
                <div class="reset-spinner"></div>
                <span class="reset-progress-message">${message}</span>
            </div>
        `;
        
        progressIndicator.style.display = 'flex';
    }

    /**
     * Hide reset progress indicator
     */
    static hideResetProgress() {
        const progressIndicator = document.getElementById('resetProgressIndicator');
        if (progressIndicator) {
            progressIndicator.style.display = 'none';
            setTimeout(() => {
                if (progressIndicator.parentElement) {
                    progressIndicator.remove();
                }
            }, 500);
        }
    }

    /**
     * Show reset error
     */
    static showResetError(message) {
        const errorIndicator = document.createElement('div');
        errorIndicator.className = 'daily-reset-info error';
        errorIndicator.innerHTML = `
            <span class="reset-icon">❌</span>
            <span class="reset-message">${message}</span>
            <button class="reset-dismiss" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Try to add to checklist section, fallback to body
        const checklistSection = document.getElementById('checklist-section');
        const container = checklistSection?.querySelector('.checklist-container') || document.body;
        
        if (container === document.body) {
            errorIndicator.style.position = 'fixed';
            errorIndicator.style.top = '20px';
            errorIndicator.style.right = '20px';
            errorIndicator.style.zIndex = '1000';
        }
        
        container.appendChild(errorIndicator);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorIndicator.parentElement) {
                errorIndicator.remove();
            }
        }, 10000);
    }

    /**
     * Manual reset trigger (for testing or user request)
     */
    static async performManualReset() {
        try {
            console.log('Performing manual daily reset...');
            
            await this.performDailyReset();
            
            // Update reset history to mark as manual
            const resetHistory = await StorageManager.get('reset_history') || [];
            if (resetHistory.length > 0) {
                resetHistory[resetHistory.length - 1].type = 'manual';
                await StorageManager.set('reset_history', resetHistory);
            }
            
            // Show success message
            if (window.app) {
                app.showSuccess('Daily reset completed successfully!');
            }
            
        } catch (error) {
            console.error('Manual reset failed:', error);
            if (window.app) {
                app.showError('Failed to perform daily reset: ' + error.message);
            }
        }
    }

    /**
     * Get reset statistics
     */
    static async getResetStats() {
        try {
            const resetHistory = await StorageManager.get('reset_history') || [];
            const lastReset = this.lastResetDate;
            const nextReset = this.getNextResetTime();
            
            return {
                lastResetDate: lastReset,
                nextResetTime: nextReset,
                totalResets: resetHistory.length,
                recentResets: resetHistory.slice(-7), // Last 7 resets
                resetTime: this.resetTime,
                isResetDue: this.shouldPerformReset(
                    this.getCurrentDateString(),
                    new Date(),
                    this.getResetDateTime(this.getCurrentDateString())
                )
            };
            
        } catch (error) {
            console.error('Error getting reset stats:', error);
            return null;
        }
    }

    /**
     * Get next reset time
     */
    static getNextResetTime() {
        const today = this.getCurrentDateString();
        const resetDateTime = this.getResetDateTime(today);
        const now = new Date();
        
        if (now < resetDateTime) {
            return resetDateTime; // Today's reset time hasn't passed yet
        } else {
            // Next reset is tomorrow
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return this.getResetDateTime(tomorrow.toISOString().split('T')[0]);
        }
    }

    /**
     * Update reset time setting
     */
    static async updateResetTime(newResetTime) {
        try {
            // Validate time format
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newResetTime)) {
                throw new Error('Invalid time format. Use HH:MM format');
            }
            
            this.resetTime = newResetTime;
            
            // Save to settings
            const settings = await StorageManager.get('app_settings') || {};
            settings.resetTime = newResetTime;
            await StorageManager.set('app_settings', settings);
            
            console.log(`Reset time updated to ${newResetTime}`);
            
        } catch (error) {
            console.error('Error updating reset time:', error);
            throw error;
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get current date string (YYYY-MM-DD)
     */
    static getCurrentDateString() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Get yesterday's date string
     */
    static getYesterdayString() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    /**
     * Get date string for N days ago
     */
    static getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    /**
     * Get date string for N days in the future
     */
    static getDaysFromNow(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    /**
     * Check if a date is a weekend
     */
    static isWeekend(dateString) {
        const date = new Date(dateString);
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    /**
     * Get business days between two dates
     */
    static getBusinessDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let businessDays = 0;
        
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                businessDays++;
            }
            current.setDate(current.getDate() + 1);
        }
        
        return businessDays;
    }

    /**
     * Get localized date string considering user's timezone
     */
    static getLocalizedDateString(date = new Date()) {
        if (this.userTimezone) {
            try {
                return new Intl.DateTimeFormat('en-CA', { // ISO format (YYYY-MM-DD)
                    timeZone: this.userTimezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(date);
            } catch (error) {
                console.error('Error getting localized date:', error);
            }
        }
        
        // Fallback to simple ISO date
        return date.toISOString().split('T')[0];
    }

    /**
     * Convert reset time to local timezone
     */
    static getResetTimeInTimezone(resetTime, timezone = null) {
        try {
            const tz = timezone || this.userTimezone || 'UTC';
            const [hours, minutes] = resetTime.split(':').map(Number);
            
            // Create date with reset time in local timezone
            const today = new Date();
            const resetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
            
            return resetDate;
        } catch (error) {
            console.error('Error converting reset time to timezone:', error);
            return null;
        }
    }

    /**
     * Format date for display
     */
    static formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    /**
     * Check if date is today
     */
    static isToday(dateString) {
        return dateString === this.getCurrentDateString();
    }

    /**
     * Get time until next reset
     */
    static getTimeUntilNextReset() {
        const nextReset = this.getNextResetTime();
        const now = new Date();
        const timeDiff = nextReset.getTime() - now.getTime();
        
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            hours,
            minutes,
            totalMinutes: Math.floor(timeDiff / (1000 * 60)),
            nextResetTime: nextReset
        };
    }

    /**
     * Clean up resources
     */
    static cleanup() {
        this.isInitialized = false;
        this.resetInProgress = false;
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.DailyResetManager = DailyResetManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DailyResetManager;
}