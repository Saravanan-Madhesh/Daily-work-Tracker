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
            const settings = await storageManager.getData('exportSettings');
            this.exportSettings = settings || {
                defaultFormat: 'txt',
                includeSections: {
                    roadmap: true,
                    checklist: true,
                    todos: true,
                    meetings: true,
                    statistics: true
                },
                dateRange: 'last7days',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                customDateRange: {
                    start: null,
                    end: null
                }
            };
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
            journalTemplate: 'auto',
            dateFormat: 'long',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            exportOptions: {
                includeInsights: true,
                includeSummary: true,
                includeMetadata: true,
                detailedFormatting: false
            },
            includeSections: {
                roadmap: true,
                checklist: true,
                todos: true,
                meetings: true,
                statistics: true
            },
            dateRange: 'last7days',
            customDateRange: {
                start: null,
                end: null
            }
        };
    }

    /**
     * Show the export configuration modal
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
     * Create the export configuration modal
     */
    createExportModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'exportModal';

        modalOverlay.innerHTML = `
            <div class="modal export-modal">
                <div class="modal-header">
                    <h2>📊 Create Journal Export</h2>
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-settings">
                        <!-- Export Format Selection -->
                        <div class="setting-group">
                            <label for="exportFormat">Export Format:</label>
                            <select id="exportFormat" class="form-control">
                                ${Object.entries(this.exportFormats).map(([key, format]) => 
                                    `<option value="${key}" ${this.exportSettings.defaultFormat === key ? 'selected' : ''}>
                                        ${format.name} (${format.extension})
                                    </option>`
                                ).join('')}
                            </select>
                            <small class="help-text">
                                ${this.supportsFSA ? 'File System Access API supported' : 'Using fallback download method'}
                            </small>
                        </div>

                        <!-- Journal Template Selection -->
                        <div class="setting-group">
                            <label for="journalTemplate">Journal Template:</label>
                            <select id="journalTemplate" class="form-control">
                                <option value="auto">📊 Auto-Select (Recommended)</option>
                                <option value="daily">📅 Daily Journal</option>
                                <option value="weekly">📈 Weekly Summary</option>
                                <option value="project">🛣️ Project-Focused</option>
                                <option value="executive">💼 Executive Summary</option>
                                <option value="detailed">📚 Detailed Report</option>
                            </select>
                            <small class="help-text">
                                Template determines the structure and focus of your journal export
                            </small>
                        </div>

                        <!-- Date & Time Formatting -->
                        <div class="setting-group">
                            <label>Date & Time Formatting:</label>
                            <div class="formatting-options">
                                <div class="format-row">
                                    <label for="dateFormat">Date Format:</label>
                                    <select id="dateFormat" class="form-control">
                                        <option value="long">Long Format (Monday, January 1, 2024)</option>
                                        <option value="short">Short Format (Jan 1, 2024)</option>
                                        <option value="iso">ISO Format (2024-01-01)</option>
                                        <option value="relative">Relative Format (Today, Yesterday)</option>
                                    </select>
                                </div>
                                <div class="format-row">
                                    <label for="timezoneSelect">Timezone:</label>
                                    <select id="timezoneSelect" class="form-control">
                                        <option value="auto">Auto-detect (${Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">Eastern Time</option>
                                        <option value="America/Chicago">Central Time</option>
                                        <option value="America/Denver">Mountain Time</option>
                                        <option value="America/Los_Angeles">Pacific Time</option>
                                        <option value="Europe/London">London</option>
                                        <option value="Europe/Paris">Paris</option>
                                        <option value="Asia/Tokyo">Tokyo</option>
                                        <option value="Asia/Shanghai">Shanghai</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Export Options -->
                        <div class="setting-group">
                            <label>Export Options:</label>
                            <div class="checkbox-group">
                                <label class="checkbox-option">
                                    <input type="checkbox" name="exportOptions" value="includeInsights" checked>
                                    <span>📊 Include Insights & Analysis</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="exportOptions" value="includeSummary" checked>
                                    <span>📋 Include Executive Summary</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="exportOptions" value="includeMetadata" checked>
                                    <span>ℹ️ Include Export Metadata</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="exportOptions" value="detailedFormatting">
                                    <span>🎨 Enhanced Formatting (HTML/Markdown)</span>
                                </label>
                            </div>
                        </div>

                        <!-- Date Range Selection -->
                        <div class="setting-group">
                            <label>Date Range:</label>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="dateRange" value="today" ${this.exportSettings.dateRange === 'today' ? 'checked' : ''}>
                                    <span>Today Only</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="dateRange" value="last7days" ${this.exportSettings.dateRange === 'last7days' ? 'checked' : ''}>
                                    <span>Last 7 Days</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="dateRange" value="last30days" ${this.exportSettings.dateRange === 'last30days' ? 'checked' : ''}>
                                    <span>Last 30 Days</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="dateRange" value="all" ${this.exportSettings.dateRange === 'all' ? 'checked' : ''}>
                                    <span>All Data</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="dateRange" value="custom" ${this.exportSettings.dateRange === 'custom' ? 'checked' : ''}>
                                    <span>Custom Range</span>
                                </label>
                            </div>
                            <div class="custom-date-range" style="display: ${this.exportSettings.dateRange === 'custom' ? 'block' : 'none'}">
                                <div class="date-inputs">
                                    <div class="date-input-group">
                                        <label for="customStartDate">From:</label>
                                        <input type="date" id="customStartDate" class="form-control" 
                                               value="${this.exportSettings.customDateRange.start || ''}">
                                    </div>
                                    <div class="date-input-group">
                                        <label for="customEndDate">To:</label>
                                        <input type="date" id="customEndDate" class="form-control" 
                                               value="${this.exportSettings.customDateRange.end || ''}">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Sections to Include -->
                        <div class="setting-group">
                            <label>Sections to Include:</label>
                            <div class="checkbox-group">
                                <label class="checkbox-option">
                                    <input type="checkbox" name="includeSections" value="roadmap" 
                                           ${this.exportSettings.includeSections.roadmap ? 'checked' : ''}>
                                    <span>🛣️ Project Roadmap & Milestones</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="includeSections" value="checklist" 
                                           ${this.exportSettings.includeSections.checklist ? 'checked' : ''}>
                                    <span>✅ Daily Checklist</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="includeSections" value="todos" 
                                           ${this.exportSettings.includeSections.todos ? 'checked' : ''}>
                                    <span>📝 ToDos</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="includeSections" value="meetings" 
                                           ${this.exportSettings.includeSections.meetings ? 'checked' : ''}>
                                    <span>🤝 Meetings</span>
                                </label>
                                <label class="checkbox-option">
                                    <input type="checkbox" name="includeSections" value="statistics" 
                                           ${this.exportSettings.includeSections.statistics ? 'checked' : ''}>
                                    <span>📊 Statistics & Analytics</span>
                                </label>
                            </div>
                        </div>

                        <!-- Export Preview -->
                        <div class="setting-group">
                            <div class="export-preview">
                                <div class="preview-header">
                                    <strong>Export Preview:</strong>
                                    <span id="previewInfo" class="preview-info">Calculating...</span>
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
                            💾 Export Journal
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

        // Settings change events
        const inputs = modal.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateSettingsFromModal(modal);
                this.updatePreview(modal);
            });
        });

        // Custom date range visibility
        const dateRangeRadios = modal.querySelectorAll('input[name="dateRange"]');
        dateRangeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const customDateRange = modal.querySelector('.custom-date-range');
                customDateRange.style.display = radio.value === 'custom' ? 'block' : 'none';
            });
        });

        // Export button
        const exportBtn = modal.querySelector('#startExport');
        exportBtn.addEventListener('click', () => {
            this.startExport(modal);
        });
    }

    /**
     * Update settings from modal form
     */
    updateSettingsFromModal(modal) {
        const formData = new FormData(modal.querySelector('.export-settings'));
        
        this.exportSettings.defaultFormat = modal.querySelector('#exportFormat').value;
        this.exportSettings.dateRange = formData.get('dateRange') || 'last7days';
        
        // Update template selection
        const templateSelect = modal.querySelector('#journalTemplate');
        if (templateSelect) {
            this.exportSettings.journalTemplate = templateSelect.value;
        }
        
        // Update date/time formatting
        const dateFormatSelect = modal.querySelector('#dateFormat');
        if (dateFormatSelect) {
            this.exportSettings.dateFormat = dateFormatSelect.value;
        }
        
        const timezoneSelect = modal.querySelector('#timezoneSelect');
        if (timezoneSelect) {
            this.exportSettings.timezone = timezoneSelect.value === 'auto' ? 
                Intl.DateTimeFormat().resolvedOptions().timeZone : 
                timezoneSelect.value;
        }
        
        // Update export options
        const exportOptions = formData.getAll('exportOptions');
        this.exportSettings.exportOptions = {
            includeInsights: exportOptions.includes('includeInsights'),
            includeSummary: exportOptions.includes('includeSummary'),
            includeMetadata: exportOptions.includes('includeMetadata'),
            detailedFormatting: exportOptions.includes('detailedFormatting')
        };
        
        // Update custom date range
        if (this.exportSettings.dateRange === 'custom') {
            this.exportSettings.customDateRange.start = modal.querySelector('#customStartDate').value;
            this.exportSettings.customDateRange.end = modal.querySelector('#customEndDate').value;
        }

        // Update included sections
        const includeSections = formData.getAll('includeSections');
        this.exportSettings.includeSections = {
            roadmap: includeSections.includes('roadmap'),
            checklist: includeSections.includes('checklist'),
            todos: includeSections.includes('todos'),
            meetings: includeSections.includes('meetings'),
            statistics: includeSections.includes('statistics')
        };
    }

    /**
     * Update export preview
     */
    async updatePreview(modal) {
        try {
            const previewInfo = modal.querySelector('#previewInfo');
            const previewContent = modal.querySelector('#previewContent');
            
            previewInfo.textContent = 'Calculating...';
            previewContent.textContent = 'Loading preview...';

            const dateRange = this.getDateRange();
            const data = await this.collectExportData(dateRange);
            
            // Calculate export info
            const totalItems = this.countDataItems(data);
            const estimatedSize = this.estimateExportSize(data, this.exportSettings.defaultFormat);
            
            previewInfo.innerHTML = `
                <span class="preview-stat">📊 ${totalItems} total items</span>
                <span class="preview-stat">📦 ~${estimatedSize}</span>
                <span class="preview-stat">📅 ${this.formatDateRange(dateRange)}</span>
            `;

            // Show preview content
            const previewText = this.generatePreviewText(data);
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
     * Get date range based on settings
     */
    getDateRange() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (this.exportSettings.dateRange) {
            case 'today':
                return {
                    start: today,
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'last7days':
                return {
                    start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'last30days':
                return {
                    start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'custom':
                return {
                    start: this.exportSettings.customDateRange.start ? 
                           new Date(this.exportSettings.customDateRange.start) : 
                           new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                    end: this.exportSettings.customDateRange.end ? 
                         new Date(this.exportSettings.customDateRange.end) : 
                         new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'all':
            default:
                return {
                    start: new Date('2020-01-01'),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
        }
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
            const projectData = await storageManager.getData('projectSettings');
            const milestones = await storageManager.getData('milestones') || [];
            
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
     * Collect checklist data
     */
    async collectChecklistData(dateRange) {
        try {
            const checklistHistory = await storageManager.getData('checklistHistory') || {};
            const checklistTemplates = await storageManager.getData('checklistTemplates') || [];
            
            const filteredHistory = {};
            Object.entries(checklistHistory).forEach(([date, data]) => {
                if (this.isDateInRange(new Date(date), dateRange)) {
                    filteredHistory[date] = data;
                }
            });

            return {
                history: filteredHistory,
                templates: checklistTemplates
            };
        } catch (error) {
            console.error('Error collecting checklist data:', error);
            return { error: 'Failed to collect checklist data' };
        }
    }

    /**
     * Collect todos data
     */
    async collectTodosData(dateRange) {
        try {
            const todos = await storageManager.getData('todos') || [];
            
            return todos.filter(todo => {
                const todoDate = new Date(todo.createdAt);
                return this.isDateInRange(todoDate, dateRange);
            });
        } catch (error) {
            console.error('Error collecting todos data:', error);
            return { error: 'Failed to collect todos data' };
        }
    }

    /**
     * Collect meetings data
     */
    async collectMeetingsData(dateRange) {
        try {
            const meetings = await storageManager.getData('meetings') || [];
            
            return meetings.filter(meeting => {
                const meetingDate = new Date(meeting.date);
                return this.isDateInRange(meetingDate, dateRange);
            });
        } catch (error) {
            console.error('Error collecting meetings data:', error);
            return { error: 'Failed to collect meetings data' };
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
                const checklistHistory = await storageManager.getData('checklistHistory') || {};
                stats.checklist = this.calculateChecklistStats(checklistHistory, dateRange);
            }

            if (this.exportSettings.includeSections.todos) {
                const todos = await storageManager.getData('todos') || [];
                stats.todos = this.calculateTodoStats(todos, dateRange);
            }

            if (this.exportSettings.includeSections.meetings) {
                const meetings = await storageManager.getData('meetings') || [];
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
    calculateChecklistStats(checklistHistory, dateRange) {
        const stats = {
            totalDays: 0,
            completedDays: 0,
            totalItems: 0,
            completedItems: 0,
            averageCompletion: 0
        };

        Object.entries(checklistHistory).forEach(([date, data]) => {
            if (this.isDateInRange(new Date(date), dateRange)) {
                stats.totalDays++;
                const completed = data.items.filter(item => item.completed).length;
                const total = data.items.length;
                
                stats.totalItems += total;
                stats.completedItems += completed;
                
                if (completed === total && total > 0) {
                    stats.completedDays++;
                }
            }
        });

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
     * Start the export process
     */
    async startExport(modal) {
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

            // Update progress: Collecting data
            this.updateProgress(progressFill, progressText, 10, 'Collecting data...');
            
            const dateRange = this.getDateRange();
            const data = await this.collectExportData(dateRange);

            // Update progress: Formatting data
            this.updateProgress(progressFill, progressText, 50, 'Formatting export...');
            
            const formattedContent = await this.formatDataForExport(data, this.exportSettings.defaultFormat);
            const filename = this.generateFilename(dateRange, this.exportSettings.defaultFormat);

            // Update progress: Saving file
            this.updateProgress(progressFill, progressText, 80, 'Saving file...');
            
            await this.saveFile(formattedContent, filename, this.exportSettings.defaultFormat);

            // Update progress: Complete
            this.updateProgress(progressFill, progressText, 100, 'Export complete!');

            // Save export settings
            await storageManager.saveData('exportSettings', this.exportSettings);

            // Track export history
            await this.trackExportHistory(filename, data);

            // Show success and close modal
            setTimeout(() => {
                this.showExportSuccess(filename);
                modal.remove();
            }, 1500);

        } catch (error) {
            console.error('Export failed:', error);
            this.showExportError(error, modal);
        }
    }

    /**
     * Update export progress
     */
    updateProgress(progressFill, progressText, percent, text) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = text;
    }

    /**
     * Format data for specific export format using advanced journal formatter
     */
    async formatDataForExport(data, format) {
        try {
            // Use the advanced journal formatter if available
            if (window.journalFormatter) {
                const templateType = this.getTemplateForFormat(format);
                const formatterOptions = {
                    template: templateType,
                    format: this.mapFormatToJournalFormat(format),
                    dateFormat: this.exportSettings.dateFormat || 'long',
                    timezone: this.exportSettings.timezone,
                    includeInsights: true,
                    customOptions: {
                        detailLevel: this.exportSettings.detailLevel || 'standard',
                        includeSummary: true,
                        includeAnalytics: this.exportSettings.includeSections?.statistics
                    }
                };

                const result = await window.journalFormatter.formatJournal(data, formatterOptions);
                return result.content;
            }
            
            // Fallback to basic formatting
            return this.basicFormatDataForExport(data, format);
            
        } catch (error) {
            console.error('Advanced formatting failed, using fallback:', error);
            return this.basicFormatDataForExport(data, format);
        }
    }

    /**
     * Get appropriate template based on user selection or auto-selection
     */
    getTemplateForFormat(format) {
        // Use user selection if not auto
        if (this.exportSettings.journalTemplate && this.exportSettings.journalTemplate !== 'auto') {
            return this.exportSettings.journalTemplate;
        }
        
        // Auto-select based on date range and context
        const dateRange = this.getDateRange();
        const days = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
        
        // Determine template based on date range and content
        if (days === 1) return 'daily';
        if (days <= 7) return 'weekly';
        if (this.exportSettings.includeSections?.roadmap && days > 7) return 'project';
        if (format === 'html' && days > 30) return 'executive';
        
        return 'detailed';
    }

    /**
     * Map export format to journal formatter format
     */
    mapFormatToJournalFormat(format) {
        const formatMap = {
            'txt': 'text',
            'json': 'json',
            'csv': 'csv',
            'html': 'html',
            'md': 'markdown'
        };
        
        return formatMap[format] || 'text';
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
            const history = await storageManager.getData('exportHistory') || [];
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

            await storageManager.saveData('exportHistory', history);
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
            const history = await storageManager.getData('exportHistory') || [];
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
            const history = await storageManager.getData('exportHistory') || [];
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
            const history = await storageManager.getData('exportHistory') || [];
            const filteredHistory = history.filter(r => r.id !== recordId);
            
            await storageManager.saveData('exportHistory', filteredHistory);
            
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
                await storageManager.saveData('exportHistory', []);
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
