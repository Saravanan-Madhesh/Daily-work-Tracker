/**
 * Meetings Manager - Handles meeting tracking functionality
 * Features: Add/Edit/Delete meetings, Meeting notes, Status tracking, Time management
 */
class MeetingsManager {
    static meetings = [];
    static currentEditingId = null;
    static notesModal = null;

    /**
     * Initialize the meetings manager
     */
    static async init() {
        console.log('Initializing Meetings Manager...');
        try {
            // Wait for StorageManager to be ready
            if (!window.StorageManager) {
                console.log('Waiting for StorageManager to be available...');
                let attempts = 0;
                while (!window.StorageManager && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
                
                if (!window.StorageManager) {
                    throw new Error('StorageManager not available after waiting');
                }
            }
            
            // Wait for StorageManager to be initialized
            if (!StorageManager.isInitialized) {
                console.log('Waiting for StorageManager to be initialized...');
                let attempts = 0;
                while (!StorageManager.isInitialized && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                    attempts++;
                }
                
                if (!StorageManager.isInitialized) {
                    throw new Error('StorageManager not initialized after waiting');
                }
            }
            
            await this.loadMeetings();
            this.setupEventListeners();
            this.renderMeetings();
            
            // Start auto-refresh for time updates
            this.startTimeUpdateInterval();
            
            console.log('Meetings Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Meetings Manager:', error);
            // Show error to user but don't break the entire app
            setTimeout(() => {
                if (window.app) {
                    window.app.showError('Failed to initialize meetings: ' + error.message);
                }
            }, 1000);
        }
    }

    /**
     * Load meetings from storage
     */
    static async loadMeetings() {
        try {
            // Check if StorageManager is available and initialized
            if (!window.StorageManager || !StorageManager.isInitialized) {
                console.warn('StorageManager not available or not initialized, using empty meetings array');
                this.meetings = [];
                return;
            }
            
            // Use a safer method to get current date
            const today = new Date().toISOString().split('T')[0];
            
            // Load today's meetings
            const todayMeetings = await StorageManager.getAllFromStore('meetings', 'date', today) || [];
            
            // Load upcoming meetings (next 7 days to show more meetings)
            const upcomingMeetings = [];
            for (let i = 1; i <= 7; i++) {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + i);
                const futureDateString = futureDate.toISOString().split('T')[0];
                
                const futureMeetings = await StorageManager.getAllFromStore('meetings', 'date', futureDateString) || [];
                upcomingMeetings.push(...futureMeetings);
            }

            // Combine and sort all meetings
            this.meetings = [...todayMeetings, ...upcomingMeetings]
                .sort((a, b) => {
                    // Sort by date first, then by time
                    if (a.date !== b.date) {
                        return new Date(a.date) - new Date(b.date);
                    }
                    return a.time.localeCompare(b.time);
                });

            console.log(`Loaded ${this.meetings.length} meetings`);
        } catch (error) {
            console.error('Error loading meetings:', error);
            this.meetings = [];
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        try {
            const addMeetingBtn = document.getElementById('addMeeting');
            if (addMeetingBtn) {
                addMeetingBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAddMeetingModal();
                });
                console.log('Add meeting button listener attached');
            } else {
                console.warn('Add meeting button not found in DOM');
            }

            const analyticsBtn = document.getElementById('meetingAnalytics');
            if (analyticsBtn) {
                analyticsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAnalyticsModal();
                });
                console.log('Meeting analytics button listener attached');
            } else {
                console.warn('Meeting analytics button not found in DOM');
            }

            const searchBtn = document.getElementById('meetingSearch');
            if (searchBtn) {
                searchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSearchModal();
                });
                console.log('Meeting search button listener attached');
            } else {
                console.warn('Meeting search button not found in DOM');
            }

            // Handle escape key to close modals
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllModals();
                }
            });
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    /**
     * Start time update interval for meeting status
     */
    static startTimeUpdateInterval() {
        // Update every minute to refresh meeting status and times
        setInterval(() => {
            this.updateMeetingStatuses();
            this.renderMeetings();
        }, 60000);
    }

    /**
     * Update meeting statuses based on current time
     */
    static updateMeetingStatuses() {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const today = now.toISOString().split('T')[0];

        this.meetings.forEach(meeting => {
            if (meeting.date === today) {
                // Mark meetings as in progress or overdue
                if (!meeting.completed) {
                    const meetingTime = new Date(`${meeting.date}T${meeting.time}`);
                    const timeDiff = now - meetingTime;
                    
                    if (timeDiff > 0 && timeDiff < 3600000) { // 1 hour
                        meeting.status = 'in-progress';
                    } else if (timeDiff > 3600000) {
                        meeting.status = 'overdue';
                    } else {
                        meeting.status = 'upcoming';
                    }
                }
            }
        });
    }

    /**
     * Render all meetings
     */
    static renderMeetings() {
        const container = document.getElementById('meetingItems');
        if (!container) return;

        if (this.meetings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🤝</div>
                    <div class="empty-title">No meetings scheduled</div>
                    <div class="empty-description">Add your first meeting to get started</div>
                    <button class="btn btn-primary empty-action" onclick="MeetingsManager.showAddMeetingModal()">
                        + Add Meeting
                    </button>
                </div>
            `;
            return;
        }

        const groupedMeetings = this.groupMeetingsByDate();
        let html = '';

        Object.entries(groupedMeetings).forEach(([date, meetings]) => {
            const dateLabel = this.formatDateLabel(date);
            html += `<div class="meeting-date-group">
                <div class="date-separator">
                    <span class="date-label">${dateLabel}</span>
                    <span class="meeting-count">${meetings.length} meeting${meetings.length > 1 ? 's' : ''}</span>
                </div>`;
            
            meetings.forEach(meeting => {
                html += this.renderMeetingItem(meeting);
            });
            
            html += `</div>`;
        });

        container.innerHTML = html;
    }

    /**
     * Group meetings by date
     */
    static groupMeetingsByDate() {
        const grouped = {};
        this.meetings.forEach(meeting => {
            if (!grouped[meeting.date]) {
                grouped[meeting.date] = [];
            }
            grouped[meeting.date].push(meeting);
        });
        return grouped;
    }

    /**
     * Format date label for display
     */
    static formatDateLabel(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateStr = date.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        if (dateStr === todayStr) {
            return 'Today';
        } else if (dateStr === tomorrowStr) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    /**
     * Render individual meeting item
     */
    static renderMeetingItem(meeting) {
        const statusClass = this.getMeetingStatusClass(meeting);
        const statusIcon = this.getMeetingStatusIcon(meeting);
        const timeFormatted = this.formatTime(meeting.time);
        const notesPreview = meeting.notes ? meeting.notes.substring(0, 50) + (meeting.notes.length > 50 ? '...' : '') : '';

        return `
            <div class="meeting-item ${statusClass}" data-id="${meeting.id}">
                <div class="meeting-header">
                    <div class="meeting-time">
                        ${statusIcon} ${timeFormatted}
                    </div>
                    <div class="meeting-actions">
                        <button class="meeting-notes" onclick="MeetingsManager.showNotesModal('${meeting.id}')" title="Meeting Notes">
                            📝
                        </button>
                        <button class="meeting-edit" onclick="MeetingsManager.editMeeting('${meeting.id}')" title="Edit Meeting">
                            ✏️
                        </button>
                        <button class="meeting-delete" onclick="MeetingsManager.deleteMeeting('${meeting.id}')" title="Delete Meeting">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="meeting-content">
                    <div class="meeting-title-row">
                        <input type="checkbox" class="meeting-checkbox" 
                               ${meeting.completed ? 'checked' : ''} 
                               onchange="MeetingsManager.toggleMeetingComplete('${meeting.id}')">
                        <div class="meeting-title ${meeting.completed ? 'completed' : ''}">${meeting.title}</div>
                    </div>
                    ${meeting.attendees ? `<div class="meeting-attendees">👥 ${meeting.attendees}</div>` : ''}
                    ${notesPreview ? `<div class="meeting-notes-preview">${notesPreview}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get meeting status class for styling
     */
    static getMeetingStatusClass(meeting) {
        if (meeting.completed) return 'completed';
        if (meeting.status === 'overdue') return 'overdue';
        if (meeting.status === 'in-progress') return 'in-progress';
        return '';
    }

    /**
     * Get meeting status icon
     */
    static getMeetingStatusIcon(meeting) {
        if (meeting.completed) return '✅';
        if (meeting.status === 'overdue') return '⏰';
        if (meeting.status === 'in-progress') return '🔴';
        return '🕐';
    }

    /**
     * Format time for display
     */
    static formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour12 = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
    }

    /**
     * Show add meeting modal
     */
    static showAddMeetingModal() {
        this.currentEditingId = null;
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().slice(0, 5);

        this.showMeetingModal({
            title: '',
            date: today,
            time: currentTime,
            attendees: '',
            notes: ''
        });
    }

    /**
     * Edit existing meeting
     */
    static editMeeting(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting) return;

        this.currentEditingId = id;
        this.showMeetingModal(meeting);
    }

    /**
     * Show meeting modal for add/edit
     */
    static showMeetingModal(meeting) {
        const isEditing = this.currentEditingId !== null;
        const modalTitle = isEditing ? 'Edit Meeting' : 'Add Meeting';

        const modalHTML = `
            <div class="modal-backdrop active" onclick="if(event.target === this) MeetingsManager.closeModal()">
                <div class="modal meeting-modal">
                    <div class="modal-header">
                        <h3>${modalTitle}</h3>
                        <button class="modal-close" onclick="MeetingsManager.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="meetingForm" class="meeting-form">
                            <div class="form-group">
                                <label for="meetingTitle">Meeting Title *</label>
                                <input type="text" id="meetingTitle" value="${meeting.title}" 
                                       placeholder="Enter meeting title" required maxlength="100">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="meetingDate">Date *</label>
                                    <input type="date" id="meetingDate" value="${meeting.date}" required>
                                </div>
                                <div class="form-group">
                                    <label for="meetingTime">Time *</label>
                                    <input type="time" id="meetingTime" value="${meeting.time}" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="meetingAttendees">Attendees</label>
                                <input type="text" id="meetingAttendees" value="${meeting.attendees || ''}" 
                                       placeholder="John, Sarah, Mike..." maxlength="200">
                                <small class="form-help">Separate multiple attendees with commas</small>
                            </div>

                            <div class="form-group">
                                <label for="meetingNotes">Meeting Notes</label>
                                <div class="notes-templates">
                                    <label class="template-label">Quick Templates:</label>
                                    <div class="template-buttons-inline">
                                        <button type="button" class="btn btn-outline btn-small" onclick="MeetingsManager.applyMeetingTemplate('standup')">
                                            📋 Standup
                                        </button>
                                        <button type="button" class="btn btn-outline btn-small" onclick="MeetingsManager.applyMeetingTemplate('client-meeting')">
                                            👥 Client
                                        </button>
                                        <button type="button" class="btn btn-outline btn-small" onclick="MeetingsManager.applyMeetingTemplate('one-on-one')">
                                            🗣️ 1:1
                                        </button>
                                        <button type="button" class="btn btn-outline btn-small" onclick="MeetingsManager.applyMeetingTemplate('sprint-planning')">
                                            📊 Planning
                                        </button>
                                    </div>
                                </div>
                                <textarea id="meetingNotes" placeholder="Add meeting agenda, notes, or reminders..." 
                                          rows="4" maxlength="1000">${meeting.notes || ''}</textarea>
                                <small class="form-help">You can also add/edit notes after the meeting or use quick templates above</small>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="MeetingsManager.closeModal()">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ${isEditing ? 'Update Meeting' : 'Create Meeting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.querySelector('.modal-backdrop');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        document.body.appendChild(modalElement.firstElementChild);

        // Setup form submission
        const form = document.getElementById('meetingForm');
        form.addEventListener('submit', (e) => this.handleMeetingSubmit(e));

        // Set date constraints
        const dateInput = document.getElementById('meetingDate');
        const today = new Date().toISOString().split('T')[0];
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 6);
        
        dateInput.min = today;
        dateInput.max = maxDate.toISOString().split('T')[0];

        // Focus on title input
        setTimeout(() => document.getElementById('meetingTitle').focus(), 100);
    }

    /**
     * Handle meeting form submission
     */
    static async handleMeetingSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const meetingData = {
            title: document.getElementById('meetingTitle').value.trim(),
            date: document.getElementById('meetingDate').value,
            time: document.getElementById('meetingTime').value,
            attendees: document.getElementById('meetingAttendees').value.trim(),
            notes: document.getElementById('meetingNotes').value.trim()
        };

        // Validate data
        const validation = StorageManager.validateMeetingData(meetingData);
        if (!validation.isValid) {
            alert('Please fix the following errors:\n' + validation.errors.join('\n'));
            return;
        }

        try {
            let meeting;
            if (this.currentEditingId) {
                // Update existing meeting
                meeting = StorageManager.createMeetingModel({
                    ...meetingData,
                    id: this.currentEditingId
                });
                
                // Preserve existing completion status
                const existing = this.meetings.find(m => m.id === this.currentEditingId);
                if (existing) {
                    meeting.completed = existing.completed;
                    meeting.completedAt = existing.completedAt;
                }
                
            } else {
                // Create new meeting
                meeting = StorageManager.createMeetingModel(meetingData);
            }

            await StorageManager.saveToStore('meetings', meeting);
            await this.refresh();
            this.closeModal();

            console.log(`Meeting ${this.currentEditingId ? 'updated' : 'created'} successfully`);
        } catch (error) {
            console.error('Error saving meeting:', error);
            alert('Failed to save meeting. Please try again.');
        }
    }

    /**
     * Toggle meeting completion status
     */
    static async toggleMeetingComplete(id) {
        try {
            const meeting = this.meetings.find(m => m.id === id);
            if (!meeting) return;

            meeting.completed = !meeting.completed;
            meeting.completedAt = meeting.completed ? new Date().toISOString() : null;
            meeting.updatedAt = new Date().toISOString();

            await StorageManager.saveToStore('meetings', meeting);

            // If marking as complete and no notes, prompt for notes
            if (meeting.completed && !meeting.notes) {
                setTimeout(() => this.showNotesModal(id), 300);
            }

            this.renderMeetings();
        } catch (error) {
            console.error('Error toggling meeting completion:', error);
        }
    }

    /**
     * Show notes modal for a meeting
     */
    static showNotesModal(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting) return;

        const modalHTML = `
            <div class="modal-backdrop active" onclick="if(event.target === this) MeetingsManager.closeNotesModal()">
                <div class="modal notes-modal enhanced-notes">
                    <div class="modal-header">
                        <h3>📝 Meeting Notes</h3>
                        <div class="meeting-info">
                            <div class="meeting-title">${meeting.title}</div>
                            <div class="meeting-datetime">${this.formatDateLabel(meeting.date)} at ${this.formatTime(meeting.time)}</div>
                            ${meeting.attendees ? `<div class="meeting-attendees-info">👥 ${meeting.attendees}</div>` : ''}
                        </div>
                        <button class="modal-close" onclick="MeetingsManager.closeNotesModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Notes Toolbar -->
                        <div class="notes-toolbar">
                            <div class="toolbar-section">
                                <label class="toolbar-label">Templates:</label>
                                <div class="template-buttons">
                                    <button type="button" class="template-btn" onclick="MeetingsManager.applyTemplate('agenda')">
                                        📋 Agenda
                                    </button>
                                    <button type="button" class="template-btn" onclick="MeetingsManager.applyTemplate('minutes')">
                                        📄 Minutes
                                    </button>
                                    <button type="button" class="template-btn" onclick="MeetingsManager.applyTemplate('action-items')">
                                        ✅ Action Items
                                    </button>
                                    <button type="button" class="template-btn" onclick="MeetingsManager.applyTemplate('decisions')">
                                        🎯 Decisions
                                    </button>
                                </div>
                            </div>
                            <div class="toolbar-section">
                                <label class="toolbar-label">Format:</label>
                                <div class="format-buttons">
                                    <button type="button" class="format-btn" onclick="MeetingsManager.insertFormatting('bullet')" title="Add Bullet Point">
                                        • List
                                    </button>
                                    <button type="button" class="format-btn" onclick="MeetingsManager.insertFormatting('number')" title="Add Numbered List">
                                        1. Number
                                    </button>
                                    <button type="button" class="format-btn" onclick="MeetingsManager.insertFormatting('checkbox')" title="Add Checkbox">
                                        ☐ Task
                                    </button>
                                    <button type="button" class="format-btn" onclick="MeetingsManager.insertFormatting('separator')" title="Add Separator">
                                        ─ Line
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="notes-container">
                            <textarea id="meetingNotesText" class="notes-textarea enhanced-textarea" 
                                      placeholder="Add meeting notes, decisions, action items...

💡 Tips:
• Use the templates above to get started
• Add action items with ☐ checkboxes
• Use bullet points for key discussions
• Document decisions and next steps" 
                                      maxlength="5000">${meeting.notes || ''}</textarea>
                            
                            <!-- Notes Preview -->
                            <div id="notesPreview" class="notes-preview hidden">
                                <div class="preview-header">
                                    <h4>Preview</h4>
                                    <button type="button" class="btn btn-small" onclick="MeetingsManager.togglePreview(false)">
                                        ✏️ Edit
                                    </button>
                                </div>
                                <div id="previewContent" class="preview-content"></div>
                            </div>
                        </div>
                        
                        <div class="notes-footer">
                            <div class="notes-info">
                                <div class="info-item">
                                    <span class="char-count">
                                        <span id="charCount">${(meeting.notes || '').length}</span>/5000 characters
                                    </span>
                                </div>
                                <div class="info-item">
                                    <span class="word-count">
                                        Words: <span id="wordCount">${this.countWords(meeting.notes || '')}</span>
                                    </span>
                                </div>
                                ${meeting.updatedAt ? `
                                <div class="info-item">
                                    <span class="last-updated">
                                        Last updated: ${new Date(meeting.updatedAt).toLocaleString()}
                                    </span>
                                </div>` : ''}
                            </div>
                            
                            <div class="preview-toggle">
                                <button type="button" class="btn btn-outline" onclick="MeetingsManager.togglePreview(true)">
                                    👁️ Preview
                                </button>
                            </div>
                        </div>
                        
                        <div class="notes-actions">
                            <div class="action-group">
                                <button class="btn btn-secondary" onclick="MeetingsManager.closeNotesModal()">
                                    Cancel
                                </button>
                                <button class="btn btn-outline" onclick="MeetingsManager.clearNotes('${id}')">
                                    🗑️ Clear
                                </button>
                            </div>
                            <div class="action-group">
                                <button class="btn btn-outline" onclick="MeetingsManager.exportNotes('${id}')">
                                    📤 Export
                                </button>
                                <button class="btn btn-primary" onclick="MeetingsManager.saveNotes('${id}')">
                                    💾 Save Notes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.querySelector('.modal-backdrop');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        const modalBackdrop = modalElement.firstElementChild;
        document.body.appendChild(modalBackdrop);

        this.setupNotesModal(meeting);
        
        this.notesModal = modalBackdrop;
    }

    /**
     * Setup notes modal functionality
     */
    static setupNotesModal(meeting) {
        const textarea = document.getElementById('meetingNotesText');
        const charCount = document.getElementById('charCount');
        const wordCount = document.getElementById('wordCount');
        
        // Character and word counter
        const updateCounts = () => {
            const text = textarea.value;
            charCount.textContent = text.length;
            wordCount.textContent = this.countWords(text);
            
            // Update character count color based on limit
            const remaining = 5000 - text.length;
            if (remaining < 200) {
                charCount.parentElement.style.color = '#ef4444';
            } else if (remaining < 500) {
                charCount.parentElement.style.color = '#f59e0b';
            } else {
                charCount.parentElement.style.color = '#6b7280';
            }
        };
        
        textarea.addEventListener('input', updateCounts);
        
        // Auto-save functionality
        let saveTimeout;
        textarea.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.autoSaveNotes(meeting.id, textarea.value);
            }, 2000); // Auto-save after 2 seconds of no typing
        });

        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            this.handleNotesKeyboardShortcuts(e, textarea);
        });

        // Focus on textarea
        setTimeout(() => {
            textarea.focus();
            // Place cursor at end
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 100);
        
        // Initial count update
        updateCounts();
    }

    /**
     * Handle keyboard shortcuts in notes textarea
     */
    static handleNotesKeyboardShortcuts(e, textarea) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    document.querySelector('.notes-actions .btn-primary').click();
                    break;
                case 'b':
                    e.preventDefault();
                    this.insertFormatting('bullet');
                    break;
                case 'l':
                    e.preventDefault();
                    this.insertFormatting('number');
                    break;
                case 't':
                    e.preventDefault();
                    this.insertFormatting('checkbox');
                    break;
            }
        }
    }

    /**
     * Count words in text
     */
    static countWords(text) {
        return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
    }

    /**
     * Apply template to notes
     */
    static applyTemplate(templateType) {
        const textarea = document.getElementById('meetingNotesText');
        const meeting = this.meetings.find(m => m.id === this.currentEditingId);
        
        let template = '';
        const timestamp = new Date().toLocaleString();
        
        switch (templateType) {
            case 'agenda':
                template = `📋 MEETING AGENDA
Date: ${new Date().toLocaleDateString()}
Time: ${meeting ? this.formatTime(meeting.time) : ''}
${meeting?.attendees ? `Attendees: ${meeting.attendees}` : ''}

🎯 OBJECTIVES:
• [Objective 1]
• [Objective 2]

📝 AGENDA ITEMS:
1. Welcome & Introductions
2. Review Previous Action Items
3. [Main Topic 1]
4. [Main Topic 2]
5. Next Steps & Action Items
6. Next Meeting Date

⏰ ESTIMATED DURATION: [X minutes]

`;
                break;
                
            case 'minutes':
                template = `📄 MEETING MINUTES
Date: ${new Date().toLocaleDateString()}
${meeting?.attendees ? `Attendees: ${meeting.attendees}` : ''}

📋 AGENDA REVIEW:
• [Item discussed]

🔑 KEY DISCUSSIONS:
• [Discussion point 1]
• [Discussion point 2]

🎯 DECISIONS MADE:
• [Decision 1]
• [Decision 2]

✅ ACTION ITEMS:
☐ [Action item] - [Owner] - [Due date]
☐ [Action item] - [Owner] - [Due date]

📅 NEXT MEETING: [Date/Time]

`;
                break;
                
            case 'action-items':
                template = `✅ ACTION ITEMS - ${new Date().toLocaleDateString()}

🔥 HIGH PRIORITY:
☐ [Task] - [Owner] - [Due: Date]
☐ [Task] - [Owner] - [Due: Date]

📋 MEDIUM PRIORITY:
☐ [Task] - [Owner] - [Due: Date]
☐ [Task] - [Owner] - [Due: Date]

📝 LOW PRIORITY:
☐ [Task] - [Owner] - [Due: Date]

📞 FOLLOW-UP REQUIRED:
☐ [Follow-up item] - [Owner] - [Due: Date]

`;
                break;
                
            case 'decisions':
                template = `🎯 MEETING DECISIONS - ${new Date().toLocaleDateString()}

✅ DECISIONS MADE:
• [Decision 1] - [Context/Reasoning]
• [Decision 2] - [Context/Reasoning]

⏸️ DEFERRED DECISIONS:
• [Item] - [Reason for deferring] - [Next review date]

🔄 NEXT STEPS:
1. [Step 1] - [Owner] - [Timeline]
2. [Step 2] - [Owner] - [Timeline]

📊 IMPACT ASSESSMENT:
• [Decision] → [Expected impact/outcome]

`;
                break;
        }
        
        // Insert template at current cursor position or replace selection
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;
        
        if (start === 0 && end === 0 && currentValue.trim() === '') {
            // Empty textarea, replace all
            textarea.value = template;
        } else {
            // Insert at cursor position
            textarea.value = currentValue.substring(0, start) + template + currentValue.substring(end);
        }
        
        // Update cursor position
        textarea.focus();
        textarea.setSelectionRange(start + template.length, start + template.length);
        
        // Trigger input event to update counters
        textarea.dispatchEvent(new Event('input'));
    }

    /**
     * Insert formatting at cursor position
     */
    static insertFormatting(formatType) {
        const textarea = document.getElementById('meetingNotesText');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let insertText = '';
        let cursorOffset = 0;
        
        switch (formatType) {
            case 'bullet':
                insertText = `• ${selectedText}`;
                cursorOffset = selectedText ? insertText.length : 2;
                break;
            case 'number':
                insertText = `1. ${selectedText}`;
                cursorOffset = selectedText ? insertText.length : 3;
                break;
            case 'checkbox':
                insertText = `☐ ${selectedText}`;
                cursorOffset = selectedText ? insertText.length : 2;
                break;
            case 'separator':
                insertText = '\n─────────────────────────────────────────\n';
                cursorOffset = insertText.length;
                break;
        }
        
        // Insert the formatting
        textarea.value = textarea.value.substring(0, start) + insertText + textarea.value.substring(end);
        
        // Update cursor position
        textarea.focus();
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        
        // Trigger input event to update counters
        textarea.dispatchEvent(new Event('input'));
    }

    /**
     * Toggle notes preview
     */
    static togglePreview(showPreview) {
        const textarea = document.getElementById('meetingNotesText');
        const preview = document.getElementById('notesPreview');
        const previewContent = document.getElementById('previewContent');
        
        if (showPreview) {
            // Convert notes to HTML preview
            const notesText = textarea.value;
            const htmlContent = this.convertNotesToHTML(notesText);
            previewContent.innerHTML = htmlContent;
            
            textarea.classList.add('hidden');
            preview.classList.remove('hidden');
        } else {
            textarea.classList.remove('hidden');
            preview.classList.add('hidden');
            textarea.focus();
        }
    }

    /**
     * Convert notes text to HTML for preview
     */
    static convertNotesToHTML(text) {
        if (!text) return '<p class="empty-preview">No notes yet...</p>';
        
        // Split into lines and process each
        const lines = text.split('\n');
        let html = '';
        let inList = false;
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            if (trimmedLine === '') {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += '<br>';
                return;
            }
            
            // Headers (lines starting with emojis or all caps)
            if (/^[🎯📋📄✅📝🔑⏰📅📊🔥📞⏸️🔄]+\s*[A-Z\s:]+/.test(trimmedLine)) {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += `<h4 class="preview-header">${trimmedLine}</h4>`;
            }
            // Bullet points
            else if (trimmedLine.startsWith('•')) {
                if (!inList) {
                    html += '<ul class="preview-list">';
                    inList = true;
                }
                html += `<li>${trimmedLine.substring(1).trim()}</li>`;
            }
            // Numbered lists
            else if (/^\d+\.\s/.test(trimmedLine)) {
                if (inList) {
                    html += '</ul>';
                }
                html += '<ol class="preview-numbered">';
                html += `<li>${trimmedLine.replace(/^\d+\.\s/, '')}</li>`;
                html += '</ol>';
                inList = false;
            }
            // Checkboxes
            else if (trimmedLine.startsWith('☐') || trimmedLine.startsWith('✅')) {
                if (!inList) {
                    html += '<ul class="preview-checklist">';
                    inList = true;
                }
                const isChecked = trimmedLine.startsWith('✅');
                const text = trimmedLine.substring(1).trim();
                html += `<li class="checkbox-item ${isChecked ? 'checked' : ''}">
                    <span class="checkbox">${isChecked ? '✅' : '☐'}</span>
                    <span class="checkbox-text">${text}</span>
                </li>`;
            }
            // Separators
            else if (trimmedLine.match(/^─+$/)) {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += '<hr class="preview-separator">';
            }
            // Regular paragraphs
            else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += `<p class="preview-paragraph">${trimmedLine}</p>`;
            }
        });
        
        if (inList) {
            html += '</ul>';
        }
        
        return html || '<p class="empty-preview">No content to preview</p>';
    }

    /**
     * Auto-save notes (silent save)
     */
    static async autoSaveNotes(id, notes) {
        try {
            const meeting = this.meetings.find(m => m.id === id);
            if (!meeting) return;
            
            meeting.notes = notes;
            meeting.updatedAt = new Date().toISOString();
            
            await StorageManager.saveToStore('meetings', meeting);
            
            // Update the meeting in our local array
            const index = this.meetings.findIndex(m => m.id === id);
            if (index !== -1) {
                this.meetings[index] = meeting;
            }
            
            console.log('Notes auto-saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    /**
     * Clear notes with confirmation
     */
    static clearNotes(id) {
        const confirmMessage = 'Are you sure you want to clear all notes? This action cannot be undone.';
        if (confirm(confirmMessage)) {
            const textarea = document.getElementById('meetingNotesText');
            textarea.value = '';
            textarea.focus();
            textarea.dispatchEvent(new Event('input'));
        }
    }

    /**
     * Export notes to text file
     */
    static exportNotes(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting || !meeting.notes) {
            alert('No notes to export');
            return;
        }
        
        const content = `MEETING NOTES
═══════════════════════════════════════════
Title: ${meeting.title}
Date: ${this.formatDateLabel(meeting.date)}
Time: ${this.formatTime(meeting.time)}
${meeting.attendees ? `Attendees: ${meeting.attendees}` : ''}
Generated: ${new Date().toLocaleString()}

NOTES:
${meeting.notes}

═══════════════════════════════════════════
Generated by Daily Work Tracker`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `meeting-notes-${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${meeting.date}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Save meeting notes
     */
    static async saveNotes(id) {
        try {
            const notesText = document.getElementById('meetingNotesText').value.trim();
            const meeting = this.meetings.find(m => m.id === id);
            
            if (!meeting) return;

            meeting.notes = notesText;
            meeting.updatedAt = new Date().toISOString();

            await StorageManager.saveToStore('meetings', meeting);
            await this.refresh();
            this.closeNotesModal();

            console.log('Meeting notes saved successfully');
        } catch (error) {
            console.error('Error saving meeting notes:', error);
            alert('Failed to save notes. Please try again.');
        }
    }

    /**
     * Delete meeting
     */
    static async deleteMeeting(id) {
        const meeting = this.meetings.find(m => m.id === id);
        if (!meeting) return;

        const confirmMessage = `Are you sure you want to delete this meeting?\n\n"${meeting.title}"\n${this.formatDateLabel(meeting.date)} at ${this.formatTime(meeting.time)}\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;

        try {
            await StorageManager.deleteFromStore('meetings', id);
            await this.refresh();
            console.log('Meeting deleted successfully');
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Failed to delete meeting. Please try again.');
        }
    }

    /**
     * Refresh meetings data and UI
     */
    static async refresh() {
        await this.loadMeetings();
        this.updateMeetingStatuses();
        this.renderMeetings();
    }

    /**
     * Close meeting modal
     */
    static closeModal() {
        const modal = document.querySelector('.modal-backdrop');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentElement) {
                    modal.remove();
                }
            }, 300);
        }
        this.currentEditingId = null;
    }

    /**
     * Close notes modal
     */
    static closeNotesModal() {
        if (this.notesModal) {
            this.notesModal.remove();
            this.notesModal = null;
        }
    }

    /**
     * Close all modals
     */
    static closeAllModals() {
        this.closeModal();
        this.closeNotesModal();
    }

    /**
     * Get meeting statistics
     */
    static getStatistics() {
        const today = new Date().toISOString().split('T')[0];
        const todayMeetings = this.meetings.filter(m => m.date === today);
        
        return {
            total: this.meetings.length,
            today: todayMeetings.length,
            completed: this.meetings.filter(m => m.completed).length,
            overdue: this.meetings.filter(m => m.status === 'overdue').length,
            upcoming: this.meetings.filter(m => !m.completed && m.status !== 'overdue').length
        };
    }

    // ===== ENHANCED DATA STORAGE FEATURES =====

    /**
     * Search meetings by criteria
     */
    static async searchMeetings(criteria) {
        try {
            let allMeetings = await StorageManager.getAllFromStore('meetings') || [];
            
            // Apply search filters
            if (criteria.searchText) {
                const searchLower = criteria.searchText.toLowerCase();
                allMeetings = allMeetings.filter(meeting => 
                    meeting.title.toLowerCase().includes(searchLower) ||
                    (meeting.notes && meeting.notes.toLowerCase().includes(searchLower)) ||
                    (meeting.attendees && meeting.attendees.toLowerCase().includes(searchLower))
                );
            }
            
            if (criteria.dateRange) {
                const { startDate, endDate } = criteria.dateRange;
                allMeetings = allMeetings.filter(meeting => 
                    meeting.date >= startDate && meeting.date <= endDate
                );
            }
            
            if (criteria.completed !== undefined) {
                allMeetings = allMeetings.filter(meeting => 
                    meeting.completed === criteria.completed
                );
            }
            
            if (criteria.hasNotes !== undefined) {
                allMeetings = allMeetings.filter(meeting => 
                    criteria.hasNotes ? (meeting.notes && meeting.notes.trim().length > 0) : 
                                       (!meeting.notes || meeting.notes.trim().length === 0)
                );
            }
            
            // Sort results
            return allMeetings.sort((a, b) => {
                if (a.date !== b.date) {
                    return new Date(b.date) - new Date(a.date); // Most recent first
                }
                return b.time.localeCompare(a.time);
            });
            
        } catch (error) {
            console.error('Error searching meetings:', error);
            return [];
        }
    }

    /**
     * Get meeting history with analytics
     */
    static async getMeetingHistory(days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const meetings = await this.searchMeetings({
                dateRange: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                }
            });
            
            // Generate analytics
            const analytics = {
                totalMeetings: meetings.length,
                completedMeetings: meetings.filter(m => m.completed).length,
                averageMeetingsPerDay: meetings.length / days,
                meetingsWithNotes: meetings.filter(m => m.notes && m.notes.trim().length > 0).length,
                dailyBreakdown: {},
                weeklyStats: this.generateWeeklyStats(meetings),
                attendeesFrequency: this.generateAttendeesFrequency(meetings),
                commonTimeSlots: this.getCommonTimeSlots(meetings)
            };
            
            // Daily breakdown
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateString = date.toISOString().split('T')[0];
                
                const dayMeetings = meetings.filter(m => m.date === dateString);
                analytics.dailyBreakdown[dateString] = {
                    total: dayMeetings.length,
                    completed: dayMeetings.filter(m => m.completed).length,
                    withNotes: dayMeetings.filter(m => m.notes && m.notes.trim().length > 0).length
                };
            }
            
            return {
                meetings,
                analytics,
                period: { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] }
            };
            
        } catch (error) {
            console.error('Error getting meeting history:', error);
            return { meetings: [], analytics: {}, period: {} };
        }
    }

    /**
     * Generate weekly statistics
     */
    static generateWeeklyStats(meetings) {
        const weeklyStats = {
            Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0,
            Friday: 0, Saturday: 0, Sunday: 0
        };
        
        meetings.forEach(meeting => {
            const date = new Date(meeting.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            weeklyStats[dayName] = (weeklyStats[dayName] || 0) + 1;
        });
        
        return weeklyStats;
    }

    /**
     * Generate attendees frequency analysis
     */
    static generateAttendeesFrequency(meetings) {
        const frequency = {};
        
        meetings.forEach(meeting => {
            if (meeting.attendees) {
                const attendeesList = meeting.attendees.split(',').map(a => a.trim()).filter(a => a.length > 0);
                attendeesList.forEach(attendee => {
                    frequency[attendee] = (frequency[attendee] || 0) + 1;
                });
            }
        });
        
        // Sort by frequency
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10) // Top 10
            .map(([name, count]) => ({ name, count }));
    }

    /**
     * Get common time slots
     */
    static getCommonTimeSlots(meetings) {
        const timeSlots = {};
        
        meetings.forEach(meeting => {
            const hour = parseInt(meeting.time.split(':')[0]);
            const timeSlot = this.getTimeSlotLabel(hour);
            timeSlots[timeSlot] = (timeSlots[timeSlot] || 0) + 1;
        });
        
        return Object.entries(timeSlots)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([slot, count]) => ({ slot, count }));
    }

    /**
     * Get time slot label
     */
    static getTimeSlotLabel(hour) {
        if (hour >= 6 && hour < 9) return 'Early Morning (6-9 AM)';
        if (hour >= 9 && hour < 12) return 'Morning (9 AM-12 PM)';
        if (hour >= 12 && hour < 15) return 'Afternoon (12-3 PM)';
        if (hour >= 15 && hour < 18) return 'Late Afternoon (3-6 PM)';
        if (hour >= 18 && hour < 21) return 'Evening (6-9 PM)';
        return 'Other Times';
    }

    /**
     * Create meeting templates
     */
    static getMeetingTemplates() {
        return {
            'standup': {
                title: 'Daily Standup',
                duration: 15,
                attendees: 'Team Members',
                agenda: `📋 DAILY STANDUP AGENDA

🎯 QUICK UPDATES:
• What did you accomplish yesterday?
• What are you working on today?
• Any blockers or challenges?

⚠️ BLOCKERS & IMPEDIMENTS:
• [List any blockers]

📅 UPCOMING ITEMS:
• [Any important deadlines or events]

⏰ MEETING DURATION: 15 minutes max`
            },
            'sprint-planning': {
                title: 'Sprint Planning',
                duration: 120,
                attendees: 'Development Team, Product Owner, Scrum Master',
                agenda: `📋 SPRINT PLANNING AGENDA

🎯 SPRINT GOAL:
• [Define the sprint goal]

📊 CAPACITY PLANNING:
• Team availability
• Estimated velocity

📝 BACKLOG REVIEW:
• Priority items from product backlog
• Story point estimation
• Acceptance criteria review

✅ SPRINT COMMITMENT:
• Selected user stories
• Task breakdown
• Definition of done

⏰ ESTIMATED DURATION: 2 hours`
            },
            'retrospective': {
                title: 'Sprint Retrospective',
                duration: 60,
                attendees: 'Development Team, Scrum Master',
                agenda: `📋 RETROSPECTIVE AGENDA

✅ WHAT WENT WELL:
• [Successful practices and achievements]

❌ WHAT DIDN'T GO WELL:
• [Challenges and problems]

💡 IMPROVEMENT IDEAS:
• [Suggestions for next sprint]

🎯 ACTION ITEMS:
☐ [Action item 1] - [Owner] - [Due date]
☐ [Action item 2] - [Owner] - [Due date]

⏰ ESTIMATED DURATION: 1 hour`
            },
            'client-meeting': {
                title: 'Client Meeting',
                duration: 60,
                attendees: 'Client Representatives, Project Team',
                agenda: `📋 CLIENT MEETING AGENDA

👥 ATTENDEES:
• [Client contacts]
• [Internal team members]

📊 PROJECT STATUS:
• Current progress update
• Milestones achieved
• Upcoming deliverables

💬 DISCUSSION POINTS:
• [Key topics to discuss]
• [Questions or concerns]

🎯 DECISIONS NEEDED:
• [Items requiring client approval]

📅 NEXT STEPS:
• [Action items and timeline]

⏰ ESTIMATED DURATION: 1 hour`
            },
            'one-on-one': {
                title: '1:1 Meeting',
                duration: 30,
                attendees: 'Manager, Team Member',
                agenda: `📋 ONE-ON-ONE AGENDA

🎯 CURRENT WORK:
• Progress on current projects
• Challenges or roadblocks
• Support needed

💼 CAREER DEVELOPMENT:
• Goals and aspirations
• Skill development opportunities
• Performance feedback

💡 IDEAS & FEEDBACK:
• Process improvements
• Team dynamics
• Suggestions

📝 ACTION ITEMS:
☐ [Follow-up item 1]
☐ [Follow-up item 2]

⏰ ESTIMATED DURATION: 30 minutes`
            }
        };
    }

    /**
     * Apply meeting template
     */
    static applyMeetingTemplate(templateKey) {
        const templates = this.getMeetingTemplates();
        const template = templates[templateKey];
        
        if (!template) return;
        
        // Fill form with template data
        const titleInput = document.getElementById('meetingTitle');
        const attendeesInput = document.getElementById('meetingAttendees');
        const notesInput = document.getElementById('meetingNotes');
        
        if (titleInput) titleInput.value = template.title;
        if (attendeesInput) attendeesInput.value = template.attendees;
        if (notesInput) notesInput.value = template.agenda;
        
        // Trigger input events to update any listeners
        [titleInput, attendeesInput, notesInput].forEach(input => {
            if (input) input.dispatchEvent(new Event('input'));
        });
    }

    /**
     * Show advanced search modal
     */
    static showSearchModal() {
        const modalHTML = `
            <div class="modal-backdrop active" onclick="if(event.target === this) MeetingsManager.closeModal()">
                <div class="modal search-modal">
                    <div class="modal-header">
                        <h3>🔍 Advanced Meeting Search</h3>
                        <button class="modal-close" onclick="MeetingsManager.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="searchForm" class="search-form">
                            <div class="form-group">
                                <label for="searchText">Search Text</label>
                                <input type="text" id="searchText" placeholder="Search in titles, notes, or attendees...">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="startDate">Start Date</label>
                                    <input type="date" id="startDate">
                                </div>
                                <div class="form-group">
                                    <label for="endDate">End Date</label>
                                    <input type="date" id="endDate">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="completionFilter">Completion Status</label>
                                    <select id="completionFilter">
                                        <option value="">All Meetings</option>
                                        <option value="completed">Completed Only</option>
                                        <option value="pending">Pending Only</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="notesFilter">Notes Status</label>
                                    <select id="notesFilter">
                                        <option value="">All Meetings</option>
                                        <option value="with-notes">With Notes</option>
                                        <option value="no-notes">Without Notes</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="search-actions">
                                <button type="button" class="btn btn-secondary" onclick="MeetingsManager.clearSearch()">
                                    Clear
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    🔍 Search
                                </button>
                            </div>
                        </form>
                        
                        <div id="searchResults" class="search-results hidden">
                            <div class="results-header">
                                <h4>Search Results</h4>
                                <span id="resultsCount" class="results-count"></span>
                            </div>
                            <div id="resultsList" class="results-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing modal
        const existingModal = document.querySelector('.modal-backdrop');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        document.body.appendChild(modalElement.firstElementChild);
        
        // Set up form submission
        const form = document.getElementById('searchForm');
        form.addEventListener('submit', (e) => this.handleSearch(e));
        
        // Set default date range (last 30 days)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate;
    }

    /**
     * Handle search form submission
     */
    static async handleSearch(e) {
        e.preventDefault();
        
        const searchText = document.getElementById('searchText').value.trim();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const completionFilter = document.getElementById('completionFilter').value;
        const notesFilter = document.getElementById('notesFilter').value;
        
        const criteria = {};
        
        if (searchText) criteria.searchText = searchText;
        if (startDate && endDate) {
            criteria.dateRange = { startDate, endDate };
        }
        if (completionFilter) {
            criteria.completed = completionFilter === 'completed';
        }
        if (notesFilter) {
            criteria.hasNotes = notesFilter === 'with-notes';
        }
        
        const results = await this.searchMeetings(criteria);
        this.displaySearchResults(results);
    }

    /**
     * Display search results
     */
    static displaySearchResults(results) {
        const resultsDiv = document.getElementById('searchResults');
        const countSpan = document.getElementById('resultsCount');
        const listDiv = document.getElementById('resultsList');
        
        countSpan.textContent = `${results.length} meetings found`;
        resultsDiv.classList.remove('hidden');
        
        if (results.length === 0) {
            listDiv.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">No meetings found matching your criteria</div>
                </div>
            `;
            return;
        }
        
        let html = '';
        results.forEach(meeting => {
            const hasNotes = meeting.notes && meeting.notes.trim().length > 0;
            const notesPreview = hasNotes ? meeting.notes.substring(0, 100) + '...' : 'No notes';
            
            html += `
                <div class="search-result-item" data-id="${meeting.id}">
                    <div class="result-header">
                        <div class="result-title">${meeting.title}</div>
                        <div class="result-date">${this.formatDateLabel(meeting.date)} at ${this.formatTime(meeting.time)}</div>
                    </div>
                    <div class="result-content">
                        ${meeting.attendees ? `<div class="result-attendees">👥 ${meeting.attendees}</div>` : ''}
                        <div class="result-notes">${notesPreview}</div>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-small" onclick="MeetingsManager.openMeetingFromSearch('${meeting.id}')">
                            👁️ View
                        </button>
                        <button class="btn btn-small" onclick="MeetingsManager.editMeetingFromSearch('${meeting.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-small" onclick="MeetingsManager.showNotesModalFromSearch('${meeting.id}')">
                            📝 Notes
                        </button>
                    </div>
                </div>
            `;
        });
        
        listDiv.innerHTML = html;
    }

    /**
     * Clear search form
     */
    static clearSearch() {
        document.getElementById('searchText').value = '';
        document.getElementById('completionFilter').value = '';
        document.getElementById('notesFilter').value = '';
        
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.classList.add('hidden');
    }

    /**
     * Open meeting from search results
     */
    static openMeetingFromSearch(id) {
        this.closeModal();
        // Navigate to meetings section and highlight the meeting
        if (window.app) {
            window.app.navigateToSection('meetings');
        }
        // Highlight the meeting item
        setTimeout(() => {
            const meetingItem = document.querySelector(`[data-id="${id}"]`);
            if (meetingItem) {
                meetingItem.scrollIntoView({ behavior: 'smooth' });
                meetingItem.style.backgroundColor = '#fef3c7';
                setTimeout(() => {
                    meetingItem.style.backgroundColor = '';
                }, 2000);
            }
        }, 500);
    }

    /**
     * Edit meeting from search results
     */
    static editMeetingFromSearch(id) {
        this.closeModal();
        this.editMeeting(id);
    }

    /**
     * Show notes modal from search results
     */
    static showNotesModalFromSearch(id) {
        this.closeModal();
        this.showNotesModal(id);
    }

    /**
     * Show meeting analytics modal
     */
    static async showAnalyticsModal() {
        const history = await this.getMeetingHistory(30);
        const { analytics } = history;
        
        const modalHTML = `
            <div class="modal-backdrop active" onclick="if(event.target === this) MeetingsManager.closeModal()">
                <div class="modal analytics-modal">
                    <div class="modal-header">
                        <h3>📊 Meeting Analytics (Last 30 Days)</h3>
                        <button class="modal-close" onclick="MeetingsManager.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Summary Stats -->
                        <div class="analytics-section">
                            <h4>📈 Summary Statistics</h4>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value">${analytics.totalMeetings}</div>
                                    <div class="stat-label">Total Meetings</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${analytics.completedMeetings}</div>
                                    <div class="stat-label">Completed</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${analytics.meetingsWithNotes}</div>
                                    <div class="stat-label">With Notes</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${analytics.averageMeetingsPerDay.toFixed(1)}</div>
                                    <div class="stat-label">Avg/Day</div>
                                </div>
                            </div>
                        </div>

                        <!-- Weekly Breakdown -->
                        <div class="analytics-section">
                            <h4>📅 Weekly Distribution</h4>
                            <div class="weekly-chart">
                                ${Object.entries(analytics.weeklyStats).map(([day, count]) => `
                                    <div class="day-stat">
                                        <div class="day-bar" style="height: ${Math.max(20, (count / Math.max(...Object.values(analytics.weeklyStats))) * 100)}px"></div>
                                        <div class="day-label">${day.substring(0, 3)}</div>
                                        <div class="day-count">${count}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Common Time Slots -->
                        <div class="analytics-section">
                            <h4>⏰ Popular Time Slots</h4>
                            <div class="time-slots">
                                ${analytics.commonTimeSlots.map(({ slot, count }) => `
                                    <div class="time-slot-item">
                                        <div class="slot-name">${slot}</div>
                                        <div class="slot-bar">
                                            <div class="slot-fill" style="width: ${(count / analytics.commonTimeSlots[0].count) * 100}%"></div>
                                        </div>
                                        <div class="slot-count">${count} meetings</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Frequent Attendees -->
                        ${analytics.attendeesFrequency.length > 0 ? `
                        <div class="analytics-section">
                            <h4>👥 Frequent Attendees</h4>
                            <div class="attendees-list">
                                ${analytics.attendeesFrequency.map(({ name, count }) => `
                                    <div class="attendee-item">
                                        <div class="attendee-name">${name}</div>
                                        <div class="attendee-count">${count} meetings</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="MeetingsManager.exportAnalytics()">
                            📤 Export Report
                        </button>
                        <button class="btn btn-secondary" onclick="MeetingsManager.closeModal()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing modal
        const existingModal = document.querySelector('.modal-backdrop');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        document.body.appendChild(modalElement.firstElementChild);
    }

    /**
     * Export analytics report
     */
    static async exportAnalytics() {
        try {
            const history = await this.getMeetingHistory(30);
            const { analytics } = history;
            
            const report = `MEETING ANALYTICS REPORT
═══════════════════════════════════════════
Period: Last 30 Days
Generated: ${new Date().toLocaleString()}

SUMMARY STATISTICS:
────────────────────
Total Meetings: ${analytics.totalMeetings}
Completed Meetings: ${analytics.completedMeetings} (${((analytics.completedMeetings / analytics.totalMeetings) * 100).toFixed(1)}%)
Meetings with Notes: ${analytics.meetingsWithNotes} (${((analytics.meetingsWithNotes / analytics.totalMeetings) * 100).toFixed(1)}%)
Average per Day: ${analytics.averageMeetingsPerDay.toFixed(1)}

WEEKLY DISTRIBUTION:
────────────────────
${Object.entries(analytics.weeklyStats).map(([day, count]) => 
    `${day}: ${count} meetings`
).join('\n')}

POPULAR TIME SLOTS:
───────────────────
${analytics.commonTimeSlots.map(({ slot, count }) => 
    `${slot}: ${count} meetings`
).join('\n')}

${analytics.attendeesFrequency.length > 0 ? `
FREQUENT ATTENDEES:
───────────────────
${analytics.attendeesFrequency.map(({ name, count }) => 
    `${name}: ${count} meetings`
).join('\n')}
` : ''}

═══════════════════════════════════════════
Generated by Daily Work Tracker - Meeting Analytics`;
            
            const blob = new Blob([report], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `meeting-analytics-${new Date().toISOString().split('T')[0]}.txt`;
            link.click();
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting analytics:', error);
            alert('Failed to export analytics report');
        }
    }

    /**
     * Setup recurring meetings (future enhancement placeholder)
     */
    static showRecurringMeetingSetup() {
        // Placeholder for recurring meeting functionality
        alert('Recurring meetings feature will be available in a future update.');
    }
}

// Make MeetingsManager available immediately
window.MeetingsManager = MeetingsManager;

// Don't auto-initialize - let main.js handle initialization
console.log('MeetingsManager class loaded and available');
