/**
 * File Export System - Daily Work Tracker
 * 
 * Handles journal export functionality using File System Access API
 * with fallback support for browsers that don't support it.
 * 
 * Features:
 * - File System Access API integration
 * - Fallback download method for unsupported browsers
 * - Multiple export formats (TXT, JSON, CSV, HTML)
 * - Comprehensive data collection and formatting
 * - Export progress tracking and error handling
 */

class FileExportManager {
    constructor() {
        this.supportsFSA = 'showSaveFilePicker' in window;
        this.exportFormats = {
            txt: { name: 'Plain Text', extension: '.txt', mimeType: 'text/plain' },
            json: { name: 'JSON Data', extension: '.json', mimeType: 'application/json' },
            csv: { name: 'CSV Data', extension: '.csv', mimeType: 'text/csv' },
            html: { name: 'HTML Report', extension: '.html', mimeType: 'text/html' }
        };
        this.init();
    }

    /**
     * Initialize the file export system
     */
    init() {
        this.setupEventListeners();
        this.loadExportSettings();
    }

    /**
     * Set up event listeners for export functionality
     */
    setupEventListeners() {
        const createJournalBtn = document.getElementById('createJournal');
        if (createJournalBtn) {
            createJournalBtn.addEventListener('click', () => this.showExportModal());
        }

        const exportHistoryBtn = document.getElementById('exportHistory');
        if (exportHistoryBtn) {
            exportHistoryBtn.addEventListener('click', () => this.showExportHistoryModal());
        }
    }

    /**
     * Load export settings from storage
     */
    async loadExportSettings() {
        try {
            const settings = await StorageManager.getData('exportSettings');
            this.exportSettings = settings || this.getDefaultExportSettings();
        } catch (error) {
            console.error('Failed to load export settings:', error);
            this.exportSettings = this.getDefaultExportSettings();
        }
    }

    /**
     * Get default export settings
     */
    getDefaultExportSettings() {
        return {
            defaultFormat: 'txt',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    /**
     * Show the simplified journal export modal for today only
     */
    showExportModal() {
        const modal = this.createExportModal();
        document.body.appendChild(modal);
        
        // Focus on the modal for accessibility
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, button');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Create the simplified export modal for today's journal only
     */
    createExportModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'exportModal';

        modalOverlay.innerHTML = `
            <div class="modal export-modal">
                <div class="modal-header">
                    <h2>📊 Create Today's Journal</h2>
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-settings">
                        <!-- Today's Journal Info -->
                        <div class="setting-group">
                            <div class="journal-info">
                                <div class="info-card">
                                    <h3>📅 Today's Journal Export</h3>
                                    <p>Creating journal for: <strong>${new Date().toDateString()}</strong></p>
                                    <div class="journal-contents">
                                        <div class="content-item">
                                            <span class="content-icon">✅</span>
                                            <span>Today's Checklist Status</span>
                                        </div>
                                        <div class="content-item">
                                            <span class="content-icon">📝</span>
                                            <span>Completed Todos</span>
                                        </div>
                                        <div class="content-item">
                                            <span class="content-icon">🤝</span>
                                            <span>Completed Meetings with Notes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Export Format Selection -->
                        <div class="setting-group">
                            <label for="exportFormat">Export Format:</label>
                            <select id="exportFormat" class="form-control">
                                <option value="txt" selected>📄 Plain Text (.txt)</option>
                                <option value="html">🌐 HTML Report (.html)</option>
                            </select>
                            <small class="help-text">
                                ${this.supportsFSA ? 'File System Access API supported' : 'Using fallback download method'}
                            </small>
                        </div>

                        <!-- Export Preview -->
                        <div class="setting-group">
                            <div class="export-preview">
                                <div class="preview-header">
                                    <strong>Today's Journal Preview:</strong>
                                    <span id="previewInfo" class="preview-info">Loading...</span>
                                </div>
                                <div id="previewContent" class="preview-content">
                                    Loading preview...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="export-progress" id="exportProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <div class="progress-text" id="progressText">Preparing export...</div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelExport">Cancel</button>
                        <button class="btn btn-primary" id="startExport">
                            💾 Create Journal
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupModalEvents(modalOverlay);
        this.updatePreview(modalOverlay);
        
        return modalOverlay;
    }

    /**
     * Set up modal event listeners
     */
    setupModalEvents(modal) {
        // Close modal events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancelExport');
        
        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Format change events
        const formatSelect = modal.querySelector('#exportFormat');
        if (formatSelect) {
            formatSelect.addEventListener('change', () => {
                this.updatePreview(modal);
            });
        }

        // Export button
        const exportBtn = modal.querySelector('#startExport');
        exportBtn.addEventListener('click', () => {
            this.startTodayExport(modal);
        });
    }

    /**
     * Get the selected export format from modal
     */
    getSelectedFormat(modal) {
        const formatSelect = modal.querySelector('#exportFormat');
        return formatSelect ? formatSelect.value : 'txt';
    }

    /**
     * Update export preview for today's journal only
     */
    async updatePreview(modal) {
        try {
            const previewInfo = modal.querySelector('#previewInfo');
            const previewContent = modal.querySelector('#previewContent');
            
            previewInfo.textContent = 'Loading...';
            previewContent.textContent = 'Loading preview...';

            const data = await this.collectTodayData();
            
            // Calculate today's export info
            const totalItems = this.countTodayItems(data);
            const estimatedSize = this.estimateExportSize(data, this.getSelectedFormat(modal));
            
            previewInfo.innerHTML = `
                <span class="preview-stat">✅ ${data.checklist ? data.checklist.length : 0} checklist items</span>
                <span class="preview-stat">📝 ${data.todos ? data.todos.length : 0} completed todos</span>
                <span class="preview-stat">🤝 ${data.meetings ? data.meetings.length : 0} completed meetings</span>
                <span class="preview-stat">📦 ~${estimatedSize}</span>
            `;

            // Show preview content
            const previewText = this.generateTodayPreviewText(data);
            previewContent.textContent = previewText;

        } catch (error) {
            console.error('Failed to update preview:', error);
            const previewInfo = modal.querySelector('#previewInfo');
            const previewContent = modal.querySelector('#previewContent');
            previewInfo.textContent = 'Preview unavailable';
            previewContent.textContent = 'Error loading preview data';
        }
    }

    /**
     * Collect today's data only (checklist status, completed todos, completed meetings with notes)
     */
    async collectTodayData() {
        const today = new Date().toISOString().split('T')[0];
        const data = {
            exportInfo: {
                generatedAt: new Date().toISOString(),
                exportDate: today,
                exportType: 'daily_journal'
            },
            checklist: [],
            todos: [],
            meetings: []
        };

        try {
            // Get today's checklist items with safety checks
            try {
                const allChecklistItems = await StorageManager.getAllFromStore('checklistItems') || [];
                data.checklist = allChecklistItems.filter(item => {
                    try {
                        return item && !item.isTemplate && item.date === today;
                    } catch (e) {
                        console.warn('Skipping invalid checklist item:', item, e);
                        return false;
                    }
                });
            } catch (error) {
                console.error('Error collecting checklist items:', error);
                data.checklist = [];
            }

            // Get completed todos from today with safety checks
            try {
                const allTodos = await StorageManager.getAllFromStore('todos') || [];
                data.todos = allTodos.filter(todo => {
                    try {
                        if (!todo || !todo.completed) return false;
                        
                        if (todo.completedAt) {
                            const completedDate = new Date(todo.completedAt).toISOString().split('T')[0];
                            return completedDate === today;
                        } else if (todo.createdAt) {
                            const createdDate = new Date(todo.createdAt).toISOString().split('T')[0];
                            return createdDate === today && todo.completed;
                        }
                        return false;
                    } catch (e) {
                        console.warn('Skipping invalid todo item:', todo, e);
                        return false;
                    }
                });
            } catch (error) {
                console.error('Error collecting todos:', error);
                data.todos = [];
            }

            // Get completed meetings from today with notes with safety checks
            try {
                const allMeetings = await StorageManager.getAllFromStore('meetings') || [];
                data.meetings = allMeetings.filter(meeting => {
                    try {
                        if (!meeting || !meeting.completed) return false;
                        if (!meeting.date) return false;
                        
                        const meetingDate = new Date(meeting.date).toISOString().split('T')[0];
                        return meetingDate === today && meeting.notes && meeting.notes.trim();
                    } catch (e) {
                        console.warn('Skipping invalid meeting item:', meeting, e);
                        return false;
                    }
                });
            } catch (error) {
                console.error('Error collecting meetings:', error);
                data.meetings = [];
            }

        } catch (error) {
            console.error('Error collecting today\'s data:', error);
        }

        return data;
    }

    /**
     * Count items in today's data
     */
    countTodayItems(data) {
        let count = 0;
        if (data.checklist) count += data.checklist.length;
        if (data.todos) count += data.todos.length;
        if (data.meetings) count += data.meetings.length;
        return count;
    }

    /**
     * Generate preview text for today's journal
     */
    generateTodayPreviewText(data) {
        let preview = '📊 TODAY\'S JOURNAL\n';
        preview += '═'.repeat(40) + '\n\n';
        preview += `📅 ${new Date().toDateString()}\n\n`;

        if (data.checklist && data.checklist.length > 0) {
            preview += '✅ TODAY\'S CHECKLIST STATUS\n';
            preview += '─'.repeat(25) + '\n';
            const completed = data.checklist.filter(item => item.completed).length;
            const total = data.checklist.length;
            const percentage = Math.round((completed / total) * 100);
            preview += `Progress: ${completed}/${total} (${percentage}%)\n`;
            
            data.checklist.slice(0, 3).forEach(item => {
                const status = item.completed ? '✅' : '☐';
                preview += `${status} ${item.text || 'Untitled item'}\n`;
            });
            if (data.checklist.length > 3) {
                preview += `... and ${data.checklist.length - 3} more items\n`;
            }
            preview += '\n';
        }

        if (data.todos && data.todos.length > 0) {
            preview += '📝 COMPLETED TODOS\n';
            preview += '─'.repeat(20) + '\n';
            data.todos.slice(0, 3).forEach(todo => {
                preview += `✅ ${todo.text || 'Untitled Todo'}\n`;
            });
            if (data.todos.length > 3) {
                preview += `... and ${data.todos.length - 3} more todos\n`;
            }
            preview += '\n';
        }

        if (data.meetings && data.meetings.length > 0) {
            preview += '🤝 COMPLETED MEETINGS WITH NOTES\n';
            preview += '─'.repeat(35) + '\n';
            data.meetings.slice(0, 2).forEach(meeting => {
                const meetingTitle = meeting.title || 'Untitled Meeting';
                const meetingTime = meeting.time || 'No time';
                preview += `✅ ${meetingTitle} at ${meetingTime}\n`;
                if (meeting.notes && meeting.notes.trim()) {
                    const notes = meeting.notes.substring(0, 50);
                    preview += `   Notes: ${notes}${meeting.notes.length > 50 ? '...' : ''}\n`;
                }
            });
            if (data.meetings.length > 2) {
                preview += `... and ${data.meetings.length - 2} more meetings\n`;
            }
            preview += '\n';
        }

        if (data.checklist.length === 0 && data.todos.length === 0 && data.meetings.length === 0) {
            preview += 'No activities completed today yet.\n\n';
        }

        preview += '...[Full journal will be generated]';
        
        return preview;
    }

    /**
     * Collect all export data based on date range and settings
     */
    async collectExportData(dateRange) {
        const data = {
            exportInfo: {
                generatedAt: new Date().toISOString(),
                dateRange: dateRange,
                timezone: this.exportSettings.timezone,
                includedSections: this.exportSettings.includeSections
            }
        };

        try {
            // Collect roadmap data
            if (this.exportSettings.includeSections.roadmap) {
                data.roadmap = await this.collectRoadmapData(dateRange);
            }

            // Collect checklist data
            if (this.exportSettings.includeSections.checklist) {
                data.checklist = await this.collectChecklistData(dateRange);
            }

            // Collect todos data
            if (this.exportSettings.includeSections.todos) {
                data.todos = await this.collectTodosData(dateRange);
            }

            // Collect meetings data
            if (this.exportSettings.includeSections.meetings) {
                data.meetings = await this.collectMeetingsData(dateRange);
            }

            // Collect statistics
            if (this.exportSettings.includeSections.statistics) {
                data.statistics = await this.collectStatisticsData(dateRange);
            }

        } catch (error) {
            console.error('Error collecting export data:', error);
            data.error = 'Some data could not be collected due to an error';
        }

        return data;
    }

    /**
     * Collect roadmap and milestone data
     */
    async collectRoadmapData(dateRange) {
        try {
            const projectData = await StorageManager.get('project_config');
            const milestones = await StorageManager.getAllFromStore('milestones') || [];
            
            return {
                project: projectData || {},
                milestones: milestones.filter(milestone => 
                    this.isDateInRange(new Date(milestone.date), dateRange)
                )
            };
        } catch (error) {
            console.error('Error collecting roadmap data:', error);
            return { error: 'Failed to collect roadmap data' };
        }
    }

    /**
     * Collect checklist data in simplified format for journal formatter
     */
    async collectChecklistData(dateRange) {
        try {
            // Get current checklist items
            const allChecklistItems = await StorageManager.getAllFromStore('checklistItems') || [];
            const today = new Date().toISOString().split('T')[0];
            
            // Filter for today's items (non-templates)
            const todaysItems = allChecklistItems.filter(item => 
                !item.isTemplate && 
                item.date === today
            );

            return {
                items: todaysItems
            };
        } catch (error) {
            console.error('Error collecting checklist data:', error);
            return { items: [] };
        }
    }

    /**
     * Collect todos data for journal formatter
     */
    async collectTodosData(dateRange) {
        try {
            const allTodos = await StorageManager.getAllFromStore('todos') || [];
            
            // Filter for current day or date range
            return allTodos.filter(todo => {
                if (todo.createdAt) {
                    const todoDate = new Date(todo.createdAt);
                    return this.isDateInRange(todoDate, dateRange);
                } else if (todo.date) {
                    const todoDate = new Date(todo.date);
                    return this.isDateInRange(todoDate, dateRange);
                }
                return false;
            });
        } catch (error) {
            console.error('Error collecting todos data:', error);
            return [];
        }
    }

    /**
     * Collect meetings data for journal formatter
     */
    async collectMeetingsData(dateRange) {
        try {
            const allMeetings = await StorageManager.getAllFromStore('meetings') || [];
            
            return allMeetings.filter(meeting => {
                if (meeting.date) {
                    const meetingDate = new Date(meeting.date);
                    return this.isDateInRange(meetingDate, dateRange);
                }
                return false;
            });
        } catch (error) {
            console.error('Error collecting meetings data:', error);
            return [];
        }
    }

    /**
     * Collect statistics and analytics data
     */
    async collectStatisticsData(dateRange) {
        try {
            const stats = {
                exportDate: new Date().toISOString(),
                dateRange: {
                    start: dateRange.start.toISOString(),
                    end: dateRange.end.toISOString()
                }
            };

            // Collect basic statistics
            if (this.exportSettings.includeSections.checklist) {
                const allChecklistItems = await StorageManager.getAllFromStore('checklistItems') || [];
                stats.checklist = this.calculateChecklistStats(allChecklistItems, dateRange);
            }

            if (this.exportSettings.includeSections.todos) {
                const todos = await StorageManager.getAllFromStore('todos') || [];
                stats.todos = this.calculateTodoStats(todos, dateRange);
            }

            if (this.exportSettings.includeSections.meetings) {
                const meetings = await StorageManager.getAllFromStore('meetings') || [];
                stats.meetings = this.calculateMeetingStats(meetings, dateRange);
            }

            return stats;
        } catch (error) {
            console.error('Error collecting statistics data:', error);
            return { error: 'Failed to collect statistics data' };
        }
    }

    /**
     * Check if a date is within the specified range
     */
    isDateInRange(date, range) {
        return date >= range.start && date < range.end;
    }

    /**
     * Calculate checklist statistics
     */
    calculateChecklistStats(checklistItems, dateRange) {
        const stats = {
            totalItems: 0,
            completedItems: 0,
            averageCompletion: 0
        };

        // Filter checklist items for date range and count completions
        const filteredItems = checklistItems.filter(item => {
            if (item.date) {
                const itemDate = new Date(item.date);
                return this.isDateInRange(itemDate, dateRange);
            }
            return false;
        });

        stats.totalItems = filteredItems.length;
        stats.completedItems = filteredItems.filter(item => item.completed).length;
        stats.averageCompletion = stats.totalItems > 0 ? 
            Math.round((stats.completedItems / stats.totalItems) * 100) : 0;

        return stats;
    }

    /**
     * Calculate todo statistics
     */
    calculateTodoStats(todos, dateRange) {
        const filtered = todos.filter(todo => 
            this.isDateInRange(new Date(todo.createdAt), dateRange)
        );

        return {
            total: filtered.length,
            completed: filtered.filter(todo => todo.completed).length,
            pending: filtered.filter(todo => !todo.completed).length,
            highPriority: filtered.filter(todo => todo.priority === 'high').length,
            categories: this.countByCategory(filtered, 'category')
        };
    }

    /**
     * Calculate meeting statistics
     */
    calculateMeetingStats(meetings, dateRange) {
        const filtered = meetings.filter(meeting => 
            this.isDateInRange(new Date(meeting.date), dateRange)
        );

        return {
            total: filtered.length,
            completed: filtered.filter(meeting => meeting.completed).length,
            upcoming: filtered.filter(meeting => !meeting.completed && new Date(meeting.date) > new Date()).length,
            totalDuration: filtered.reduce((sum, meeting) => sum + (meeting.duration || 0), 0)
        };
    }

    /**
     * Count items by category
     */
    countByCategory(items, categoryField) {
        const counts = {};
        items.forEach(item => {
            const category = item[categoryField] || 'uncategorized';
            counts[category] = (counts[category] || 0) + 1;
        });
        return counts;
    }

    /**
     * Count total data items
     */
    countDataItems(data) {
        let count = 0;
        
        if (data.roadmap?.milestones) count += data.roadmap.milestones.length;
        if (data.checklist?.history) {
            Object.values(data.checklist.history).forEach(day => {
                count += day.items ? day.items.length : 0;
            });
        }
        if (data.todos) count += data.todos.length;
        if (data.meetings) count += data.meetings.length;
        
        return count;
    }

    /**
     * Estimate export file size
     */
    estimateExportSize(data, format) {
        const jsonSize = JSON.stringify(data).length;
        const multiplier = format === 'html' ? 2.5 : format === 'csv' ? 0.8 : 1;
        const bytes = jsonSize * multiplier;
        
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
    }

    /**
     * Format date range for display
     */
    formatDateRange(dateRange) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const start = dateRange.start.toLocaleDateString(undefined, options);
        const end = new Date(dateRange.end.getTime() - 1).toLocaleDateString(undefined, options);
        
        if (start === end) return start;
        return `${start} - ${end}`;
    }

    /**
     * Generate preview text
     */
    generatePreviewText(data) {
        let preview = '📊 DAILY WORK JOURNAL EXPORT\n';
        preview += '═'.repeat(50) + '\n\n';

        if (data.exportInfo) {
            preview += `Generated: ${new Date(data.exportInfo.generatedAt).toLocaleString()}\n`;
            preview += `Date Range: ${this.formatDateRange(data.exportInfo.dateRange)}\n\n`;
        }

        if (data.roadmap) {
            preview += '🛣️ PROJECT ROADMAP\n';
            if (data.roadmap.project?.name) {
                preview += `Project: ${data.roadmap.project.name}\n`;
            }
            if (data.roadmap.milestones?.length) {
                preview += `Milestones: ${data.roadmap.milestones.length} items\n`;
            }
            preview += '\n';
        }

        if (data.checklist) {
            preview += '✅ DAILY CHECKLIST\n';
            const days = Object.keys(data.checklist.history || {}).length;
            if (days > 0) preview += `Days tracked: ${days}\n`;
            preview += '\n';
        }

        if (data.todos) {
            preview += `📝 TODOS: ${data.todos.length} items\n\n`;
        }

        if (data.meetings) {
            preview += `🤝 MEETINGS: ${data.meetings.length} items\n\n`;
        }

        if (data.statistics) {
            preview += '📊 STATISTICS\n';
            preview += 'Performance metrics included\n\n';
        }

        preview += '...[Full data will be exported]';
        
        return preview;
    }

    /**
     * Start today's journal export
     */
    async startTodayExport(modal) {
        try {
            const exportBtn = modal.querySelector('#startExport');
            const cancelBtn = modal.querySelector('#cancelExport');
            const progressContainer = modal.querySelector('#exportProgress');
            const progressFill = modal.querySelector('#progressFill');
            const progressText = modal.querySelector('#progressText');

            // Disable buttons and show progress
            exportBtn.disabled = true;
            cancelBtn.disabled = true;
            progressContainer.style.display = 'block';

            // Update progress: Collecting today's data
            this.updateProgress(progressFill, progressText, 10, 'Collecting today\'s data...');
            
            const data = await this.collectTodayData();

            // Update progress: Formatting journal
            this.updateProgress(progressFill, progressText, 50, 'Formatting journal...');
            
            const format = this.getSelectedFormat(modal);
            const formattedContent = await this.formatTodayJournal(data, format);
            const filename = this.generateTodayFilename(format);

            // Update progress: Saving file
            this.updateProgress(progressFill, progressText, 80, 'Saving file...');
            
            await this.saveFile(formattedContent, filename, format);

            // Update progress: Complete
            this.updateProgress(progressFill, progressText, 100, 'Journal created!');

            // Track export history
            await this.trackExportHistory(filename, data);

            // Show success and close modal
            setTimeout(() => {
                this.showExportSuccess(filename);
                modal.remove();
            }, 1500);

        } catch (error) {
            console.error('Journal export failed:', error);
            this.showExportError(error, modal);
        }
    }

    /**
     * Format today's journal data with error handling
     */
    async formatTodayJournal(data, format) {
        try {
            switch (format) {
                case 'html':
                    return this.formatTodayAsHTML(data);
                case 'txt':
                default:
                    return this.formatTodayAsText(data);
            }
        } catch (error) {
            console.error('Error formatting journal:', error);
            // Return a fallback simple format
            return `Daily Journal Export - ${new Date().toDateString()}\n\nError occurred while formatting journal. Please try again.\n\nError details: ${error.message}`;
        }
    }

    /**
     * Format today's journal as plain text
     */
    formatTodayAsText(data) {
        let content = '📊 DAILY JOURNAL\n';
        content += '═'.repeat(50) + '\n\n';
        content += `📅 Date: ${new Date().toDateString()}\n`;
        content += `⏰ Generated: ${new Date().toLocaleString()}\n\n`;

        // Checklist section
        if (data.checklist && data.checklist.length > 0) {
            content += '✅ TODAY\'S CHECKLIST STATUS\n';
            content += '─'.repeat(30) + '\n';
            
            const completed = data.checklist.filter(item => item.completed).length;
            const total = data.checklist.length;
            const percentage = Math.round((completed / total) * 100);
            
            content += `Overall Progress: ${completed}/${total} items completed (${percentage}%)\n\n`;
            
            const completedItems = data.checklist.filter(item => item.completed);
            const pendingItems = data.checklist.filter(item => !item.completed);
            
            if (completedItems.length > 0) {
                content += '✅ COMPLETED:\n';
                completedItems.forEach(item => {
                    content += `  ✔️ ${item.text || 'Untitled item'}\n`;
                    if (item.completedAt) {
                        content += `     Completed at: ${new Date(item.completedAt).toLocaleTimeString()}\n`;
                    }
                });
                content += '\n';
            }
            
            if (pendingItems.length > 0) {
                content += '⏳ PENDING:\n';
                pendingItems.forEach(item => {
                    content += `  ☐ ${item.text || 'Untitled item'}\n`;
                });
                content += '\n';
            }
        } else {
            content += '✅ TODAY\'S CHECKLIST STATUS\n';
            content += '─'.repeat(30) + '\n';
            content += 'No checklist items for today.\n\n';
        }

        // Completed Todos section
        if (data.todos && data.todos.length > 0) {
            content += '📝 COMPLETED TODOS\n';
            content += '─'.repeat(20) + '\n';
            
            data.todos.forEach((todo, index) => {
                content += `${index + 1}. ✔️ ${todo.text || 'Untitled Todo'}\n`;
                if (todo.priority && todo.priority !== 'medium') {
                    content += `   Priority: ${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}\n`;
                }
                if (todo.category && todo.category.trim()) {
                    content += `   Category: ${todo.category}\n`;
                }
                if (todo.completedAt) {
                    content += `   Completed at: ${new Date(todo.completedAt).toLocaleTimeString()}\n`;
                }
                if (todo.description && todo.description.trim()) {
                    content += `   Description: ${todo.description}\n`;
                }
                content += '\n';
            });
        } else {
            content += '📝 COMPLETED TODOS\n';
            content += '─'.repeat(20) + '\n';
            content += 'No todos completed today.\n\n';
        }

        // Completed Meetings section
        if (data.meetings && data.meetings.length > 0) {
            content += '🤝 COMPLETED MEETINGS WITH NOTES\n';
            content += '─'.repeat(35) + '\n';
            
            data.meetings.forEach((meeting, index) => {
                content += `${index + 1}. 👩‍💻 ${meeting.title || 'Untitled Meeting'}\n`;
                content += `     Date: ${meeting.date ? new Date(meeting.date).toDateString() : 'No date'}\n`;
                content += `     Time: ${meeting.time || 'No time specified'}\n`;
                
                if (meeting.attendees && Array.isArray(meeting.attendees) && meeting.attendees.length > 0) {
                    content += `   👥 Attendees: ${meeting.attendees.join(', ')}\n`;
                }
                
                if (meeting.duration) {
                    content += `   Duration: ${meeting.duration} minutes\n`;
                }
                
                if (meeting.notes && meeting.notes.trim()) {
                    content += `   📝 Details:\n`;
                    content += `   ${meeting.notes.replace(/\n/g, '\n   ')}\n`;
                }
                
                if (meeting.actionItems && Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0) {
                    content += `   🎯 Action Items:\n`;
                    meeting.actionItems.forEach(action => {
                        if (action && action.trim()) {
                            content += `   • ${action}\n`;
                        }
                    });
                }
                content += '\n';
            });
        } else {
            content += '🤝 COMPLETED MEETINGS WITH NOTES\n';
            content += '─'.repeat(35) + '\n';
            content += 'No meetings with notes completed today.\n\n';
        }

        // Summary
        content += '📊 DAILY SUMMARY\n';
        content += '─'.repeat(20) + '\n';
        content += `• Checklist items: ${data.checklist ? data.checklist.length : 0}\n`;
        content += `• Completed todos: ${data.todos ? data.todos.length : 0}\n`;
        content += `• Meetings with notes: ${data.meetings ? data.meetings.length : 0}\n`;
        
        if (data.checklist && data.checklist.length > 0) {
            const completed = data.checklist.filter(item => item.completed).length;
            const percentage = Math.round((completed / data.checklist.length) * 100);
            content += `• Checklist completion: ${percentage}%\n`;
        }
        
        content += '\n';
        content += '═'.repeat(50) + '\n';
        content += 'Generated by Daily Work Tracker\n';
        content += `Export time: ${new Date().toLocaleString()}\n`;

        return content;
    }

    /**
     * Format today's journal as HTML
     */
    formatTodayAsHTML(data) {
        const today = new Date().toDateString();
        const now = new Date().toLocaleString();
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Journal - ${today}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; border-radius: 10px; }
        .header h1 { color: #007bff; margin: 0; font-size: 2.5rem; }
        .header p { color: #6c757d; margin: 5px 0; }
        .section { margin-bottom: 40px; background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 5px solid #007bff; }
        .section h2 { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-top: 0; }
        .progress-bar { background: #f0f0f0; border-radius: 10px; padding: 3px; margin: 15px 0; }
        .progress-fill { background: linear-gradient(90deg, #28a745, #20c997); height: 25px; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
        .item { margin-bottom: 20px; padding: 15px; border: 1px solid #dee2e6; border-radius: 8px; }
        .item.completed { background-color: #d4edda; border-color: #28a745; }
        .item.pending { background-color: #fff3cd; border-color: #ffc107; }
        .item-title { font-weight: bold; color: #495057; margin-bottom: 8px; }
        .item-meta { font-size: 0.9em; color: #6c757d; margin-bottom: 5px; }
        .item-notes { background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px; font-style: italic; }
        .summary { background: linear-gradient(135deg, #e3f2fd, #f0f8ff); border-radius: 10px; padding: 20px; text-align: center; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .summary-item { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .summary-number { font-size: 2rem; font-weight: bold; color: #007bff; }
        .summary-label { color: #6c757d; font-size: 0.9rem; }
        .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9rem; }
        @media print { body { margin: 0; } .section { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Journal</h1>
        <p><strong>📅 ${today}</strong></p>
        <p>Generated on ${now}</p>
    </div>
        `;

        // Checklist section
        html += `
    <div class="section">
        <h2>✅ Today's Checklist Status</h2>
        `;
        
        if (data.checklist && data.checklist.length > 0) {
            const completed = data.checklist.filter(item => item.completed).length;
            const total = data.checklist.length;
            const percentage = Math.round((completed / total) * 100);
            
            html += `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%;">
                ${completed}/${total} completed (${percentage}%)
            </div>
        </div>
            `;
            
            data.checklist.forEach(item => {
                const itemClass = item.completed ? 'completed' : 'pending';
                const status = item.completed ? '✅' : '⏳';
                html += `
        <div class="item ${itemClass}">
            <div class="item-title">${status} ${item.text || 'Untitled item'}</div>
            ${item.completed && item.completedAt ? 
                `<div class="item-meta">⏰ Completed at: ${new Date(item.completedAt).toLocaleTimeString()}</div>` : 
                ''}
        </div>
                `;
            });
        } else {
            html += '<p>No checklist items for today.</p>';
        }
        html += '</div>';

        // Todos section
        html += `
    <div class="section">
        <h2>📝 Completed Todos</h2>
        `;
        
        if (data.todos && data.todos.length > 0) {
            data.todos.forEach(todo => {
                html += `
        <div class="item completed">
            <div class="item-title">✅ ${todo.text || 'Untitled Todo'}</div>
            ${todo.priority && todo.priority !== 'medium' ? 
                `<div class="item-meta">🎯 Priority: ${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}</div>` : 
                ''}
            ${todo.category && todo.category.trim() ? 
                `<div class="item-meta">📁 Category: ${todo.category}</div>` : 
                ''}
            ${todo.completedAt ? 
                `<div class="item-meta">⏰ Completed at: ${new Date(todo.completedAt).toLocaleTimeString()}</div>` : 
                ''}
            ${todo.description && todo.description.trim() ? 
                `<div class="item-notes">📋 ${todo.description}</div>` : 
                ''}
        </div>
                `;
            });
        } else {
            html += '<p>No todos completed today.</p>';
        }
        html += '</div>';

        // Meetings section
        html += `
    <div class="section">
        <h2>🤝 Completed Meetings with Notes</h2>
        `;
        
        if (data.meetings && data.meetings.length > 0) {
            data.meetings.forEach(meeting => {
                html += `
        <div class="item completed">
            <div class="item-title">✅ ${meeting.title || 'Untitled Meeting'}</div>
            <div class="item-meta">📅 ${meeting.date ? new Date(meeting.date).toDateString() : 'No date'} ⏰ ${meeting.time || 'No time'}</div>
            ${meeting.attendees && Array.isArray(meeting.attendees) && meeting.attendees.length > 0 ? 
                `<div class="item-meta">👥 Attendees: ${meeting.attendees.join(', ')}</div>` : 
                ''}
            ${meeting.duration ? 
                `<div class="item-meta">⏱️ Duration: ${meeting.duration} minutes</div>` : 
                ''}
            ${meeting.notes && meeting.notes.trim() ? 
                `<div class="item-notes">📝 ${meeting.notes.replace(/\n/g, '<br>')}</div>` : 
                ''}
            ${meeting.actionItems && Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0 ? 
                `<div class="item-notes">🎯 Action Items:<br>• ${meeting.actionItems.filter(item => item && item.trim()).join('<br>• ')}</div>` : 
                ''}
        </div>
                `;
            });
        } else {
            html += '<p>No meetings with notes completed today.</p>';
        }
        html += '</div>';

        // Summary section
        html += `
    <div class="summary">
        <h2>📊 Daily Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-number">${data.checklist ? data.checklist.length : 0}</div>
                <div class="summary-label">Checklist Items</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${data.todos ? data.todos.length : 0}</div>
                <div class="summary-label">Completed Todos</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${data.meetings ? data.meetings.length : 0}</div>
                <div class="summary-label">Meeting Notes</div>
            </div>
        `;
        
        if (data.checklist && data.checklist.length > 0) {
            const completed = data.checklist.filter(item => item.completed).length;
            const percentage = Math.round((completed / data.checklist.length) * 100);
            html += `
            <div class="summary-item">
                <div class="summary-number">${percentage}%</div>
                <div class="summary-label">Completion Rate</div>
            </div>
            `;
        }
        
        html += `
        </div>
    </div>

    <div class="footer">
        <p>Generated by Daily Work Tracker</p>
        <p>Export time: ${now}</p>
    </div>
</body>
</html>
        `;

        return html;
    }

    /**
     * Generate filename for today's journal
     */
    generateTodayFilename(format) {
        const today = new Date().toISOString().split('T')[0];
        const extension = this.exportFormats[format].extension;
        return `daily-journal_${today}${extension}`;
    }

    /**
     * Update export progress
     */
    updateProgress(progressFill, progressText, percent, text) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = text;
    }

    /**
     * Format data for export using simplified journal formatter
     */
    async formatDataForExport(data, format) {
        try {
            // Use simplified journal formatter for text format
            if (format === 'txt' && window.journalFormatter) {
                const result = await window.journalFormatter.formatJournal(data);
                return result.content;
            }
            
            // Use basic formatting for other formats
            return this.basicFormatDataForExport(data, format);
            
        } catch (error) {
            console.error('Formatting failed, using fallback:', error);
            return this.basicFormatDataForExport(data, format);
        }
    }

    /**
     * Basic data formatting for fallback
     */
    basicFormatDataForExport(data, format) {
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.formatAsCSV(data);
            case 'html':
                return this.formatAsHTML(data);
            case 'txt':
            default:
                return this.formatAsText(data);
        }
    }

    /**
     * Format data as plain text
     */
    formatAsText(data) {
        let content = '📊 DAILY WORK JOURNAL EXPORT\n';
        content += '═'.repeat(80) + '\n\n';

        if (data.exportInfo) {
            content += `Generated: ${new Date(data.exportInfo.generatedAt).toLocaleString()}\n`;
            content += `Date Range: ${this.formatDateRange(data.exportInfo.dateRange)}\n`;
            content += `Timezone: ${data.exportInfo.timezone}\n\n`;
        }

        // Roadmap section
        if (data.roadmap) {
            content += '🛣️ PROJECT ROADMAP\n';
            content += '─'.repeat(40) + '\n';
            
            if (data.roadmap.project) {
                const project = data.roadmap.project;
                content += `Project Name: ${project.name || 'Untitled'}\n`;
                content += `Description: ${project.description || 'No description'}\n`;
                content += `Status: ${project.status || 'Unknown'}\n`;
                if (project.startDate) content += `Start Date: ${new Date(project.startDate).toLocaleDateString()}\n`;
                if (project.endDate) content += `End Date: ${new Date(project.endDate).toLocaleDateString()}\n`;
                content += '\n';
            }

            if (data.roadmap.milestones && data.roadmap.milestones.length > 0) {
                content += 'MILESTONES:\n';
                data.roadmap.milestones.forEach((milestone, index) => {
                    content += `${index + 1}. ${milestone.title}\n`;
                    content += `   Date: ${new Date(milestone.date).toLocaleDateString()}\n`;
                    content += `   Status: ${milestone.completed ? '✅ Completed' : '⏳ Pending'}\n`;
                    if (milestone.description) {
                        content += `   Description: ${milestone.description}\n`;
                    }
                    content += '\n';
                });
            }
        }

        // Checklist section
        if (data.checklist && data.checklist.history) {
            content += '✅ DAILY CHECKLIST\n';
            content += '─'.repeat(40) + '\n';
            
            const sortedDates = Object.keys(data.checklist.history).sort();
            sortedDates.forEach(date => {
                const dayData = data.checklist.history[date];
                content += `\n📅 ${new Date(date).toDateString()}\n`;
                
                if (dayData.items && dayData.items.length > 0) {
                    dayData.items.forEach(item => {
                        const status = item.completed ? '✅' : '☐';
                        content += `  ${status} ${item.text}\n`;
                    });
                    
                    const completed = dayData.items.filter(item => item.completed).length;
                    const completion = Math.round((completed / dayData.items.length) * 100);
                    content += `  Progress: ${completed}/${dayData.items.length} (${completion}%)\n`;
                }
            });
            content += '\n';
        }

        // Todos section
        if (data.todos && data.todos.length > 0) {
            content += '📝 TODOS\n';
            content += '─'.repeat(40) + '\n';
            
            const groupedTodos = this.groupTodosByStatus(data.todos);
            
            if (groupedTodos.completed.length > 0) {
                content += '\n✅ COMPLETED TODOS:\n';
                groupedTodos.completed.forEach((todo, index) => {
                    content += `${index + 1}. ${todo.text}\n`;
                    if (todo.priority !== 'medium') content += `   Priority: ${todo.priority}\n`;
                    if (todo.category) content += `   Category: ${todo.category}\n`;
                    if (todo.completedAt) content += `   Completed: ${new Date(todo.completedAt).toLocaleDateString()}\n`;
                    content += '\n';
                });
            }

            if (groupedTodos.pending.length > 0) {
                content += '\n⏳ PENDING TODOS:\n';
                groupedTodos.pending.forEach((todo, index) => {
                    content += `${index + 1}. ${todo.text}\n`;
                    if (todo.priority !== 'medium') content += `   Priority: ${todo.priority}\n`;
                    if (todo.category) content += `   Category: ${todo.category}\n`;
                    if (todo.dueDate) content += `   Due: ${new Date(todo.dueDate).toLocaleDateString()}\n`;
                    content += '\n';
                });
            }
        }

        // Meetings section
        if (data.meetings && data.meetings.length > 0) {
            content += '🤝 MEETINGS\n';
            content += '─'.repeat(40) + '\n';
            
            data.meetings.forEach((meeting, index) => {
                content += `\n${index + 1}. ${meeting.title}\n`;
                content += `   Date: ${new Date(meeting.date).toLocaleDateString()}\n`;
                content += `   Time: ${meeting.time}\n`;
                content += `   Status: ${meeting.completed ? '✅ Completed' : '⏳ Upcoming'}\n`;
                
                if (meeting.attendees && meeting.attendees.length > 0) {
                    content += `   Attendees: ${meeting.attendees.join(', ')}\n`;
                }
                
                if (meeting.notes) {
                    content += `   Notes:\n`;
                    content += `   ${meeting.notes.replace(/\n/g, '\n   ')}\n`;
                }
                
                if (meeting.actionItems && meeting.actionItems.length > 0) {
                    content += `   Action Items:\n`;
                    meeting.actionItems.forEach(action => {
                        content += `   • ${action}\n`;
                    });
                }
                content += '\n';
            });
        }

        // Statistics section
        if (data.statistics) {
            content += '📊 STATISTICS\n';
            content += '─'.repeat(40) + '\n';
            
            if (data.statistics.checklist) {
                const stats = data.statistics.checklist;
                content += `\nChecklist Performance:\n`;
                content += `• Days tracked: ${stats.totalDays}\n`;
                content += `• Perfect days: ${stats.completedDays}\n`;
                content += `• Overall completion: ${stats.averageCompletion}%\n`;
                content += `• Total items completed: ${stats.completedItems}/${stats.totalItems}\n`;
            }

            if (data.statistics.todos) {
                const stats = data.statistics.todos;
                content += `\nTodo Performance:\n`;
                content += `• Total todos: ${stats.total}\n`;
                content += `• Completed: ${stats.completed}\n`;
                content += `• Pending: ${stats.pending}\n`;
                content += `• High priority: ${stats.highPriority}\n`;
                
                if (stats.categories && Object.keys(stats.categories).length > 0) {
                    content += `• Categories:\n`;
                    Object.entries(stats.categories).forEach(([category, count]) => {
                        content += `  - ${category}: ${count}\n`;
                    });
                }
            }

            if (data.statistics.meetings) {
                const stats = data.statistics.meetings;
                content += `\nMeeting Statistics:\n`;
                content += `• Total meetings: ${stats.total}\n`;
                content += `• Completed: ${stats.completed}\n`;
                content += `• Upcoming: ${stats.upcoming}\n`;
                if (stats.totalDuration > 0) {
                    content += `• Total duration: ${stats.totalDuration} minutes\n`;
                }
            }
        }

        content += '\n' + '═'.repeat(80) + '\n';
        content += 'Export generated by Daily Work Tracker\n';
        content += `Generated on: ${new Date().toLocaleString()}\n`;

        return content;
    }

    /**
     * Format data as CSV
     */
    formatAsCSV(data) {
        let csv = '';
        
        // Add todos as CSV
        if (data.todos && data.todos.length > 0) {
            csv += 'Type,Title,Status,Priority,Category,Created,Due,Completed,Notes\n';
            data.todos.forEach(todo => {
                csv += `Todo,"${this.escapeCsvValue(todo.text)}",${todo.completed ? 'Completed' : 'Pending'},${todo.priority || 'medium'},${todo.category || ''},${new Date(todo.createdAt).toLocaleDateString()},${todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : ''},${todo.completedAt ? new Date(todo.completedAt).toLocaleDateString() : ''},"${this.escapeCsvValue(todo.notes || '')}"\n`;
            });
            csv += '\n';
        }

        // Add meetings as CSV
        if (data.meetings && data.meetings.length > 0) {
            csv += 'Type,Title,Date,Time,Status,Attendees,Duration,Notes\n';
            data.meetings.forEach(meeting => {
                csv += `Meeting,"${this.escapeCsvValue(meeting.title)}",${new Date(meeting.date).toLocaleDateString()},${meeting.time},${meeting.completed ? 'Completed' : 'Upcoming'},"${(meeting.attendees || []).join('; ')}",${meeting.duration || ''},"${this.escapeCsvValue(meeting.notes || '')}"\n`;
            });
        }

        return csv;
    }

    /**
     * Format data as HTML
     */
    formatAsHTML(data) {
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Work Journal Export</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .completed { background-color: #d4edda; }
        .pending { background-color: #fff3cd; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
        .progress-bar { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background-color: #28a745; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Work Journal Export</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        ${data.exportInfo ? `<p>Date Range: ${this.formatDateRange(data.exportInfo.dateRange)}</p>` : ''}
    </div>
        `;

        // Add roadmap section
        if (data.roadmap) {
            html += `
    <div class="section">
        <h2>🛣️ Project Roadmap</h2>
            `;
            
            if (data.roadmap.project) {
                const project = data.roadmap.project;
                html += `
        <div class="item">
            <h3>${project.name || 'Untitled Project'}</h3>
            <p><strong>Description:</strong> ${project.description || 'No description'}</p>
            <p><strong>Status:</strong> ${project.status || 'Unknown'}</p>
            ${project.startDate ? `<p><strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString()}</p>` : ''}
            ${project.endDate ? `<p><strong>End Date:</strong> ${new Date(project.endDate).toLocaleDateString()}</p>` : ''}
        </div>
                `;
            }

            if (data.roadmap.milestones && data.roadmap.milestones.length > 0) {
                html += '<h3>Milestones:</h3>';
                data.roadmap.milestones.forEach(milestone => {
                    html += `
        <div class="item ${milestone.completed ? 'completed' : 'pending'}">
            <h4>${milestone.title}</h4>
            <p><strong>Date:</strong> ${new Date(milestone.date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${milestone.completed ? '✅ Completed' : '⏳ Pending'}</p>
            ${milestone.description ? `<p><strong>Description:</strong> ${milestone.description}</p>` : ''}
        </div>
                    `;
                });
            }
            html += '</div>';
        }

        // Add other sections...
        if (data.statistics) {
            html += `
    <div class="section">
        <h2>📊 Statistics</h2>
        <div class="stats-grid">
            `;
            
            if (data.statistics.checklist) {
                const stats = data.statistics.checklist;
                html += `
            <div class="stat-card">
                <h4>Checklist Performance</h4>
                <p>Days tracked: <strong>${stats.totalDays}</strong></p>
                <p>Average completion: <strong>${stats.averageCompletion}%</strong></p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.averageCompletion}%"></div>
                </div>
            </div>
                `;
            }

            if (data.statistics.todos) {
                const stats = data.statistics.todos;
                const completion = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                html += `
            <div class="stat-card">
                <h4>Todo Performance</h4>
                <p>Total: <strong>${stats.total}</strong></p>
                <p>Completed: <strong>${stats.completed}</strong></p>
                <p>Completion rate: <strong>${completion}%</strong></p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completion}%"></div>
                </div>
            </div>
                `;
            }

            html += '</div></div>';
        }

        html += `
    <div class="footer" style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p>Generated by Daily Work Tracker</p>
    </div>
</body>
</html>
        `;

        return html;
    }

    /**
     * Escape CSV values
     */
    escapeCsvValue(value) {
        if (typeof value !== 'string') return value;
        return value.replace(/"/g, '""');
    }

    /**
     * Group todos by status
     */
    groupTodosByStatus(todos) {
        return {
            completed: todos.filter(todo => todo.completed),
            pending: todos.filter(todo => !todo.completed)
        };
    }

    /**
     * Generate filename for export
     */
    generateFilename(dateRange, format) {
        const start = dateRange.start.toISOString().split('T')[0];
        const end = new Date(dateRange.end.getTime() - 1).toISOString().split('T')[0];
        const dateStr = start === end ? start : `${start}_to_${end}`;
        const extension = this.exportFormats[format].extension;
        
        return `daily-work-journal_${dateStr}${extension}`;
    }

    /**
     * Save file using File System Access API or fallback
     */
    async saveFile(content, filename, format) {
        const mimeType = this.exportFormats[format].mimeType;
        
        if (this.supportsFSA) {
            try {
                return await this.saveWithFSA(content, filename, mimeType);
            } catch (error) {
                console.warn('File System Access API failed, falling back to download:', error);
                return this.saveWithDownload(content, filename, mimeType);
            }
        } else {
            return this.saveWithDownload(content, filename, mimeType);
        }
    }

    /**
     * Save file using File System Access API
     */
    async saveWithFSA(content, filename, mimeType) {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
                description: 'Export files',
                accept: { [mimeType]: [filename.split('.').pop()] }
            }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        return { method: 'fsa', filename: filename };
    }

    /**
     * Save file using download fallback
     */
    saveWithDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        return { method: 'download', filename: filename };
    }

    /**
     * Track export history
     */
    async trackExportHistory(filename, data) {
        try {
            const history = await StorageManager.get('exportHistory') || [];
            const exportRecord = {
                id: Date.now().toString(),
                filename: filename,
                timestamp: new Date().toISOString(),
                format: this.exportSettings.defaultFormat,
                dateRange: this.exportSettings.dateRange,
                sections: this.exportSettings.includeSections,
                itemCount: this.countDataItems(data)
            };

            history.unshift(exportRecord);
            
            // Keep only last 50 exports
            if (history.length > 50) {
                history.splice(50);
            }

            await StorageManager.set('exportHistory', history);
        } catch (error) {
            console.error('Failed to track export history:', error);
        }
    }

    /**
     * Show export success message
     */
    showExportSuccess(filename) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">✅</span>
                <div class="toast-message">
                    <strong>Export Successful!</strong>
                    <br>Journal saved as: ${filename}
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Show export error message
     */
    showExportError(error, modal) {
        const exportBtn = modal.querySelector('#startExport');
        const cancelBtn = modal.querySelector('#cancelExport');
        const progressContainer = modal.querySelector('#exportProgress');
        const progressText = modal.querySelector('#progressText');

        // Re-enable buttons
        exportBtn.disabled = false;
        cancelBtn.disabled = false;
        
        // Show error in progress
        progressText.textContent = `Export failed: ${error.message || 'Unknown error'}`;
        progressText.style.color = '#dc3545';
        
        console.error('Export error:', error);
    }

    /**
     * Show export history modal
     */
    async showExportHistoryModal() {
        try {
            const history = await StorageManager.get('exportHistory') || [];
            const modal = this.createExportHistoryModal(history);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                const firstButton = modal.querySelector('button');
                if (firstButton) firstButton.focus();
            }, 100);
        } catch (error) {
            console.error('Failed to load export history:', error);
            this.showToast('Failed to load export history', 'error');
        }
    }

    /**
     * Create export history modal
     */
    createExportHistoryModal(history) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'exportHistoryModal';

        modalOverlay.innerHTML = `
            <div class="modal export-history-modal">
                <div class="modal-header">
                    <h2>📋 Export History</h2>
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="history-stats">
                        <div class="stat-item">
                            <span class="stat-value">${history.length}</span>
                            <span class="stat-label">Total Exports</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.calculateTotalItems(history)}</span>
                            <span class="stat-label">Items Exported</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.getMostUsedFormat(history)}</span>
                            <span class="stat-label">Most Used Format</span>
                        </div>
                    </div>
                    
                    ${history.length === 0 ? this.createEmptyHistoryState() : this.createHistoryList(history)}
                </div>
                <div class="modal-footer">
                    <div class="modal-actions">
                        <button class="btn btn-outline" id="clearHistory">🗑️ Clear History</button>
                        <button class="btn btn-secondary" id="closeHistoryModal">Close</button>
                    </div>
                </div>
            </div>
        `;

        this.setupHistoryModalEvents(modalOverlay, history);
        return modalOverlay;
    }

    /**
     * Create empty history state
     */
    createEmptyHistoryState() {
        return `
            <div class="empty-history">
                <div class="empty-icon">📊</div>
                <h3>No Export History</h3>
                <p>You haven't exported any journals yet. Click "Create Journal" to get started!</p>
            </div>
        `;
    }

    /**
     * Create history list
     */
    createHistoryList(history) {
        const sortedHistory = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return `
            <div class="history-list">
                <div class="history-header">
                    <span class="history-column">Export</span>
                    <span class="history-column">Format</span>
                    <span class="history-column">Date Range</span>
                    <span class="history-column">Items</span>
                    <span class="history-column">Actions</span>
                </div>
                ${sortedHistory.map(record => this.createHistoryItem(record)).join('')}
            </div>
        `;
    }

    /**
     * Create history item
     */
    createHistoryItem(record) {
        const formatInfo = this.exportFormats[record.format];
        const timestamp = new Date(record.timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const sections = Object.entries(record.sections || {})
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join(', ');

        return `
            <div class="history-item">
                <div class="history-details">
                    <div class="history-filename">${record.filename}</div>
                    <div class="history-timestamp">${timestamp}</div>
                </div>
                <div class="history-format">
                    <span class="format-badge ${record.format}">${formatInfo?.name || record.format.toUpperCase()}</span>
                </div>
                <div class="history-range">
                    <span class="range-badge">${this.formatDateRangeLabel(record.dateRange)}</span>
                    <div class="history-sections">${sections}</div>
                </div>
                <div class="history-count">
                    <span class="count-badge">${record.itemCount || 0}</span>
                </div>
                <div class="history-actions">
                    <button class="btn-icon" onclick="fileExportManager.repeatExport('${record.id}')" title="Repeat Export">
                        🔄
                    </button>
                    <button class="btn-icon" onclick="fileExportManager.deleteHistoryItem('${record.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup history modal events
     */
    setupHistoryModalEvents(modal, history) {
        const closeBtn = modal.querySelector('.modal-close');
        const closeBtnFooter = modal.querySelector('#closeHistoryModal');
        const clearHistoryBtn = modal.querySelector('#clearHistory');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearExportHistory(modal);
            });
        }
    }

    /**
     * Calculate total items in history
     */
    calculateTotalItems(history) {
        return history.reduce((total, record) => total + (record.itemCount || 0), 0);
    }

    /**
     * Get most used format
     */
    getMostUsedFormat(history) {
        if (history.length === 0) return 'N/A';
        
        const formatCounts = {};
        history.forEach(record => {
            formatCounts[record.format] = (formatCounts[record.format] || 0) + 1;
        });
        
        const mostUsed = Object.entries(formatCounts).sort(([,a], [,b]) => b - a)[0];
        return this.exportFormats[mostUsed[0]]?.name || mostUsed[0].toUpperCase();
    }

    /**
     * Format date range label for history
     */
    formatDateRangeLabel(dateRange) {
        const labels = {
            today: 'Today',
            last7days: 'Last 7 Days',
            last30days: 'Last 30 Days',
            all: 'All Data',
            custom: 'Custom Range'
        };
        return labels[dateRange] || 'Unknown';
    }

    /**
     * Repeat export with same settings
     */
    async repeatExport(recordId) {
        try {
            const history = await StorageManager.get('exportHistory') || [];
            const record = history.find(r => r.id === recordId);
            
            if (!record) {
                this.showToast('Export record not found', 'error');
                return;
            }

            // Apply settings from history record
            this.exportSettings = {
                ...this.exportSettings,
                defaultFormat: record.format,
                dateRange: record.dateRange,
                includeSections: record.sections
            };

            // Close history modal and show export modal
            const historyModal = document.getElementById('exportHistoryModal');
            if (historyModal) {
                historyModal.remove();
            }

            this.showExportModal();
            
        } catch (error) {
            console.error('Failed to repeat export:', error);
            this.showToast('Failed to repeat export', 'error');
        }
    }

    /**
     * Delete history item
     */
    async deleteHistoryItem(recordId) {
        try {
            const history = await StorageManager.get('exportHistory') || [];
            const filteredHistory = history.filter(r => r.id !== recordId);
            
            await StorageManager.set('exportHistory', filteredHistory);
            
            // Refresh the modal
            const modal = document.getElementById('exportHistoryModal');
            if (modal) {
                modal.remove();
                this.showExportHistoryModal();
            }
            
            this.showToast('Export record deleted', 'success');
            
        } catch (error) {
            console.error('Failed to delete history item:', error);
            this.showToast('Failed to delete record', 'error');
        }
    }

    /**
     * Clear all export history
     */
    async clearExportHistory(modal) {
        const confirmed = confirm('Are you sure you want to clear all export history? This action cannot be undone.');
        
        if (confirmed) {
            try {
                await StorageManager.set('exportHistory', []);
                modal.remove();
                this.showToast('Export history cleared', 'success');
            } catch (error) {
                console.error('Failed to clear export history:', error);
                this.showToast('Failed to clear history', 'error');
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the file export manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fileExportManager = new FileExportManager();
});
