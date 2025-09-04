/**
 * Journal Formatter - Daily Work Tracker
 * Simple, clean text formatting for daily journal export
 */

class JournalFormatter {
    constructor() {
        // Simple formatter focused on clean text output
    }

    /**
     * Format journal data in clean, simple text format
     */
    async formatJournal(data, options = {}) {
        try {
            const content = this.generateSimpleJournal(data);
            
            return {
                content: content,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    format: 'simple-text'
                }
            };

        } catch (error) {
            console.error('Journal formatting error:', error);
            throw new Error(`Failed to format journal: ${error.message}`);
        }
    }

    /**
     * Generate simple journal format matching user requirements
     */
    generateSimpleJournal(data) {
        let output = '';
        
        // Date header - simple format like "2-9-2025"
        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        output += `Date: ${dateStr}\n`;
        
        // Daily Checklist - show all items with completion status
        if (data.checklist && data.checklist.items && data.checklist.items.length > 0) {
            output += `Daily Checklist:\n`;
            data.checklist.items.forEach(item => {
                const status = item.completed ? '[x]' : '[ ]';
                output += `${status} ${item.text}\n`;
            });
        }
        
        // Today - ToDos - only show completed todos (ignore uncompleted as requested)
        const completedTodos = data.todos ? data.todos.filter(todo => todo.completed) : [];
        if (completedTodos.length > 0) {
            output += `Today - ToDos:\n`;
            completedTodos.forEach(todo => {
                output += `[x] ${todo.text}\n`;
            });
        }
        
        // Meetings - only show completed meetings with notes
        const completedMeetings = data.meetings ? data.meetings.filter(meeting => meeting.completed && meeting.notes) : [];
        if (completedMeetings.length > 0) {
            output += `Meetings:\n`;
            completedMeetings.forEach(meeting => {
                output += `${meeting.time} ${meeting.title}\n`;
                if (meeting.notes) {
                    output += `Meeting notes:\n`;
                    // Split notes into lines and prefix with dash
                    const noteLines = meeting.notes.split('\n');
                    noteLines.forEach(line => {
                        if (line.trim()) {
                            output += `- ${line.trim()}\n`;
                        }
                    });
                }
            });
        }
        
        return output;
    }

    /**
     * Simple date formatting
     */
    formatDate(date, format = 'simple') {
        if (!date) return 'Not set';
        
        const dateObj = new Date(date);
        
        if (format === 'simple') {
            return `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;
        }
        
        return dateObj.toLocaleDateString();
    }
}


// Initialize the journal formatter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.journalFormatter = new JournalFormatter();
});