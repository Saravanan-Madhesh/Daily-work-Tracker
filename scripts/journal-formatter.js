/**
 * Journal Formatter - Daily Work Tracker
 * 
 * Advanced journal formatting system with multiple templates and customization options.
 * Handles structured data export with enhanced formatting, template system, 
 * and timezone handling for comprehensive journal generation.
 * 
 * Features:
 * - Multiple journal templates (Daily, Weekly, Project-focused, Executive)
 * - Advanced date formatting with timezone support
 * - Custom export format configurations
 * - Template-based export system
 * - Rich formatting options (Markdown, HTML, Plain text)
 * - Data aggregation and insights
 */

class JournalFormatter {
    constructor() {
        this.templates = {
            daily: new DailyJournalTemplate(),
            weekly: new WeeklyJournalTemplate(),
            project: new ProjectJournalTemplate(),
            executive: new ExecutiveJournalTemplate(),
            detailed: new DetailedJournalTemplate()
        };
        
        this.formatters = {
            text: new TextFormatter(),
            markdown: new MarkdownFormatter(),
            html: new HTMLFormatter(),
            json: new JSONFormatter(),
            csv: new CSVFormatter()
        };

        this.dateFormats = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            iso: 'iso',
            relative: 'relative'
        };
    }

    /**
     * Format journal data using specified template and format
     */
    async formatJournal(data, options = {}) {
        const {
            template = 'daily',
            format = 'text',
            dateFormat = 'long',
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
            includeInsights = true,
            customOptions = {}
        } = options;

        try {
            // Get template and formatter
            const templateInstance = this.templates[template];
            const formatterInstance = this.formatters[format];

            if (!templateInstance) {
                throw new Error(`Template '${template}' not found`);
            }
            if (!formatterInstance) {
                throw new Error(`Formatter '${format}' not found`);
            }

            // Prepare data with formatting context
            const formattingContext = {
                dateFormat,
                timezone,
                includeInsights,
                template,
                format,
                ...customOptions
            };

            // Process data through template
            const structuredData = await templateInstance.process(data, formattingContext);

            // Format using specified formatter
            const formattedContent = await formatterInstance.format(structuredData, formattingContext);

            return {
                content: formattedContent,
                metadata: {
                    template,
                    format,
                    generatedAt: new Date().toISOString(),
                    timezone,
                    dataRange: data.exportInfo?.dateRange,
                    itemCount: this.countDataItems(data)
                }
            };

        } catch (error) {
            console.error('Journal formatting error:', error);
            throw new Error(`Failed to format journal: ${error.message}`);
        }
    }

    /**
     * Get available templates
     */
    getAvailableTemplates() {
        return Object.keys(this.templates).map(key => ({
            id: key,
            name: this.templates[key].getName(),
            description: this.templates[key].getDescription(),
            features: this.templates[key].getFeatures()
        }));
    }

    /**
     * Get available formats
     */
    getAvailableFormats() {
        return Object.keys(this.formatters).map(key => ({
            id: key,
            name: this.formatters[key].getName(),
            extension: this.formatters[key].getExtension(),
            mimeType: this.formatters[key].getMimeType()
        }));
    }

    /**
     * Format date with timezone support
     */
    formatDate(date, format = 'long', timezone = null) {
        if (!date) return 'Not set';
        
        const dateObj = new Date(date);
        const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        switch (format) {
            case 'iso':
                return dateObj.toISOString();
            case 'relative':
                return this.getRelativeDate(dateObj);
            case 'short':
                return dateObj.toLocaleDateString(undefined, { ...this.dateFormats.short, timeZone: tz });
            case 'long':
            default:
                return dateObj.toLocaleDateString(undefined, { ...this.dateFormats.long, timeZone: tz });
        }
    }

    /**
     * Get relative date description
     */
    getRelativeDate(date) {
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays === -1) return 'Tomorrow';
        if (diffDays > 1) return `${diffDays} days ago`;
        if (diffDays < -1) return `In ${Math.abs(diffDays)} days`;
        
        return date.toLocaleDateString();
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
     * Generate insights from data
     */
    generateInsights(data, context = {}) {
        const insights = [];
        
        // Productivity insights
        if (data.statistics) {
            if (data.statistics.checklist) {
                const checklistStats = data.statistics.checklist;
                if (checklistStats.averageCompletion >= 80) {
                    insights.push({
                        type: 'success',
                        category: 'productivity',
                        message: `Excellent checklist performance! ${checklistStats.averageCompletion}% average completion rate.`,
                        icon: '🎯'
                    });
                } else if (checklistStats.averageCompletion < 50) {
                    insights.push({
                        type: 'warning',
                        category: 'productivity',
                        message: `Checklist completion could improve. Current rate: ${checklistStats.averageCompletion}%`,
                        icon: '⚠️'
                    });
                }
            }

            if (data.statistics.todos) {
                const todoStats = data.statistics.todos;
                const completionRate = todoStats.total > 0 ? Math.round((todoStats.completed / todoStats.total) * 100) : 0;
                
                if (completionRate >= 75) {
                    insights.push({
                        type: 'success',
                        category: 'tasks',
                        message: `Great task completion rate: ${completionRate}% (${todoStats.completed}/${todoStats.total})`,
                        icon: '✅'
                    });
                } else if (completionRate < 40) {
                    insights.push({
                        type: 'info',
                        category: 'tasks',
                        message: `Consider breaking down larger tasks. Completion rate: ${completionRate}%`,
                        icon: '📋'
                    });
                }

                if (todoStats.highPriority > todoStats.completed) {
                    insights.push({
                        type: 'warning',
                        category: 'priority',
                        message: `${todoStats.highPriority} high-priority tasks need attention.`,
                        icon: '🔥'
                    });
                }
            }

            if (data.statistics.meetings) {
                const meetingStats = data.statistics.meetings;
                if (meetingStats.totalDuration > 480) { // More than 8 hours
                    insights.push({
                        type: 'info',
                        category: 'time-management',
                        message: `Heavy meeting schedule: ${Math.round(meetingStats.totalDuration / 60)} hours total.`,
                        icon: '📅'
                    });
                }
            }
        }

        // Time-based insights
        const now = new Date();
        const dateRange = data.exportInfo?.dateRange;
        if (dateRange) {
            const days = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
            if (days === 1) {
                insights.push({
                    type: 'info',
                    category: 'scope',
                    message: 'Single day report - perfect for daily review and planning.',
                    icon: '📖'
                });
            } else if (days === 7) {
                insights.push({
                    type: 'info',
                    category: 'scope',
                    message: 'Weekly report - ideal for identifying patterns and trends.',
                    icon: '📊'
                });
            } else if (days > 30) {
                insights.push({
                    type: 'info',
                    category: 'scope',
                    message: `Extended period report covering ${days} days - excellent for comprehensive review.`,
                    icon: '📈'
                });
            }
        }

        return insights;
    }
}

/**
 * Base Template Class
 */
class BaseJournalTemplate {
    getName() { return 'Base Template'; }
    getDescription() { return 'Base template class'; }
    getFeatures() { return []; }

    async process(data, context) {
        throw new Error('process method must be implemented by subclass');
    }

    formatSection(title, content, level = 2) {
        return {
            type: 'section',
            level,
            title,
            content
        };
    }

    formatList(items, ordered = false) {
        return {
            type: 'list',
            ordered,
            items
        };
    }

    formatTable(headers, rows) {
        return {
            type: 'table',
            headers,
            rows
        };
    }
}

/**
 * Daily Journal Template
 */
class DailyJournalTemplate extends BaseJournalTemplate {
    getName() { return 'Daily Journal'; }
    getDescription() { return 'Focused daily report with tasks, meetings, and accomplishments'; }
    getFeatures() { return ['Daily focus', 'Task summary', 'Meeting notes', 'Accomplishments']; }

    async process(data, context) {
        const sections = [];
        const dateStr = context.dateFormat === 'iso' ? 
            new Date().toISOString().split('T')[0] : 
            new Date().toLocaleDateString();

        // Header
        sections.push({
            type: 'header',
            level: 1,
            content: `Daily Work Journal - ${dateStr}`
        });

        // Executive Summary
        sections.push(this.createExecutiveSummary(data));

        // Today's Tasks
        if (data.todos && data.todos.length > 0) {
            sections.push(this.createTasksSection(data.todos, 'Today\'s Tasks'));
        }

        // Meetings
        if (data.meetings && data.meetings.length > 0) {
            sections.push(this.createMeetingsSection(data.meetings, 'Today\'s Meetings'));
        }

        // Checklist Progress
        if (data.checklist && data.checklist.history) {
            sections.push(this.createChecklistSection(data.checklist.history));
        }

        // Project Progress
        if (data.roadmap) {
            sections.push(this.createProjectSection(data.roadmap));
        }

        // Insights
        if (context.includeInsights) {
            const insights = new JournalFormatter().generateInsights(data, context);
            if (insights.length > 0) {
                sections.push(this.createInsightsSection(insights));
            }
        }

        return { sections, context };
    }

    createExecutiveSummary(data) {
        const summary = [];
        let totalTasks = 0, completedTasks = 0;
        let totalMeetings = 0, completedMeetings = 0;

        if (data.todos) {
            totalTasks = data.todos.length;
            completedTasks = data.todos.filter(t => t.completed).length;
        }

        if (data.meetings) {
            totalMeetings = data.meetings.length;
            completedMeetings = data.meetings.filter(m => m.completed).length;
        }

        summary.push(`📋 Tasks: ${completedTasks}/${totalTasks} completed`);
        summary.push(`🤝 Meetings: ${completedMeetings}/${totalMeetings} completed`);

        if (data.statistics?.checklist?.averageCompletion) {
            summary.push(`✅ Checklist: ${data.statistics.checklist.averageCompletion}% completion rate`);
        }

        return this.formatSection('Executive Summary', summary);
    }

    createTasksSection(todos, title) {
        const completed = todos.filter(t => t.completed);
        const pending = todos.filter(t => !t.completed);
        const items = [];

        if (completed.length > 0) {
            items.push('**Completed:**');
            completed.forEach(todo => {
                items.push(`✅ ${todo.text} ${todo.priority === 'high' ? '🔥' : ''}`);
            });
            items.push('');
        }

        if (pending.length > 0) {
            items.push('**Pending:**');
            pending.forEach(todo => {
                items.push(`⏳ ${todo.text} ${todo.priority === 'high' ? '🔥' : ''}`);
            });
        }

        return this.formatSection(title, items);
    }

    createMeetingsSection(meetings, title) {
        const items = [];
        
        meetings.forEach(meeting => {
            const status = meeting.completed ? '✅' : '📅';
            items.push(`${status} ${meeting.title} (${meeting.time})`);
            
            if (meeting.attendees && meeting.attendees.length > 0) {
                items.push(`   👥 ${meeting.attendees.join(', ')}`);
            }
            
            if (meeting.notes) {
                const shortNotes = meeting.notes.length > 100 ? 
                    meeting.notes.substring(0, 100) + '...' : 
                    meeting.notes;
                items.push(`   📝 ${shortNotes}`);
            }
            items.push('');
        });

        return this.formatSection(title, items);
    }

    createChecklistSection(checklistHistory) {
        const today = new Date().toISOString().split('T')[0];
        const todayData = checklistHistory[today];
        
        if (!todayData) {
            return this.formatSection('Daily Checklist', ['No checklist data for today']);
        }

        const items = [];
        const completed = todayData.items.filter(item => item.completed).length;
        const total = todayData.items.length;
        const percentage = Math.round((completed / total) * 100);

        items.push(`Progress: ${completed}/${total} items (${percentage}%)`);
        items.push('');

        todayData.items.forEach(item => {
            const status = item.completed ? '✅' : '☐';
            items.push(`${status} ${item.text}`);
        });

        return this.formatSection('Daily Checklist', items);
    }

    createProjectSection(roadmap) {
        const items = [];
        
        if (roadmap.project) {
            items.push(`**Project:** ${roadmap.project.name || 'Untitled'}`);
            items.push(`**Status:** ${roadmap.project.status || 'Unknown'}`);
            
            if (roadmap.project.startDate && roadmap.project.endDate) {
                const start = new Date(roadmap.project.startDate).toLocaleDateString();
                const end = new Date(roadmap.project.endDate).toLocaleDateString();
                items.push(`**Timeline:** ${start} - ${end}`);
            }
            items.push('');
        }

        if (roadmap.milestones && roadmap.milestones.length > 0) {
            items.push('**Recent Milestones:**');
            roadmap.milestones.slice(0, 5).forEach(milestone => {
                const status = milestone.completed ? '✅' : '🎯';
                const date = new Date(milestone.date).toLocaleDateString();
                items.push(`${status} ${milestone.title} (${date})`);
            });
        }

        return this.formatSection('Project Progress', items);
    }

    createInsightsSection(insights) {
        const items = [];
        
        insights.forEach(insight => {
            items.push(`${insight.icon} ${insight.message}`);
        });

        return this.formatSection('Insights & Recommendations', items);
    }
}

/**
 * Weekly Journal Template
 */
class WeeklyJournalTemplate extends BaseJournalTemplate {
    getName() { return 'Weekly Journal'; }
    getDescription() { return 'Comprehensive weekly summary with trends and achievements'; }
    getFeatures() { return ['Weekly overview', 'Trends analysis', 'Achievement highlights', 'Goals review']; }

    async process(data, context) {
        const sections = [];
        const weekRange = this.getWeekRange(data.exportInfo?.dateRange);

        // Header
        sections.push({
            type: 'header',
            level: 1,
            content: `Weekly Work Journal - ${weekRange}`
        });

        // Week Overview
        sections.push(this.createWeekOverview(data));

        // Daily Breakdown
        if (data.checklist?.history) {
            sections.push(this.createDailyBreakdown(data.checklist.history));
        }

        // Accomplishments
        sections.push(this.createAccomplishments(data));

        // Goals and Focus Areas
        sections.push(this.createGoalsSection(data));

        // Weekly Insights
        if (context.includeInsights) {
            const insights = new JournalFormatter().generateInsights(data, context);
            sections.push(this.createInsightsSection(insights));
        }

        return { sections, context };
    }

    getWeekRange(dateRange) {
        if (!dateRange) return 'Week Summary';
        
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end - 1);
        
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }

    createWeekOverview(data) {
        const overview = [];
        
        if (data.statistics) {
            if (data.statistics.todos) {
                const todoStats = data.statistics.todos;
                overview.push(`📋 Tasks: ${todoStats.completed}/${todoStats.total} completed`);
            }
            
            if (data.statistics.meetings) {
                const meetingStats = data.statistics.meetings;
                overview.push(`🤝 Meetings: ${meetingStats.total} total`);
            }
            
            if (data.statistics.checklist) {
                const checklistStats = data.statistics.checklist;
                overview.push(`✅ Checklist: ${checklistStats.averageCompletion}% average completion`);
            }
        }

        return this.formatSection('Week Overview', overview);
    }

    createDailyBreakdown(checklistHistory) {
        const items = [];
        const sortedDates = Object.keys(checklistHistory).sort();

        sortedDates.forEach(date => {
            const dayData = checklistHistory[date];
            const dayName = new Date(date).toLocaleDateString(undefined, { weekday: 'long' });
            const completed = dayData.items.filter(item => item.completed).length;
            const total = dayData.items.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            items.push(`**${dayName} (${new Date(date).toLocaleDateString()}):** ${completed}/${total} (${percentage}%)`);
        });

        return this.formatSection('Daily Progress', items);
    }

    createAccomplishments(data) {
        const accomplishments = [];
        
        if (data.todos) {
            const completedTodos = data.todos.filter(t => t.completed);
            const highPriorityCompleted = completedTodos.filter(t => t.priority === 'high');
            
            if (highPriorityCompleted.length > 0) {
                accomplishments.push('**High Priority Tasks Completed:**');
                highPriorityCompleted.slice(0, 5).forEach(todo => {
                    accomplishments.push(`🎯 ${todo.text}`);
                });
                accomplishments.push('');
            }
        }

        if (data.roadmap?.milestones) {
            const completedMilestones = data.roadmap.milestones.filter(m => m.completed);
            if (completedMilestones.length > 0) {
                accomplishments.push('**Milestones Achieved:**');
                completedMilestones.forEach(milestone => {
                    accomplishments.push(`🏆 ${milestone.title}`);
                });
            }
        }

        return this.formatSection('Key Accomplishments', accomplishments);
    }

    createGoalsSection(data) {
        const goals = [];
        
        if (data.todos) {
            const pendingHigh = data.todos.filter(t => !t.completed && t.priority === 'high');
            if (pendingHigh.length > 0) {
                goals.push('**Priority Focus Areas:**');
                pendingHigh.slice(0, 3).forEach(todo => {
                    goals.push(`🎯 ${todo.text}`);
                });
                goals.push('');
            }
        }

        if (data.roadmap?.milestones) {
            const upcomingMilestones = data.roadmap.milestones
                .filter(m => !m.completed && new Date(m.date) > new Date())
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 3);
                
            if (upcomingMilestones.length > 0) {
                goals.push('**Upcoming Milestones:**');
                upcomingMilestones.forEach(milestone => {
                    const date = new Date(milestone.date).toLocaleDateString();
                    goals.push(`📅 ${milestone.title} (${date})`);
                });
            }
        }

        return this.formatSection('Next Week Focus', goals);
    }

    createInsightsSection(insights) {
        const items = [];
        
        insights.forEach(insight => {
            items.push(`${insight.icon} **${insight.category.toUpperCase()}:** ${insight.message}`);
        });

        return this.formatSection('Weekly Insights', items);
    }
}

/**
 * Project Journal Template
 */
class ProjectJournalTemplate extends BaseJournalTemplate {
    getName() { return 'Project-Focused Journal'; }
    getDescription() { return 'Project-centric view with milestone tracking and roadmap progress'; }
    getFeatures() { return ['Project focus', 'Milestone tracking', 'Roadmap progress', 'Project insights']; }

    async process(data, context) {
        const sections = [];

        // Header
        const projectName = data.roadmap?.project?.name || 'Project';
        sections.push({
            type: 'header',
            level: 1,
            content: `${projectName} - Progress Report`
        });

        // Project Overview
        if (data.roadmap?.project) {
            sections.push(this.createProjectOverview(data.roadmap.project));
        }

        // Milestone Status
        if (data.roadmap?.milestones) {
            sections.push(this.createMilestoneStatus(data.roadmap.milestones));
        }

        // Project-Related Tasks
        sections.push(this.createProjectTasks(data.todos || []));

        // Project Meetings
        sections.push(this.createProjectMeetings(data.meetings || []));

        // Project Health
        sections.push(this.createProjectHealth(data));

        return { sections, context };
    }

    createProjectOverview(project) {
        const items = [];
        
        items.push(`**Project:** ${project.name || 'Untitled'}`);
        items.push(`**Status:** ${project.status || 'Unknown'}`);
        
        if (project.description) {
            items.push(`**Description:** ${project.description}`);
        }
        
        if (project.startDate) {
            items.push(`**Start Date:** ${new Date(project.startDate).toLocaleDateString()}`);
        }
        
        if (project.endDate) {
            items.push(`**Target Date:** ${new Date(project.endDate).toLocaleDateString()}`);
            
            // Calculate progress
            const start = new Date(project.startDate || Date.now());
            const end = new Date(project.endDate);
            const now = new Date();
            
            if (now <= end) {
                const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const elapsedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
                const progressPercentage = Math.round((elapsedDays / totalDays) * 100);
                
                items.push(`**Timeline Progress:** ${progressPercentage}% (${elapsedDays}/${totalDays} days)`);
            }
        }

        return this.formatSection('Project Overview', items);
    }

    createMilestoneStatus(milestones) {
        const items = [];
        const completed = milestones.filter(m => m.completed);
        const pending = milestones.filter(m => !m.completed);
        const overdue = pending.filter(m => new Date(m.date) < new Date());

        items.push(`**Total Milestones:** ${milestones.length}`);
        items.push(`**Completed:** ${completed.length} ✅`);
        items.push(`**Pending:** ${pending.length} ⏳`);
        items.push(`**Overdue:** ${overdue.length} 🚨`);
        items.push('');

        // Recent completions
        if (completed.length > 0) {
            items.push('**Recently Completed:**');
            completed
                .sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date))
                .slice(0, 3)
                .forEach(milestone => {
                    items.push(`✅ ${milestone.title}`);
                });
            items.push('');
        }

        // Upcoming milestones
        const upcoming = pending
            .filter(m => new Date(m.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);

        if (upcoming.length > 0) {
            items.push('**Upcoming Milestones:**');
            upcoming.forEach(milestone => {
                const date = new Date(milestone.date).toLocaleDateString();
                items.push(`🎯 ${milestone.title} (${date})`);
            });
            items.push('');
        }

        // Overdue milestones
        if (overdue.length > 0) {
            items.push('**⚠️ Overdue Milestones:**');
            overdue.forEach(milestone => {
                const date = new Date(milestone.date).toLocaleDateString();
                items.push(`🚨 ${milestone.title} (${date})`);
            });
        }

        return this.formatSection('Milestone Status', items);
    }

    createProjectTasks(todos) {
        const items = [];
        const completed = todos.filter(t => t.completed);
        const pending = todos.filter(t => !t.completed);
        const highPriority = pending.filter(t => t.priority === 'high');

        items.push(`**Task Summary:** ${completed.length}/${todos.length} completed`);
        items.push('');

        if (highPriority.length > 0) {
            items.push('**High Priority Tasks:**');
            highPriority.slice(0, 5).forEach(todo => {
                items.push(`🔥 ${todo.text}`);
            });
            items.push('');
        }

        // Recent completions
        if (completed.length > 0) {
            items.push('**Recent Completions:**');
            completed
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .slice(0, 5)
                .forEach(todo => {
                    items.push(`✅ ${todo.text}`);
                });
        }

        return this.formatSection('Project Tasks', items);
    }

    createProjectMeetings(meetings) {
        const items = [];
        const projectMeetings = meetings; // In a real app, you might filter by project
        
        items.push(`**Total Meetings:** ${projectMeetings.length}`);
        
        if (projectMeetings.length > 0) {
            items.push('');
            items.push('**Recent Meetings:**');
            
            projectMeetings
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3)
                .forEach(meeting => {
                    const status = meeting.completed ? '✅' : '📅';
                    items.push(`${status} ${meeting.title} (${new Date(meeting.date).toLocaleDateString()})`);
                });
        }

        return this.formatSection('Project Meetings', items);
    }

    createProjectHealth(data) {
        const health = [];
        let score = 0;
        let maxScore = 0;

        // Milestone health
        if (data.roadmap?.milestones?.length > 0) {
            const milestones = data.roadmap.milestones;
            const completed = milestones.filter(m => m.completed).length;
            const overdue = milestones.filter(m => !m.completed && new Date(m.date) < new Date()).length;
            
            maxScore += 30;
            if (completed / milestones.length > 0.5) score += 30;
            else if (completed / milestones.length > 0.25) score += 20;
            else score += 10;

            if (overdue === 0) score += 10;
            else if (overdue < milestones.length * 0.2) score += 5;
            
            health.push(`**Milestone Health:** ${overdue === 0 ? '🟢' : overdue < 3 ? '🟡' : '🔴'} ${completed}/${milestones.length} completed, ${overdue} overdue`);
        }

        // Task completion health
        if (data.todos?.length > 0) {
            const todos = data.todos;
            const completed = todos.filter(t => t.completed).length;
            const completion = completed / todos.length;
            
            maxScore += 25;
            if (completion > 0.7) score += 25;
            else if (completion > 0.5) score += 18;
            else if (completion > 0.3) score += 12;
            else score += 5;

            health.push(`**Task Health:** ${completion > 0.7 ? '🟢' : completion > 0.4 ? '🟡' : '🔴'} ${Math.round(completion * 100)}% completion rate`);
        }

        // Activity health
        maxScore += 20;
        const hasRecentActivity = data.exportInfo?.dateRange && 
            (new Date() - new Date(data.exportInfo.dateRange.start)) < (7 * 24 * 60 * 60 * 1000);
        
        if (hasRecentActivity) score += 20;
        else score += 10;

        health.push(`**Activity:** ${hasRecentActivity ? '🟢' : '🟡'} Recent project activity`);

        // Overall health score
        const healthPercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        let healthStatus = '🔴 Needs Attention';
        if (healthPercentage > 80) healthStatus = '🟢 Excellent';
        else if (healthPercentage > 60) healthStatus = '🟡 Good';
        else if (healthPercentage > 40) healthStatus = '🟠 Fair';

        health.unshift(`**Overall Project Health:** ${healthStatus} (${healthPercentage}%)`);
        health.push('');

        return this.formatSection('Project Health', health);
    }
}

/**
 * Executive Journal Template
 */
class ExecutiveJournalTemplate extends BaseJournalTemplate {
    getName() { return 'Executive Summary'; }
    getDescription() { return 'High-level executive summary with key metrics and insights'; }
    getFeatures() { return ['Executive overview', 'Key metrics', 'Strategic insights', 'Action items']; }

    async process(data, context) {
        const sections = [];

        // Header
        sections.push({
            type: 'header',
            level: 1,
            content: 'Executive Work Summary'
        });

        // Key Metrics
        sections.push(this.createKeyMetrics(data));

        // Strategic Progress
        sections.push(this.createStrategicProgress(data));

        // Critical Items
        sections.push(this.createCriticalItems(data));

        // Executive Insights
        sections.push(this.createExecutiveInsights(data));

        return { sections, context };
    }

    createKeyMetrics(data) {
        const metrics = [];
        
        // Productivity metrics
        if (data.statistics?.todos) {
            const todoStats = data.statistics.todos;
            const completion = todoStats.total > 0 ? Math.round((todoStats.completed / todoStats.total) * 100) : 0;
            metrics.push(`**Task Completion Rate:** ${completion}% (${todoStats.completed}/${todoStats.total})`);
        }

        if (data.statistics?.checklist) {
            const checklistStats = data.statistics.checklist;
            metrics.push(`**Daily Goal Achievement:** ${checklistStats.averageCompletion}%`);
        }

        // Meeting efficiency
        if (data.statistics?.meetings) {
            const meetingStats = data.statistics.meetings;
            const avgDuration = meetingStats.total > 0 ? Math.round(meetingStats.totalDuration / meetingStats.total) : 0;
            metrics.push(`**Meeting Load:** ${meetingStats.total} meetings, ${Math.round(meetingStats.totalDuration / 60)}h total`);
        }

        // Project progress
        if (data.roadmap?.milestones) {
            const milestones = data.roadmap.milestones;
            const completed = milestones.filter(m => m.completed).length;
            metrics.push(`**Project Milestones:** ${completed}/${milestones.length} achieved`);
        }

        return this.formatSection('Key Performance Metrics', metrics);
    }

    createStrategicProgress(data) {
        const progress = [];

        // High-level project status
        if (data.roadmap?.project) {
            const project = data.roadmap.project;
            progress.push(`**${project.name || 'Primary Project'}:** ${project.status || 'Active'}`);
            
            if (project.endDate) {
                const daysRemaining = Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysRemaining > 0) {
                    progress.push(`**Timeline:** ${daysRemaining} days remaining`);
                } else {
                    progress.push(`**Timeline:** ${Math.abs(daysRemaining)} days overdue`);
                }
            }
        }

        // Strategic accomplishments
        if (data.todos) {
            const strategicTasks = data.todos.filter(t => t.completed && t.priority === 'high');
            if (strategicTasks.length > 0) {
                progress.push('');
                progress.push('**Strategic Accomplishments:**');
                strategicTasks.slice(0, 3).forEach(task => {
                    progress.push(`🎯 ${task.text}`);
                });
            }
        }

        return this.formatSection('Strategic Progress', progress);
    }

    createCriticalItems(data) {
        const critical = [];

        // Overdue milestones
        if (data.roadmap?.milestones) {
            const overdue = data.roadmap.milestones.filter(m => 
                !m.completed && new Date(m.date) < new Date()
            );
            
            if (overdue.length > 0) {
                critical.push('**⚠️ Overdue Milestones:**');
                overdue.forEach(milestone => {
                    critical.push(`🚨 ${milestone.title}`);
                });
                critical.push('');
            }
        }

        // High priority pending tasks
        if (data.todos) {
            const highPriority = data.todos.filter(t => !t.completed && t.priority === 'high');
            if (highPriority.length > 0) {
                critical.push('**High Priority Actions Required:**');
                highPriority.slice(0, 5).forEach(task => {
                    critical.push(`🔥 ${task.text}`);
                });
            }
        }

        return this.formatSection('Critical Items Requiring Attention', critical);
    }

    createExecutiveInsights(data) {
        const insights = [];
        
        // Performance insights
        if (data.statistics) {
            const todoStats = data.statistics.todos;
            const checklistStats = data.statistics.checklist;
            
            if (todoStats && checklistStats) {
                const taskCompletion = todoStats.total > 0 ? (todoStats.completed / todoStats.total) * 100 : 0;
                const overallPerformance = (taskCompletion + checklistStats.averageCompletion) / 2;
                
                let performanceIndicator = '🔴 Below Target';
                if (overallPerformance > 80) performanceIndicator = '🟢 Exceeding Expectations';
                else if (overallPerformance > 65) performanceIndicator = '🟡 Meeting Expectations';
                else if (overallPerformance > 50) performanceIndicator = '🟠 Approaching Target';
                
                insights.push(`**Overall Performance:** ${performanceIndicator} (${Math.round(overallPerformance)}%)`);
            }
        }

        // Capacity insights
        if (data.statistics?.meetings) {
            const meetingStats = data.statistics.meetings;
            const dailyMeetingHours = meetingStats.totalDuration / 60 / 7; // Assuming weekly data
            
            if (dailyMeetingHours > 6) {
                insights.push('📊 **Capacity Alert:** High meeting load may impact productivity');
            } else if (dailyMeetingHours < 2) {
                insights.push('📊 **Opportunity:** Low meeting load provides focus time for strategic work');
            }
        }

        // Trend insights
        insights.push('📈 **Trend Analysis:** Historical data can provide better insights with more data points');

        return this.formatSection('Executive Insights', insights);
    }
}

/**
 * Detailed Journal Template
 */
class DetailedJournalTemplate extends BaseJournalTemplate {
    getName() { return 'Detailed Journal'; }
    getDescription() { return 'Comprehensive detailed report with all data and analysis'; }
    getFeatures() { return ['Complete data', 'Detailed analysis', 'Full context', 'Comprehensive insights']; }

    async process(data, context) {
        const sections = [];

        // Header with comprehensive info
        sections.push({
            type: 'header',
            level: 1,
            content: 'Comprehensive Work Journal'
        });

        // Export metadata
        sections.push(this.createMetadataSection(data));

        // All sections from other templates
        sections.push(...(await new DailyJournalTemplate().process(data, context)).sections.slice(1));
        sections.push(...(await new ProjectJournalTemplate().process(data, context)).sections.slice(1));

        // Additional detailed analysis
        sections.push(this.createDetailedAnalysis(data));

        return { sections, context };
    }

    createMetadataSection(data) {
        const metadata = [];
        
        if (data.exportInfo) {
            metadata.push(`**Generated:** ${new Date(data.exportInfo.generatedAt).toLocaleString()}`);
            metadata.push(`**Timezone:** ${data.exportInfo.timezone}`);
            metadata.push(`**Date Range:** ${new JournalFormatter().formatDateRange(data.exportInfo.dateRange)}`);
            
            const includedSections = Object.entries(data.exportInfo.includedSections)
                .filter(([key, value]) => value)
                .map(([key]) => key)
                .join(', ');
            metadata.push(`**Included Sections:** ${includedSections}`);
        }

        return this.formatSection('Export Information', metadata);
    }

    createDetailedAnalysis(data) {
        const analysis = [];
        
        // Data volume analysis
        let totalItems = 0;
        if (data.roadmap?.milestones) totalItems += data.roadmap.milestones.length;
        if (data.todos) totalItems += data.todos.length;
        if (data.meetings) totalItems += data.meetings.length;
        if (data.checklist?.history) {
            Object.values(data.checklist.history).forEach(day => {
                totalItems += day.items?.length || 0;
            });
        }

        analysis.push(`**Total Data Points:** ${totalItems}`);
        analysis.push('');

        // Category analysis
        if (data.todos) {
            const categories = {};
            data.todos.forEach(todo => {
                const category = todo.category || 'Uncategorized';
                categories[category] = (categories[category] || 0) + 1;
            });

            if (Object.keys(categories).length > 1) {
                analysis.push('**Task Categories Distribution:**');
                Object.entries(categories)
                    .sort(([,a], [,b]) => b - a)
                    .forEach(([category, count]) => {
                        analysis.push(`• ${category}: ${count} tasks`);
                    });
                analysis.push('');
            }
        }

        // Time-based patterns
        if (data.checklist?.history) {
            const dailyPatterns = Object.entries(data.checklist.history).map(([date, dayData]) => {
                const completed = dayData.items.filter(item => item.completed).length;
                const total = dayData.items.length;
                return {
                    date,
                    dayOfWeek: new Date(date).toLocaleDateString(undefined, { weekday: 'long' }),
                    completionRate: total > 0 ? (completed / total) * 100 : 0
                };
            });

            if (dailyPatterns.length > 1) {
                const avgByDay = {};
                dailyPatterns.forEach(pattern => {
                    if (!avgByDay[pattern.dayOfWeek]) {
                        avgByDay[pattern.dayOfWeek] = [];
                    }
                    avgByDay[pattern.dayOfWeek].push(pattern.completionRate);
                });

                analysis.push('**Daily Performance Patterns:**');
                Object.entries(avgByDay).forEach(([day, rates]) => {
                    const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
                    analysis.push(`• ${day}: ${avgRate}% average completion`);
                });
            }
        }

        return this.formatSection('Detailed Analysis', analysis);
    }
}

/**
 * Base Formatter Class
 */
class BaseFormatter {
    getName() { return 'Base Formatter'; }
    getExtension() { return '.txt'; }
    getMimeType() { return 'text/plain'; }

    async format(structuredData, context) {
        throw new Error('format method must be implemented by subclass');
    }
}

/**
 * Text Formatter
 */
class TextFormatter extends BaseFormatter {
    getName() { return 'Plain Text'; }
    getExtension() { return '.txt'; }
    getMimeType() { return 'text/plain'; }

    async format(structuredData, context) {
        let output = '';
        
        structuredData.sections.forEach(section => {
            switch (section.type) {
                case 'header':
                    output += this.formatHeader(section);
                    break;
                case 'section':
                    output += this.formatSection(section);
                    break;
                case 'list':
                    output += this.formatList(section);
                    break;
                case 'table':
                    output += this.formatTable(section);
                    break;
                default:
                    if (section.content) {
                        if (Array.isArray(section.content)) {
                            output += section.content.join('\n') + '\n\n';
                        } else {
                            output += section.content + '\n\n';
                        }
                    }
            }
        });

        return output;
    }

    formatHeader(section) {
        const level = section.level || 1;
        const content = section.content;
        
        if (level === 1) {
            return `${content}\n${'='.repeat(content.length)}\n\n`;
        } else {
            return `${content}\n${'-'.repeat(content.length)}\n\n`;
        }
    }

    formatSection(section) {
        let output = '';
        
        if (section.title) {
            const level = section.level || 2;
            if (level === 2) {
                output += `${section.title}\n${'-'.repeat(section.title.length)}\n`;
            } else {
                output += `${'#'.repeat(level)} ${section.title}\n`;
            }
        }
        
        if (Array.isArray(section.content)) {
            output += section.content.join('\n');
        } else {
            output += section.content;
        }
        
        output += '\n\n';
        return output;
    }

    formatList(section) {
        let output = '';
        section.items.forEach((item, index) => {
            const prefix = section.ordered ? `${index + 1}. ` : '• ';
            output += `${prefix}${item}\n`;
        });
        output += '\n';
        return output;
    }

    formatTable(section) {
        // Simple table formatting for plain text
        let output = '';
        
        if (section.headers) {
            output += section.headers.join(' | ') + '\n';
            output += section.headers.map(() => '---').join(' | ') + '\n';
        }
        
        section.rows.forEach(row => {
            output += row.join(' | ') + '\n';
        });
        
        output += '\n';
        return output;
    }
}

/**
 * Markdown Formatter
 */
class MarkdownFormatter extends BaseFormatter {
    getName() { return 'Markdown'; }
    getExtension() { return '.md'; }
    getMimeType() { return 'text/markdown'; }

    async format(structuredData, context) {
        let output = '';
        
        structuredData.sections.forEach(section => {
            switch (section.type) {
                case 'header':
                    output += this.formatHeader(section);
                    break;
                case 'section':
                    output += this.formatSection(section);
                    break;
                case 'list':
                    output += this.formatList(section);
                    break;
                case 'table':
                    output += this.formatTable(section);
                    break;
                default:
                    if (section.content) {
                        if (Array.isArray(section.content)) {
                            output += section.content.join('\n') + '\n\n';
                        } else {
                            output += section.content + '\n\n';
                        }
                    }
            }
        });

        return output;
    }

    formatHeader(section) {
        const level = section.level || 1;
        const content = section.content;
        return `${'#'.repeat(level)} ${content}\n\n`;
    }

    formatSection(section) {
        let output = '';
        
        if (section.title) {
            const level = section.level || 2;
            output += `${'#'.repeat(level)} ${section.title}\n\n`;
        }
        
        if (Array.isArray(section.content)) {
            output += section.content.join('\n');
        } else {
            output += section.content;
        }
        
        output += '\n\n';
        return output;
    }

    formatList(section) {
        let output = '';
        section.items.forEach((item, index) => {
            const prefix = section.ordered ? `${index + 1}. ` : '- ';
            output += `${prefix}${item}\n`;
        });
        output += '\n';
        return output;
    }

    formatTable(section) {
        let output = '';
        
        if (section.headers) {
            output += '| ' + section.headers.join(' | ') + ' |\n';
            output += '| ' + section.headers.map(() => '---').join(' | ') + ' |\n';
        }
        
        section.rows.forEach(row => {
            output += '| ' + row.join(' | ') + ' |\n';
        });
        
        output += '\n';
        return output;
    }
}

/**
 * HTML Formatter
 */
class HTMLFormatter extends BaseFormatter {
    getName() { return 'HTML Report'; }
    getExtension() { return '.html'; }
    getMimeType() { return 'text/html'; }

    async format(structuredData, context) {
        let bodyContent = '';
        
        structuredData.sections.forEach(section => {
            switch (section.type) {
                case 'header':
                    bodyContent += this.formatHeader(section);
                    break;
                case 'section':
                    bodyContent += this.formatSection(section);
                    break;
                case 'list':
                    bodyContent += this.formatList(section);
                    break;
                case 'table':
                    bodyContent += this.formatTable(section);
                    break;
                default:
                    if (section.content) {
                        if (Array.isArray(section.content)) {
                            bodyContent += '<div class="content-section">' + 
                                section.content.map(line => `<p>${this.escapeHtml(line)}</p>`).join('') + 
                                '</div>';
                        } else {
                            bodyContent += `<div class="content-section"><p>${this.escapeHtml(section.content)}</p></div>`;
                        }
                    }
            }
        });

        return this.wrapHTML(bodyContent, context);
    }

    formatHeader(section) {
        const level = Math.min(section.level || 1, 6);
        const content = this.escapeHtml(section.content);
        return `<h${level} class="journal-header">${content}</h${level}>`;
    }

    formatSection(section) {
        let output = '<section class="journal-section">';
        
        if (section.title) {
            const level = Math.min(section.level || 2, 6);
            output += `<h${level} class="section-title">${this.escapeHtml(section.title)}</h${level}>`;
        }
        
        if (Array.isArray(section.content)) {
            output += '<div class="section-content">';
            section.content.forEach(line => {
                if (line.startsWith('**') && line.endsWith('**')) {
                    output += `<p class="highlight"><strong>${this.escapeHtml(line.slice(2, -2))}</strong></p>`;
                } else if (line.trim() === '') {
                    output += '<br>';
                } else {
                    output += `<p>${this.escapeHtml(line)}</p>`;
                }
            });
            output += '</div>';
        } else {
            output += `<div class="section-content"><p>${this.escapeHtml(section.content)}</p></div>`;
        }
        
        output += '</section>';
        return output;
    }

    formatList(section) {
        const tag = section.ordered ? 'ol' : 'ul';
        let output = `<${tag} class="journal-list">`;
        
        section.items.forEach(item => {
            output += `<li>${this.escapeHtml(item)}</li>`;
        });
        
        output += `</${tag}>`;
        return output;
    }

    formatTable(section) {
        let output = '<table class="journal-table">';
        
        if (section.headers) {
            output += '<thead><tr>';
            section.headers.forEach(header => {
                output += `<th>${this.escapeHtml(header)}</th>`;
            });
            output += '</tr></thead>';
        }
        
        output += '<tbody>';
        section.rows.forEach(row => {
            output += '<tr>';
            row.forEach(cell => {
                output += `<td>${this.escapeHtml(cell)}</td>`;
            });
            output += '</tr>';
        });
        output += '</tbody>';
        
        output += '</table>';
        return output;
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    wrapHTML(content, context) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Journal Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: #f9f9f9;
        }
        .journal-header {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .journal-section {
            background: white;
            margin-bottom: 25px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
            color: #34495e;
            margin-top: 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #ecf0f1;
        }
        .section-content p {
            margin: 8px 0;
        }
        .highlight {
            background: #fff3cd;
            padding: 5px 10px;
            border-radius: 4px;
            border-left: 4px solid #ffc107;
        }
        .journal-list {
            margin: 15px 0;
            padding-left: 20px;
        }
        .journal-list li {
            margin: 5px 0;
        }
        .journal-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .journal-table th,
        .journal-table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        .journal-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .content-section {
            margin: 15px 0;
        }
        @media print {
            body {
                background: white;
                max-width: none;
                margin: 0;
                padding: 10px;
            }
            .journal-section {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
    }
}

/**
 * JSON Formatter
 */
class JSONFormatter extends BaseFormatter {
    getName() { return 'JSON Data'; }
    getExtension() { return '.json'; }
    getMimeType() { return 'application/json'; }

    async format(structuredData, context) {
        return JSON.stringify({
            journal: structuredData,
            context: context,
            generatedAt: new Date().toISOString()
        }, null, 2);
    }
}

/**
 * CSV Formatter
 */
class CSVFormatter extends BaseFormatter {
    getName() { return 'CSV Data'; }
    getExtension() { return '.csv'; }
    getMimeType() { return 'text/csv'; }

    async format(structuredData, context) {
        // For CSV, we'll extract tabular data from sections
        const csvData = [];
        
        // Add header
        csvData.push(['Section', 'Type', 'Content', 'Details']);
        
        structuredData.sections.forEach((section, index) => {
            const sectionName = section.title || `Section ${index + 1}`;
            
            if (Array.isArray(section.content)) {
                section.content.forEach(item => {
                    csvData.push([sectionName, section.type || 'content', this.cleanForCSV(item), '']);
                });
            } else if (section.content) {
                csvData.push([sectionName, section.type || 'content', this.cleanForCSV(section.content), '']);
            }
        });
        
        return csvData.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    cleanForCSV(text) {
        if (typeof text !== 'string') return String(text);
        return text.replace(/[\r\n]+/g, ' ').trim();
    }
}

// Initialize the journal formatter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.journalFormatter = new JournalFormatter();
});