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
            await this.loadMeetings();
            this.setupEventListeners();
            this.renderMeetings();
            
            // Start auto-refresh for time updates
            this.startTimeUpdateInterval();
            
            console.log('Meetings Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Meetings Manager:', error);
        }
    }

    /**
     * Load meetings from storage
     */
    static async loadMeetings() {
        try {
            const today = DailyResetManager.getCurrentDateString();
            
            // Load today's meetings
            const todayMeetings = await StorageManager.getAllFromStore('meetings', 'date', today) || [];
            
            // Load upcoming meetings (next 3 days)
            const upcomingMeetings = [];
            for (let i = 1; i <= 3; i++) {
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
        const addMeetingBtn = document.getElementById('addMeeting');
        if (addMeetingBtn) {
            addMeetingBtn.addEventListener('click', () => this.showAddMeetingModal());
        }

        // Handle escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
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
            <div class="modal-backdrop active">
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
                                <textarea id="meetingNotes" placeholder="Add meeting agenda, notes, or reminders..." 
                                          rows="4" maxlength="1000">${meeting.notes || ''}</textarea>
                                <small class="form-help">You can also add/edit notes after the meeting</small>
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

        const container = document.getElementById('modalContainer');
        container.innerHTML = modalHTML;

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
        if (validation.length > 0) {
            alert('Please fix the following errors:\n' + validation.join('\n'));
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
            <div class="modal-backdrop active">
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

        const container = document.getElementById('modalContainer');
        container.innerHTML = modalHTML;

        this.setupNotesModal(meeting);
        
        this.notesModal = container.querySelector('.modal-backdrop');
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
        const container = document.getElementById('modalContainer');
        container.innerHTML = '';
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
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MeetingsManager.init());
} else {
    MeetingsManager.init();
}

// Export for use in other modules
window.MeetingsManager = MeetingsManager;