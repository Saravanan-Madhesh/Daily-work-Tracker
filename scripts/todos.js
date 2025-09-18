/**
 * Daily Work Tracker - Todo Management System
 * Handles todo list functionality, priorities, categories, and carryforward logic
 */

class TodosManager {
    static todoItems = [];
    static categories = ['work', 'personal', 'urgent', 'project', 'meeting', 'follow-up'];
    static priorities = ['low', 'medium', 'high'];
    static filters = {
        status: 'all', // all, active, completed
        priority: 'all', // all, low, medium, high
        category: 'all', // all, work, personal, etc.
        date: 'today' // today, tomorrow, week, overdue
    };
    static isInitialized = false;
    static currentDate = null;

    /**
     * Initialize the todo management system
     */
    static async init() {
        try {
            console.log('Initializing TodosManager...');
            
            // Load todo data
            await this.loadTodoData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update current date
            this.currentDate = StorageManager.getCurrentDateString();
            
            // Initial render
            this.renderTodoItems();
            
            this.isInitialized = true;
            console.log('TodosManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize TodosManager:', error);
            throw error;
        }
    }

    /**
     * Load todo data from storage
     */
    static async loadTodoData() {
        try {
            // Load all todo items
            const allTodos = await StorageManager.getAllFromStore('todos') || [];
            
            // Filter and sort todos
            this.todoItems = allTodos.filter(todo => this.shouldShowTodo(todo));
            
            // Sort by priority and date
            this.sortTodos();
            
            console.log(`Loaded ${this.todoItems.length} todo items`);
            
        } catch (error) {
            console.error('Failed to load todo data:', error);
            this.todoItems = [];
        }
    }

    /**
     * Determine if a todo should be shown based on current filters and date
     */
    static shouldShowTodo(todo) {
        const today = StorageManager.getCurrentDateString();
        const tomorrow = this.getTomorrowString();
        const weekFromNow = this.getWeekFromNowString();

        // Date filter logic
        switch (this.filters.date) {
            case 'today':
                if (todo.date !== today) return false;
                break;
            case 'tomorrow':
                if (todo.date !== tomorrow) return false;
                break;
            case 'week':
                if (todo.date > weekFromNow) return false;
                break;
            case 'overdue':
                if (todo.date >= today || todo.completed) return false;
                break;
            case 'all':
                // Show all todos within reasonable range (last 30 days to next 30 days)
                const thirtyDaysAgo = this.getDaysAgo(30);
                const thirtyDaysFromNow = this.getDaysFromNow(30);
                if (todo.date < thirtyDaysAgo || todo.date > thirtyDaysFromNow) return false;
                break;
        }

        return true;
    }

    /**
     * Sort todos by priority and date
     */
    static sortTodos() {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        
        this.todoItems.sort((a, b) => {
            // First by completion status (incomplete first)
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Then by priority (high to low)
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            
            // Then by date (earlier first)
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            
            // Finally by creation time (newer first)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * Set up event listeners
     */
    static setupEventListeners() {
        // Add todo button
        const addBtn = document.getElementById('addTodo');
        if (addBtn) {
            addBtn.addEventListener('click', this.showAddTodoModal.bind(this));
        }

        const bulkAddBtn = document.getElementById('bulkAddTodo');
        if (bulkAddBtn) {
            bulkAddBtn.addEventListener('click', this.showBulkAddModal.bind(this));
        }

        // Bulk actions button
        const bulkActionsBtn = document.getElementById('bulkActions');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', this.showBulkActionsModal.bind(this));
        }

        // Filter buttons
        this.setupFilterListeners();

        // Listen for daily reset events
        document.addEventListener('dailyResetComplete', this.handleDailyReset.bind(this));
    }

    /**
     * Set up filter event listeners
     */
    static setupFilterListeners() {
        // Status filters
        const statusFilters = document.querySelectorAll('.status-filter');
        statusFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setFilter('status', e.target.dataset.filter);
                this.updateFilterUI();
                this.renderTodoItems();
            });
        });

        // Priority filters
        const priorityFilters = document.querySelectorAll('.priority-filter');
        priorityFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setFilter('priority', e.target.dataset.filter);
                this.updateFilterUI();
                this.renderTodoItems();
            });
        });

        // Category filters
        const categoryFilters = document.querySelectorAll('.category-filter');
        categoryFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setFilter('category', e.target.dataset.filter);
                this.updateFilterUI();
                this.renderTodoItems();
            });
        });

        // Date filters
        const dateFilters = document.querySelectorAll('.date-filter');
        dateFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setFilter('date', e.target.dataset.filter);
                this.updateFilterUI();
                this.loadTodoData().then(() => this.renderTodoItems());
            });
        });
    }

    /**
     * Set filter value
     */
    static setFilter(type, value) {
        this.filters[type] = value;
        console.log(`Filter set: ${type} = ${value}`);
    }

    /**
     * Update filter UI to show active states
     */
    static updateFilterUI() {
        // Update all filter buttons
        Object.entries(this.filters).forEach(([type, value]) => {
            const filterButtons = document.querySelectorAll(`.${type}-filter`);
            filterButtons.forEach(button => {
                if (button.dataset.filter === value) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
        });
    }

    /**
     * Render todo items
     */
    static renderTodoItems() {
        const container = document.getElementById('todoItems');
        if (!container) return;

        // Apply current filters
        const filteredTodos = this.applyFilters(this.todoItems);

        if (filteredTodos.length === 0) {
            this.renderEmptyState(container);
            return;
        }

        // Render filters
        this.renderFilters(container);

        // Render todos
        const itemsHTML = filteredTodos.map((todo, index) => this.createTodoItemHTML(todo, index)).join('');
        const todosContainer = container.querySelector('.todos-list') || this.createTodosContainer(container);
        todosContainer.innerHTML = itemsHTML;

        // Update statistics
        this.updateTodoStatistics(filteredTodos);
    }

    /**
     * Apply current filters to todos
     */
    static applyFilters(todos) {
        return todos.filter(todo => {
            // Status filter
            if (this.filters.status === 'active' && todo.completed) return false;
            if (this.filters.status === 'completed' && !todo.completed) return false;

            // Priority filter
            if (this.filters.priority !== 'all' && todo.priority !== this.filters.priority) return false;

            // Category filter
            if (this.filters.category !== 'all' && todo.category !== this.filters.category) return false;

            return true;
        });
    }

    /**
     * Render filter buttons
     */
    static renderFilters(container) {
        let filtersContainer = container.querySelector('.todo-filters');
        if (!filtersContainer) {
            filtersContainer = document.createElement('div');
            filtersContainer.className = 'todo-filters';
            container.appendChild(filtersContainer);
        }

        filtersContainer.innerHTML = `
            <div class="filter-group">
                <label class="filter-label">Status:</label>
                <button class="filter-btn status-filter ${this.filters.status === 'all' ? 'active' : ''}" data-filter="all">All</button>
                <button class="filter-btn status-filter ${this.filters.status === 'active' ? 'active' : ''}" data-filter="active">Active</button>
                <button class="filter-btn status-filter ${this.filters.status === 'completed' ? 'active' : ''}" data-filter="completed">Done</button>
            </div>
            
            <div class="filter-group">
                <label class="filter-label">Priority:</label>
                <button class="filter-btn priority-filter ${this.filters.priority === 'all' ? 'active' : ''}" data-filter="all">All</button>
                <button class="filter-btn priority-filter high ${this.filters.priority === 'high' ? 'active' : ''}" data-filter="high">🔴 High</button>
                <button class="filter-btn priority-filter medium ${this.filters.priority === 'medium' ? 'active' : ''}" data-filter="medium">🟡 Medium</button>
                <button class="filter-btn priority-filter low ${this.filters.priority === 'low' ? 'active' : ''}" data-filter="low">🟢 Low</button>
            </div>
            
            <div class="filter-group">
                <label class="filter-label">Date:</label>
                <button class="filter-btn date-filter ${this.filters.date === 'today' ? 'active' : ''}" data-filter="today">Today</button>
                <button class="filter-btn date-filter ${this.filters.date === 'tomorrow' ? 'active' : ''}" data-filter="tomorrow">Tomorrow</button>
                <button class="filter-btn date-filter ${this.filters.date === 'week' ? 'active' : ''}" data-filter="week">This Week</button>
                <button class="filter-btn date-filter ${this.filters.date === 'overdue' ? 'active' : ''}" data-filter="overdue">⚠️ Overdue</button>
                <button class="filter-btn date-filter ${this.filters.date === 'all' ? 'active' : ''}" data-filter="all">All</button>
            </div>
        `;

        // Re-attach event listeners for new filter buttons
        this.setupFilterListeners();
    }

    /**
     * Create todos container
     */
    static createTodosContainer(parent) {
        const container = document.createElement('div');
        container.className = 'todos-list';
        parent.appendChild(container);
        return container;
    }

    /**
     * Render empty state
     */
    static renderEmptyState(container) {
        const emptyState = this.getEmptyStateContent();
        container.innerHTML = `
            <div class="todo-filters-placeholder"></div>
            <div class="empty-state">
                ${emptyState}
            </div>
        `;
        
        // Still render filters for empty state
        this.renderFilters(container);
    }

    /**
     * Get appropriate empty state content
     */
    static getEmptyStateContent() {
        if (this.filters.date === 'overdue') {
            return `
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-title">No overdue items!</div>
                <div class="empty-state-text">Great job staying on top of your tasks.</div>
            `;
        } else if (this.filters.status === 'completed') {
            return `
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-title">No completed todos</div>
                <div class="empty-state-text">Complete some tasks to see them here.</div>
            `;
        } else {
            return `
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">No todos found</div>
                <div class="empty-state-text">
                    ${this.filters.date === 'today' ? 'Add your first todo for today!' : 'Try adjusting your filters or add a new todo.'}
                </div>
                <button class="btn btn-primary" onclick="TodosManager.showAddTodoModal()">+ Add Todo</button>
            `;
        }
    }

    /**
     * Create HTML for a single todo item
     */
    static createTodoItemHTML(todo, index) {
        const completedClass = todo.completed ? 'completed' : '';
        const priorityClass = `${todo.priority}-priority`;
        const overdueClass = this.isTodoOverdue(todo) && !todo.completed ? 'overdue' : '';
        const completedTime = todo.completedAt ? new Date(todo.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        
        const dueDateDisplay = todo.dueDate ? this.formatDateRelative(todo.dueDate) : '';
        const categoryDisplay = todo.category ? this.getCategoryIcon(todo.category) + ' ' + this.formatCategoryName(todo.category) : '';
        const carryForwardBadge = todo.carriedFrom ? `<span class="carry-badge" title="Carried from ${todo.carriedFrom}">↗️ Carried</span>` : '';

        return `
            <div class="todo-item ${completedClass} ${priorityClass} ${overdueClass}" data-todo-id="${todo.id}">
                <div class="todo-main">
                    <input type="checkbox" 
                           class="todo-checkbox" 
                           ${todo.completed ? 'checked' : ''}
                           onchange="TodosManager.toggleTodoCompletion('${todo.id}')">
                    
                    <div class="todo-content">
                        <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                        
                        ${todo.description ? `<div class="todo-description">${this.escapeHtml(todo.description)}</div>` : ''}
                        
                        <div class="todo-meta">
                            <span class="todo-priority ${todo.priority}">${this.getPriorityIcon(todo.priority)} ${this.formatPriorityName(todo.priority)}</span>
                            
                            ${categoryDisplay ? `<span class="todo-category">${categoryDisplay}</span>` : ''}
                            
                            <span class="todo-date" title="${todo.date}">
                                📅 ${this.formatDateRelative(todo.date)}
                            </span>
                            
                            ${dueDateDisplay ? `<span class="todo-due-date" title="Due: ${todo.dueDate}">⏰ Due: ${dueDateDisplay}</span>` : ''}
                            
                            ${carryForwardBadge}
                        </div>
                        
                        ${completedTime ? `<div class="completion-time">Completed at ${completedTime}</div>` : ''}
                    </div>
                </div>
                
                <div class="todo-actions">
                    <button class="todo-edit" onclick="TodosManager.showEditTodoModal('${todo.id}')" title="Edit todo">
                        ✏️
                    </button>
                    ${!todo.completed && !this.isTodoToday(todo) ? `
                        <button class="todo-carry" onclick="TodosManager.carryTodoToToday('${todo.id}')" title="Move to today">
                            ➡️
                        </button>
                    ` : ''}
                    <button class="todo-delete" onclick="TodosManager.deleteTodo('${todo.id}')" title="Delete todo">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Toggle todo completion status
     */
    static async toggleTodoCompletion(todoId) {
        try {
            const todo = this.todoItems.find(item => item.id === todoId);
            if (!todo) {
                throw new Error('Todo item not found');
            }

            // Toggle completion status
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
            todo.updatedAt = new Date().toISOString();

            // Save to storage
            await StorageManager.saveToStore('todos', todo);

            // Update local array
            const index = this.todoItems.findIndex(item => item.id === todoId);
            if (index !== -1) {
                this.todoItems[index] = todo;
            }

            // Re-render items to update sorting
            this.renderTodoItems();

            // Show completion feedback
            if (todo.completed) {
                this.showCompletionFeedback(todo.text);
            }

            console.log(`Todo ${todo.completed ? 'completed' : 'uncompleted'}:`, todo.text);

        } catch (error) {
            console.error('Failed to toggle todo completion:', error);
            app.showError('Failed to update todo item');
        }
    }

    /**
     * Show completion feedback
     */
    static showCompletionFeedback(todoText) {
        const feedback = document.createElement('div');
        feedback.className = 'completion-feedback todo-completion';
        feedback.innerHTML = `✅ "${todoText}" completed!`;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    /**
     * Show add todo modal
     */
    static showAddTodoModal() {
        const modalContent = this.createTodoModal();
        app.showModal(modalContent);

        // Focus on text input
        setTimeout(() => {
            const textInput = document.getElementById('todoText');
            if (textInput) textInput.focus();
        }, 100);
    }

    static showBulkAddModal() {
        const modalContent = this.createBulkAddModal();
        app.showModal(modalContent);

        setTimeout(() => {
            const textInput = document.getElementById('bulkTodoText');
            if (textInput) textInput.focus();
        }, 100);
    }

    /**
     * Show edit todo modal
     */
    static showEditTodoModal(todoId) {
        const todo = this.todoItems.find(item => item.id === todoId);
        if (!todo) {
            app.showError('Todo item not found');
            return;
        }

        const modalContent = this.createTodoModal(todo);
        app.showModal(modalContent);

        // Focus on text input and select all
        setTimeout(() => {
            const textInput = document.getElementById('todoText');
            if (textInput) {
                textInput.focus();
                textInput.select();
            }
        }, 100);
    }

    /**
     * Create todo modal (add/edit)
     */
    static createTodoModal(editTodo = null) {
        const isEdit = !!editTodo;
        const title = isEdit ? 'Edit Todo' : 'Add New Todo';
        
        const categoryOptions = this.categories.map(category => 
            `<option value="${category}" ${editTodo?.category === category ? 'selected' : ''}>
                ${this.getCategoryIcon(category)} ${this.formatCategoryName(category)}
            </option>`
        ).join('');

        return `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Todo Text *</label>
                    <input type="text" class="form-input" id="todoText" 
                           value="${editTodo ? this.escapeHtml(editTodo.text) : ''}"
                           placeholder="What do you need to do?"
                           maxlength="200">
                    <small class="form-help">Be specific about what you want to accomplish</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description (Optional)</label>
                    <textarea class="form-input" id="todoDescription" 
                              placeholder="Add more details about this todo..."
                              rows="3"
                              maxlength="500">${editTodo ? this.escapeHtml(editTodo.description || '') : ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select class="form-select" id="todoPriority">
                            <option value="low" ${editTodo?.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                            <option value="medium" ${editTodo?.priority === 'medium' || !editTodo ? 'selected' : ''}>🟡 Medium</option>
                            <option value="high" ${editTodo?.priority === 'high' ? 'selected' : ''}>🔴 High</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select" id="todoCategory">
                            <option value="">Select category...</option>
                            ${categoryOptions}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" class="form-input" id="todoDate" 
                               value="${editTodo?.date || StorageManager.getCurrentDateString()}"
                               min="${this.getDaysAgo(7)}"
                               max="${this.getDaysFromNow(365)}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Due Date (Optional)</label>
                        <input type="date" class="form-input" id="todoDueDate" 
                               value="${editTodo?.dueDate || ''}"
                               min="${StorageManager.getCurrentDateString()}"
                               max="${this.getDaysFromNow(365)}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="todoCarryForward" ${editTodo?.carryForward !== false ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Allow carry forward to next day
                    </label>
                    <small class="form-help">If not completed, this todo can be automatically moved to the next day</small>
                </div>
                
                ${isEdit && editTodo.completed ? `
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="todoCompleted" checked>
                            <span class="checkmark"></span>
                            Mark as completed
                        </label>
                        <small class="form-help">Completed: ${editTodo.completedAt ? new Date(editTodo.completedAt).toLocaleString() : 'Unknown'}</small>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                ${isEdit ? `<button class="btn btn-danger" onclick="TodosManager.deleteTodo('${editTodo.id}')">Delete</button>` : ''}
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="TodosManager.${isEdit ? 'updateTodo' : 'addTodo'}('${editTodo?.id || ''}')">
                    ${isEdit ? 'Update Todo' : 'Add Todo'}
                </button>
            </div>
        `;
    }

    static createBulkAddModal() {
        return `
            <div class="modal-header">
                <h3 class="modal-title">Bulk Add Todos</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Todo Items</label>
                    <textarea class="form-input" id="bulkTodoText" 
                              placeholder="Enter each todo on a new line..."
                              rows="10"></textarea>
                    <small class="form-help">Enter one todo per line. Each line will be saved as a separate todo item.</small>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select class="form-select" id="bulkTodoPriority">
                            <option value="low">🟢 Low</option>
                            <option value="medium" selected>🟡 Medium</option>
                            <option value="high">🔴 High</option>
                        </select>
                        <small class="form-help">Set priority for all items.</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" class="form-input" id="bulkTodoDueDate" 
                               min="${StorageManager.getCurrentDateString()}"
                               max="${this.getDaysFromNow(365)}">
                        <small class="form-help">This due date will be applied to all todos.</small>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="TodosManager.addBulkTodos()">Add Todos</button>
            </div>
        `;
    }

    /**
     * Add new todo
     */
    static async addBulkTodos() {
        try {
            const bulkText = document.getElementById('bulkTodoText').value.trim();
            const dueDate = document.getElementById('bulkTodoDueDate').value;
            const priority = document.getElementById('bulkTodoPriority').value;

            if (!bulkText) {
                app.showError('Please enter at least one todo item.');
                return;
            }

            const lines = bulkText.split('\n').filter(line => line.trim() !== '');
            let addedCount = 0;

            for (const line of lines) {
                const todoData = {
                    text: line,
                    description: '',
                    priority: priority,
                    category: '',
                    date: StorageManager.getCurrentDateString(),
                    dueDate: dueDate || null,
                    carryForward: true,
                    completed: false
                };

                const todo = StorageManager.createTodoModel(todoData);
                const validation = StorageManager.validateTodoData(todo);

                if (validation.isValid) {
                    await StorageManager.saveToStore('todos', todo);
                    if (this.shouldShowTodo(todo)) {
                        this.todoItems.push(todo);
                    }
                    addedCount++;
                }
            }

            this.sortTodos();
            this.renderTodoItems();
            app.hideModal();
            app.showSuccess(`${addedCount} todos added successfully!`);

        } catch (error) {
            console.error('Failed to add bulk todos:', error);
            app.showError('An error occurred while adding bulk todos.');
        }
    }


    static async addTodo() {
        try {
            const formData = this.getTodoFormData();
            if (!formData) return;

            // Create todo item
            const todoData = {
                text: formData.text,
                description: formData.description,
                priority: formData.priority,
                category: formData.category,
                date: formData.date,
                dueDate: formData.dueDate,
                carryForward: formData.carryForward,
                completed: false
            };

            const todo = StorageManager.createTodoModel(todoData);

            // Validate todo
            const validation = StorageManager.validateTodoData(todo);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Save to storage
            await StorageManager.saveToStore('todos', todo);

            // Add to local array if it should be shown
            if (this.shouldShowTodo(todo)) {
                this.todoItems.push(todo);
                this.sortTodos();
            }

            // Re-render
            this.renderTodoItems();

            // Hide modal and show success
            app.hideModal();
            app.showSuccess('Todo added successfully!');

            console.log('Todo added:', todo);

        } catch (error) {
            console.error('Failed to add todo:', error);
            app.showError(error.message);
        }
    }

    /**
     * Update existing todo
     */
    static async updateTodo(todoId) {
        try {
            const formData = this.getTodoFormData();
            if (!formData) return;

            const todo = this.todoItems.find(item => item.id === todoId);
            if (!todo) {
                throw new Error('Todo item not found');
            }

            const wasCompleted = todo.completed;
            const isNowCompleted = formData.completed;

            // Update todo
            todo.text = formData.text;
            todo.description = formData.description;
            todo.priority = formData.priority;
            todo.category = formData.category;
            todo.date = formData.date;
            todo.dueDate = formData.dueDate;
            todo.carryForward = formData.carryForward;
            todo.completed = isNowCompleted;
            todo.updatedAt = new Date().toISOString();

            // Update completion timestamp
            if (!wasCompleted && isNowCompleted) {
                todo.completedAt = new Date().toISOString();
            } else if (wasCompleted && !isNowCompleted) {
                todo.completedAt = null;
            }

            // Validate
            const validation = StorageManager.validateTodoData(todo);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Save to storage
            await StorageManager.saveToStore('todos', todo);

            // Update local array
            const index = this.todoItems.findIndex(item => item.id === todoId);
            if (index !== -1) {
                this.todoItems[index] = todo;
                this.sortTodos();
            }

            // Re-render
            this.renderTodoItems();

            // Hide modal and show success
            app.hideModal();
            app.showSuccess('Todo updated successfully!');

            console.log('Todo updated:', todo);

        } catch (error) {
            console.error('Failed to update todo:', error);
            app.showError(error.message);
        }
    }

    /**
     * Get form data from modal
     */
    static getTodoFormData() {
        const textInput = document.getElementById('todoText');
        const descriptionInput = document.getElementById('todoDescription');
        const prioritySelect = document.getElementById('todoPriority');
        const categorySelect = document.getElementById('todoCategory');
        const dateInput = document.getElementById('todoDate');
        const dueDateInput = document.getElementById('todoDueDate');
        const carryForwardCheckbox = document.getElementById('todoCarryForward');
        const completedCheckbox = document.getElementById('todoCompleted');

        if (!textInput) {
            app.showError('Form not found');
            return null;
        }

        const text = textInput.value.trim();
        if (!text) {
            app.showError('Todo text is required');
            textInput.focus();
            return null;
        }

        if (text.length < 3) {
            app.showError('Todo text must be at least 3 characters');
            textInput.focus();
            return null;
        }

        const date = dateInput.value;
        const dueDate = dueDateInput.value;

        // Validate due date is not before date
        if (dueDate && date && dueDate < date) {
            app.showError('Due date cannot be before the todo date');
            dueDateInput.focus();
            return null;
        }

        return {
            text,
            description: descriptionInput?.value.trim() || '',
            priority: prioritySelect?.value || 'medium',
            category: categorySelect?.value || '',
            date: date || StorageManager.getCurrentDateString(),
            dueDate: dueDate || null,
            carryForward: carryForwardCheckbox?.checked !== false,
            completed: completedCheckbox?.checked || false
        };
    }

    /**
     * Delete todo item
     */
    static async deleteTodo(todoId) {
        try {
            const todo = this.todoItems.find(item => item.id === todoId);
            if (!todo) {
                throw new Error('Todo item not found');
            }

            // Confirm deletion
            const confirmMessage = `Are you sure you want to delete "${todo.text}"?`;
            if (!confirm(confirmMessage)) {
                return;
            }

            // Delete from storage
            await StorageManager.deleteFromStore('todos', todo.id);

            // Remove from local array
            const index = this.todoItems.findIndex(item => item.id === todoId);
            if (index !== -1) {
                this.todoItems.splice(index, 1);
            }

            // Re-render
            this.renderTodoItems();

            // Hide modal if open and show success
            app.hideModal();
            app.showSuccess('Todo deleted successfully!');

            console.log('Todo deleted:', todo.text);

        } catch (error) {
            console.error('Failed to delete todo:', error);
            app.showError('Failed to delete todo item');
        }
    }

    /**
     * Carry todo to today
     */
    static async carryTodoToToday(todoId) {
        try {
            const todo = this.todoItems.find(item => item.id === todoId);
            if (!todo) {
                throw new Error('Todo item not found');
            }

            const today = StorageManager.getCurrentDateString();
            
            // Update todo date
            todo.carriedFrom = todo.carriedFrom || todo.date;
            todo.date = today;
            todo.carryCount = (todo.carryCount || 0) + 1;
            todo.updatedAt = new Date().toISOString();

            // Auto-promote priority if carried multiple times
            if (todo.carryCount >= 3 && todo.priority !== 'high') {
                todo.priority = 'high';
                todo.autoPromoted = true;
            }

            // Save to storage
            await StorageManager.saveToStore('todos', todo);

            // Update local array
            const index = this.todoItems.findIndex(item => item.id === todoId);
            if (index !== -1) {
                this.todoItems[index] = todo;
                this.sortTodos();
            }

            // Re-render
            this.renderTodoItems();

            app.showSuccess(`Todo moved to today${todo.autoPromoted ? ' and promoted to high priority' : ''}!`);

            console.log('Todo carried to today:', todo.text);

        } catch (error) {
            console.error('Failed to carry todo:', error);
            app.showError('Failed to move todo to today');
        }
    }

    /**
     * Update todo statistics display
     */
    static updateTodoStatistics(filteredTodos) {
        const totalTodos = filteredTodos.length;
        const completedTodos = filteredTodos.filter(todo => todo.completed).length;
        const pendingTodos = totalTodos - completedTodos;
        const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

        // Update section header with statistics
        const sectionHeader = document.querySelector('#todos-section .section-header h2');
        if (sectionHeader) {
            sectionHeader.innerHTML = `ToDos <span class="todo-stats-badge">${pendingTodos} active, ${completedTodos} done (${completionRate}%)</span>`;
        }
    }

    /**
     * Handle daily reset
     */
    static async handleDailyReset(event) {
        console.log('Daily reset detected, refreshing todos...');
        
        // Update current date
        this.currentDate = StorageManager.getCurrentDateString();
        
        // Show carryforward summary if there were carried todos
        const carryforwardSummary = await this.getCarryforwardSummary();
        if (carryforwardSummary.carriedCount > 0) {
            this.showCarryforwardSummary(carryforwardSummary);
        }
        
        // Reload todo data (carryforward handled by DailyResetManager)
        await this.loadTodoData();
        
        // Re-render
        this.renderTodoItems();
        
        console.log('Todos refreshed after daily reset');
    }

    /**
     * Get carryforward summary for display
     */
    static async getCarryforwardSummary() {
        try {
            const today = StorageManager.getCurrentDateString();
            const allTodos = await StorageManager.getAllFromStore('todos') || [];
            
            const carriedTodos = allTodos.filter(todo => 
                todo.date === today && 
                todo.carriedFrom && 
                todo.carriedFrom !== today
            );

            const promotedTodos = carriedTodos.filter(todo => todo.autoPromoted);
            
            return {
                carriedCount: carriedTodos.length,
                promotedCount: promotedTodos.length,
                carriedTodos: carriedTodos,
                promotedTodos: promotedTodos
            };
        } catch (error) {
            console.error('Failed to get carryforward summary:', error);
            return { carriedCount: 0, promotedCount: 0, carriedTodos: [], promotedTodos: [] };
        }
    }

    /**
     * Show carryforward summary notification
     */
    static showCarryforwardSummary(summary) {
        const notification = document.createElement('div');
        notification.className = 'carryforward-notification';
        
        const promotedText = summary.promotedCount > 0 ? 
            `, ${summary.promotedCount} promoted to high priority` : '';

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">↗️</span>
                <div class="notification-text">
                    <strong>Daily Carryforward</strong>
                    <p>${summary.carriedCount} incomplete todo(s) carried to today${promotedText}</p>
                </div>
                <div class="notification-actions">
                    <button class="notification-btn view-btn" onclick="TodosManager.showCarryforwardModal()">View Details</button>
                    <button class="notification-btn dismiss-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
            </div>
        `;

        // Add to todos section
        const todosSection = document.getElementById('todos-section');
        if (todosSection) {
            const container = todosSection.querySelector('.todos-container');
            if (container) {
                container.insertBefore(notification, container.firstChild);
                
                // Auto-hide after 15 seconds
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 15000);
            }
        }
    }

    /**
     * Show detailed carryforward modal
     */
    static async showCarryforwardModal() {
        try {
            const summary = await this.getCarryforwardSummary();
            const modalContent = this.createCarryforwardModal(summary);
            app.showModal(modalContent);
        } catch (error) {
            console.error('Failed to show carryforward modal:', error);
            app.showError('Failed to load carryforward details');
        }
    }

    /**
     * Create carryforward details modal
     */
    static createCarryforwardModal(summary) {
        const carriedItems = summary.carriedTodos.map(todo => `
            <div class="carryforward-item ${todo.autoPromoted ? 'promoted' : ''}">
                <div class="item-info">
                    <span class="item-text">${this.escapeHtml(todo.text)}</span>
                    <span class="item-meta">
                        From: ${this.formatDateRelative(todo.carriedFrom)} 
                        ${todo.carryCount ? `(${todo.carryCount} times)` : ''}
                    </span>
                </div>
                <div class="item-priority">
                    ${this.getPriorityIcon(todo.priority)} ${this.formatPriorityName(todo.priority)}
                    ${todo.autoPromoted ? '<span class="promoted-badge">Auto-promoted!</span>' : ''}
                </div>
            </div>
        `).join('');

        return `
            <div class="modal-header">
                <h3 class="modal-title">📋 Daily Carryforward Summary</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body carryforward-modal">
                <div class="carryforward-stats">
                    <div class="stat-box">
                        <span class="stat-number">${summary.carriedCount}</span>
                        <span class="stat-label">Todos Carried</span>
                    </div>
                    <div class="stat-box promoted">
                        <span class="stat-number">${summary.promotedCount}</span>
                        <span class="stat-label">Auto-promoted</span>
                    </div>
                </div>
                
                ${summary.carriedCount > 0 ? `
                    <div class="carryforward-items">
                        <h4>Carried Todos:</h4>
                        ${carriedItems}
                    </div>
                ` : ''}
                
                <div class="carryforward-tips">
                    <h4>💡 Tips:</h4>
                    <ul>
                        <li>Todos carried 3+ times are automatically promoted to high priority</li>
                        <li>Use "Bulk Actions" to manage multiple todos at once</li>
                        <li>Set specific due dates to avoid repeated carrying</li>
                        <li>Disable carryforward for individual todos if needed</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Close</button>
                <button class="btn btn-primary" onclick="TodosManager.showBulkActionsModal()">Manage Todos</button>
            </div>
        `;
    }

    /**
     * Show bulk actions modal for managing multiple todos
     */
    static showBulkActionsModal() {
        const modalContent = this.createBulkActionsModal();
        app.showModal(modalContent);
    }

    /**
     * Create bulk actions modal
     */
    static createBulkActionsModal() {
        const today = StorageManager.getCurrentDateString();
        const activeTodos = this.todoItems.filter(todo => !todo.completed);
        const carriedTodos = activeTodos.filter(todo => todo.carriedFrom && todo.carriedFrom !== today);
        const overdueTodos = activeTodos.filter(todo => this.isTodoOverdue(todo));

        return `
            <div class="modal-header">
                <h3 class="modal-title">⚡ Bulk Actions</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body bulk-actions-modal">
                <div class="bulk-stats">
                    <div class="stat-item">
                        <span class="stat-value">${activeTodos.length}</span>
                        <span class="stat-label">Active Todos</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${carriedTodos.length}</span>
                        <span class="stat-label">Carried</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${overdueTodos.length}</span>
                        <span class="stat-label">Overdue</span>
                    </div>
                </div>

                <div class="bulk-actions-grid">
                    <div class="action-group">
                        <h4>📅 Date Actions</h4>
                        <button class="bulk-btn" onclick="TodosManager.bulkMoveToToday()" 
                                ${carriedTodos.length === 0 ? 'disabled' : ''}>
                            Move All Carried to Today (${carriedTodos.length})
                        </button>
                        <button class="bulk-btn" onclick="TodosManager.bulkMoveToTomorrow()" 
                                ${overdueTodos.length === 0 ? 'disabled' : ''}>
                            Move Overdue to Tomorrow (${overdueTodos.length})
                        </button>
                        <button class="bulk-btn" onclick="TodosManager.bulkSetDueDates()">
                            Set Due Dates for Active Todos
                        </button>
                    </div>

                    <div class="action-group">
                        <h4>🔄 Priority Actions</h4>
                        <button class="bulk-btn" onclick="TodosManager.bulkSetPriority('high')">
                            Set All Active to High Priority
                        </button>
                        <button class="bulk-btn" onclick="TodosManager.bulkPromoteOverdue()" 
                                ${overdueTodos.length === 0 ? 'disabled' : ''}>
                            Promote Overdue to High (${overdueTodos.length})
                        </button>
                        <button class="bulk-btn" onclick="TodosManager.bulkResetCarryCount()">
                            Reset Carry Counts
                        </button>
                    </div>

                    <div class="action-group">
                        <h4>⚙️ Management Actions</h4>
                        <button class="bulk-btn" onclick="TodosManager.bulkToggleCarryforward(false)">
                            Disable Carryforward for All
                        </button>
                        <button class="bulk-btn" onclick="TodosManager.bulkToggleCarryforward(true)">
                            Enable Carryforward for All
                        </button>
                        <button class="bulk-btn danger" onclick="TodosManager.bulkDeleteCompleted()">
                            Delete All Completed Todos
                        </button>
                    </div>
                </div>

                <div class="bulk-warning">
                    <strong>⚠️ Warning:</strong> Bulk actions cannot be undone. Make sure you want to apply these changes.
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            </div>
        `;
    }

    /**
     * Bulk move carried todos to today
     */
    static async bulkMoveToToday() {
        try {
            const today = StorageManager.getCurrentDateString();
            const carriedTodos = this.todoItems.filter(todo => 
                !todo.completed && 
                todo.carriedFrom && 
                todo.carriedFrom !== today && 
                todo.date !== today
            );

            if (carriedTodos.length === 0) {
                app.showError('No carried todos to move');
                return;
            }

            if (!confirm(`Move ${carriedTodos.length} carried todo(s) to today?`)) {
                return;
            }

            let updateCount = 0;
            for (const todo of carriedTodos) {
                todo.date = today;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Moved ${updateCount} todos to today`);

        } catch (error) {
            console.error('Bulk move to today failed:', error);
            app.showError('Failed to move todos');
        }
    }

    /**
     * Bulk move overdue todos to tomorrow
     */
    static async bulkMoveToTomorrow() {
        try {
            const tomorrow = this.getTomorrowString();
            const overdueTodos = this.todoItems.filter(todo => 
                !todo.completed && 
                this.isTodoOverdue(todo)
            );

            if (overdueTodos.length === 0) {
                app.showError('No overdue todos to move');
                return;
            }

            if (!confirm(`Move ${overdueTodos.length} overdue todo(s) to tomorrow?`)) {
                return;
            }

            let updateCount = 0;
            for (const todo of overdueTodos) {
                todo.date = tomorrow;
                todo.carriedFrom = todo.carriedFrom || todo.date;
                todo.carryCount = (todo.carryCount || 0) + 1;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Moved ${updateCount} overdue todos to tomorrow`);

        } catch (error) {
            console.error('Bulk move to tomorrow failed:', error);
            app.showError('Failed to move todos');
        }
    }

    /**
     * Bulk set priority for active todos
     */
    static async bulkSetPriority(priority) {
        try {
            const activeTodos = this.todoItems.filter(todo => !todo.completed);

            if (activeTodos.length === 0) {
                app.showError('No active todos to update');
                return;
            }

            if (!confirm(`Set priority to ${priority} for ${activeTodos.length} active todo(s)?`)) {
                return;
            }

            let updateCount = 0;
            for (const todo of activeTodos) {
                todo.priority = priority;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Updated priority for ${updateCount} todos`);

        } catch (error) {
            console.error('Bulk set priority failed:', error);
            app.showError('Failed to update priorities');
        }
    }

    /**
     * Bulk promote overdue todos to high priority
     */
    static async bulkPromoteOverdue() {
        try {
            const overdueTodos = this.todoItems.filter(todo => 
                !todo.completed && 
                this.isTodoOverdue(todo) && 
                todo.priority !== 'high'
            );

            if (overdueTodos.length === 0) {
                app.showError('No overdue todos to promote');
                return;
            }

            if (!confirm(`Promote ${overdueTodos.length} overdue todo(s) to high priority?`)) {
                return;
            }

            let updateCount = 0;
            for (const todo of overdueTodos) {
                todo.priority = 'high';
                todo.autoPromoted = true;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Promoted ${updateCount} overdue todos to high priority`);

        } catch (error) {
            console.error('Bulk promote overdue failed:', error);
            app.showError('Failed to promote todos');
        }
    }

    /**
     * Bulk toggle carryforward setting
     */
    static async bulkToggleCarryforward(enable) {
        try {
            const activeTodos = this.todoItems.filter(todo => !todo.completed);

            if (activeTodos.length === 0) {
                app.showError('No active todos to update');
                return;
            }

            const action = enable ? 'enable' : 'disable';
            if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} carryforward for ${activeTodos.length} active todo(s)?`)) {
                return;
            }

            let updateCount = 0;
            for (const todo of activeTodos) {
                todo.carryForward = enable;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`${enable ? 'Enabled' : 'Disabled'} carryforward for ${updateCount} todos`);

        } catch (error) {
            console.error('Bulk toggle carryforward failed:', error);
            app.showError('Failed to update carryforward settings');
        }
    }

    /**
     * Bulk reset carry counts
     */
    static async bulkResetCarryCount() {
        try {
            const carriedTodos = this.todoItems.filter(todo => 
                !todo.completed && 
                (todo.carryCount || 0) > 0
            );

            if (carriedTodos.length === 0) {
                app.showError('No todos with carry counts to reset');
                return;
            }

            if (!confirm(`Reset carry counts for ${carriedTodos.length} todo(s)?`)) {
                return;
            }

            let updateCount = 0;
            for (const todo of carriedTodos) {
                todo.carryCount = 0;
                todo.autoPromoted = false;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Reset carry counts for ${updateCount} todos`);

        } catch (error) {
            console.error('Bulk reset carry count failed:', error);
            app.showError('Failed to reset carry counts');
        }
    }

    /**
     * Bulk delete completed todos
     */
    static async bulkDeleteCompleted() {
        try {
            const completedTodos = this.todoItems.filter(todo => todo.completed);

            if (completedTodos.length === 0) {
                app.showError('No completed todos to delete');
                return;
            }

            if (!confirm(`Permanently delete ${completedTodos.length} completed todo(s)? This cannot be undone.`)) {
                return;
            }

            let deleteCount = 0;
            for (const todo of completedTodos) {
                await StorageManager.deleteFromStore('todos', todo.id);
                deleteCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Deleted ${deleteCount} completed todos`);

        } catch (error) {
            console.error('Bulk delete completed failed:', error);
            app.showError('Failed to delete completed todos');
        }
    }

    /**
     * Bulk set due dates for active todos
     */
    static bulkSetDueDates() {
        const activeTodos = this.todoItems.filter(todo => !todo.completed);
        
        if (activeTodos.length === 0) {
            app.showError('No active todos to set due dates for');
            return;
        }

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">📅 Bulk Set Due Dates</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Set due dates for ${activeTodos.length} active todo(s)</p>
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" class="form-input" id="bulkDueDate" 
                           min="${StorageManager.getCurrentDateString()}"
                           max="${this.getDaysFromNow(365)}">
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="overwriteExisting">
                        <span class="checkmark"></span>
                        Overwrite existing due dates
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
                <button class="btn btn-primary" onclick="TodosManager.executeBulkSetDueDates()">Set Due Dates</button>
            </div>
        `;

        app.showModal(modalContent);
    }

    /**
     * Execute bulk set due dates
     */
    static async executeBulkSetDueDates() {
        try {
            const dueDateInput = document.getElementById('bulkDueDate');
            const overwriteCheckbox = document.getElementById('overwriteExisting');

            if (!dueDateInput.value) {
                app.showError('Please select a due date');
                return;
            }

            const dueDate = dueDateInput.value;
            const overwrite = overwriteCheckbox.checked;
            const activeTodos = this.todoItems.filter(todo => !todo.completed);

            const todosToUpdate = overwrite ? 
                activeTodos : 
                activeTodos.filter(todo => !todo.dueDate);

            let updateCount = 0;
            for (const todo of todosToUpdate) {
                todo.dueDate = dueDate;
                todo.updatedAt = new Date().toISOString();
                await StorageManager.saveToStore('todos', todo);
                updateCount++;
            }

            app.hideModal();
            await this.refresh();
            app.showSuccess(`Set due dates for ${updateCount} todos`);

        } catch (error) {
            console.error('Bulk set due dates failed:', error);
            app.showError('Failed to set due dates');
        }
    }

    /**
     * Refresh todos display
     */
    static async refresh() {
        if (!this.isInitialized) return;
        
        await this.loadTodoData();
        this.renderTodoItems();
    }

    /**
     * Get comprehensive todo statistics
     */
    static getStatistics() {
        const today = StorageManager.getCurrentDateString();
        const yesterday = this.getDaysAgo(1);
        const thisWeek = this.getDaysAgo(7);
        const thisMonth = this.getDaysAgo(30);

        const todayTodos = this.todoItems.filter(todo => todo.date === today);
        const yesterdayTodos = this.todoItems.filter(todo => todo.date === yesterday);
        const thisWeekTodos = this.todoItems.filter(todo => todo.date >= thisWeek);
        const thisMonthTodos = this.todoItems.filter(todo => todo.date >= thisMonth);
        
        const overdueTodos = this.todoItems.filter(todo => todo.date < today && !todo.completed);
        const highPriorityTodos = this.todoItems.filter(todo => todo.priority === 'high' && !todo.completed);
        const carriedTodos = this.todoItems.filter(todo => todo.carriedFrom && todo.carriedFrom !== todo.date);

        // Category distribution
        const categoryStats = this.getCategoryStatistics();
        
        // Priority distribution
        const priorityStats = this.getPriorityStatistics();
        
        // Completion trends
        const completionTrends = this.getCompletionTrends();

        return {
            // Basic counts
            totalTodos: this.todoItems.length,
            completedTodos: this.todoItems.filter(todo => todo.completed).length,
            pendingTodos: this.todoItems.filter(todo => !todo.completed).length,
            
            // Time-based stats
            todayTodos: todayTodos.length,
            completedTodayTodos: todayTodos.filter(todo => todo.completed).length,
            yesterdayTodos: yesterdayTodos.length,
            completedYesterdayTodos: yesterdayTodos.filter(todo => todo.completed).length,
            thisWeekTodos: thisWeekTodos.length,
            completedThisWeekTodos: thisWeekTodos.filter(todo => todo.completed).length,
            thisMonthTodos: thisMonthTodos.length,
            completedThisMonthTodos: thisMonthTodos.filter(todo => todo.completed).length,
            
            // Special categories
            overdueTodos: overdueTodos.length,
            highPriorityTodos: highPriorityTodos.length,
            carriedTodos: carriedTodos.length,
            
            // Advanced analytics
            categoryStats,
            priorityStats,
            completionTrends,
            
            // Completion rates
            todayCompletionRate: todayTodos.length > 0 ? Math.round((todayTodos.filter(t => t.completed).length / todayTodos.length) * 100) : 0,
            yesterdayCompletionRate: yesterdayTodos.length > 0 ? Math.round((yesterdayTodos.filter(t => t.completed).length / yesterdayTodos.length) * 100) : 0,
            weekCompletionRate: thisWeekTodos.length > 0 ? Math.round((thisWeekTodos.filter(t => t.completed).length / thisWeekTodos.length) * 100) : 0,
            monthCompletionRate: thisMonthTodos.length > 0 ? Math.round((thisMonthTodos.filter(t => t.completed).length / thisMonthTodos.length) * 100) : 0,
            
            // Averages
            avgTodosPerDay: Math.round(thisWeekTodos.length / 7),
            avgCompletionPerDay: Math.round(thisWeekTodos.filter(t => t.completed).length / 7)
        };
    }

    /**
     * Get category-based statistics
     */
    static getCategoryStatistics() {
        const stats = {};
        
        this.categories.forEach(category => {
            const categoryTodos = this.todoItems.filter(todo => todo.category === category);
            const completedCategoryTodos = categoryTodos.filter(todo => todo.completed);
            
            stats[category] = {
                total: categoryTodos.length,
                completed: completedCategoryTodos.length,
                pending: categoryTodos.length - completedCategoryTodos.length,
                completionRate: categoryTodos.length > 0 ? Math.round((completedCategoryTodos.length / categoryTodos.length) * 100) : 0
            };
        });

        // Add uncategorized todos
        const uncategorized = this.todoItems.filter(todo => !todo.category || todo.category === '');
        const completedUncategorized = uncategorized.filter(todo => todo.completed);
        
        stats['uncategorized'] = {
            total: uncategorized.length,
            completed: completedUncategorized.length,
            pending: uncategorized.length - completedUncategorized.length,
            completionRate: uncategorized.length > 0 ? Math.round((completedUncategorized.length / uncategorized.length) * 100) : 0
        };

        return stats;
    }

    /**
     * Get priority-based statistics
     */
    static getPriorityStatistics() {
        const stats = {};
        
        this.priorities.forEach(priority => {
            const priorityTodos = this.todoItems.filter(todo => todo.priority === priority);
            const completedPriorityTodos = priorityTodos.filter(todo => todo.completed);
            
            stats[priority] = {
                total: priorityTodos.length,
                completed: completedPriorityTodos.length,
                pending: priorityTodos.length - completedPriorityTodos.length,
                completionRate: priorityTodos.length > 0 ? Math.round((completedPriorityTodos.length / priorityTodos.length) * 100) : 0
            };
        });

        return stats;
    }

    /**
     * Get completion trends over time
     */
    static getCompletionTrends() {
        const trends = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = this.getDaysAgo(i);
            const dateTodos = this.todoItems.filter(todo => todo.date === date);
            const completedDateTodos = dateTodos.filter(todo => todo.completed);
            
            trends.push({
                date,
                total: dateTodos.length,
                completed: completedDateTodos.length,
                completionRate: dateTodos.length > 0 ? Math.round((completedDateTodos.length / dateTodos.length) * 100) : 0
            });
        }

        return trends;
    }

    /**
     * Advanced search functionality
     */
    static searchTodos(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return this.todoItems;
        }

        const searchTerm = query.toLowerCase().trim();
        const {
            searchInText = true,
            searchInDescription = true,
            searchInCategory = true,
            caseSensitive = false,
            exactMatch = false
        } = options;

        return this.todoItems.filter(todo => {
            const text = caseSensitive ? todo.text : todo.text.toLowerCase();
            const description = caseSensitive ? (todo.description || '') : (todo.description || '').toLowerCase();
            const category = caseSensitive ? (todo.category || '') : (todo.category || '').toLowerCase();
            
            const term = caseSensitive ? query : searchTerm;

            if (exactMatch) {
                return (searchInText && text === term) ||
                       (searchInDescription && description === term) ||
                       (searchInCategory && category === term);
            } else {
                return (searchInText && text.includes(term)) ||
                       (searchInDescription && description.includes(term)) ||
                       (searchInCategory && category.includes(term));
            }
        });
    }

    /**
     * Show advanced search modal
     */
    static showAdvancedSearch() {
        const modalContent = this.createAdvancedSearchModal();
        app.showModal(modalContent);
        
        // Focus on search input
        setTimeout(() => {
            const searchInput = document.getElementById('advancedSearchQuery');
            if (searchInput) searchInput.focus();
        }, 100);
    }

    /**
     * Create advanced search modal
     */
    static createAdvancedSearchModal() {
        return `
            <div class="modal-header">
                <h3 class="modal-title">🔍 Advanced Todo Search</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body advanced-search-modal">
                <div class="search-form">
                    <div class="form-group">
                        <label class="form-label">Search Query</label>
                        <input type="text" class="form-input" id="advancedSearchQuery" 
                               placeholder="Enter search term..."
                               oninput="TodosManager.performLiveSearch()">
                    </div>
                    
                    <div class="search-options">
                        <div class="options-group">
                            <label class="form-label">Search In:</label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="searchInText" checked>
                                <span class="checkmark"></span>
                                Todo Text
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="searchInDescription" checked>
                                <span class="checkmark"></span>
                                Description
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="searchInCategory" checked>
                                <span class="checkmark"></span>
                                Category
                            </label>
                        </div>
                        
                        <div class="options-group">
                            <label class="form-label">Search Options:</label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="caseSensitive">
                                <span class="checkmark"></span>
                                Case Sensitive
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="exactMatch">
                                <span class="checkmark"></span>
                                Exact Match
                            </label>
                        </div>
                    </div>
                    
                    <div class="search-filters">
                        <div class="filter-row">
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select class="form-select" id="searchPriority">
                                    <option value="">Any Priority</option>
                                    <option value="high">🔴 High</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="low">🟢 Low</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select class="form-select" id="searchCategory">
                                    <option value="">Any Category</option>
                                    ${this.categories.map(cat => `<option value="${cat}">${this.getCategoryIcon(cat)} ${this.formatCategoryName(cat)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="filter-row">
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-select" id="searchStatus">
                                    <option value="">Any Status</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Date Range</label>
                                <select class="form-select" id="searchDateRange">
                                    <option value="">Any Date</option>
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="thisWeek">This Week</option>
                                    <option value="thisMonth">This Month</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="search-results">
                    <div class="results-header">
                        <h4>Search Results <span id="searchResultsCount">(0 found)</span></h4>
                    </div>
                    <div id="searchResultsList" class="results-list">
                        <div class="no-results">
                            <p>Enter a search term to find todos</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Close</button>
                <button class="btn btn-primary" onclick="TodosManager.exportSearchResults()">Export Results</button>
            </div>
        `;
    }

    /**
     * Perform live search as user types
     */
    static performLiveSearch() {
        const query = document.getElementById('advancedSearchQuery')?.value || '';
        const searchInText = document.getElementById('searchInText')?.checked || false;
        const searchInDescription = document.getElementById('searchInDescription')?.checked || false;
        const searchInCategory = document.getElementById('searchInCategory')?.checked || false;
        const caseSensitive = document.getElementById('caseSensitive')?.checked || false;
        const exactMatch = document.getElementById('exactMatch')?.checked || false;
        
        const priority = document.getElementById('searchPriority')?.value || '';
        const category = document.getElementById('searchCategory')?.value || '';
        const status = document.getElementById('searchStatus')?.value || '';
        const dateRange = document.getElementById('searchDateRange')?.value || '';

        // Get search results
        let results = this.searchTodos(query, {
            searchInText,
            searchInDescription, 
            searchInCategory,
            caseSensitive,
            exactMatch
        });

        // Apply additional filters
        results = this.applyAdvancedFilters(results, { priority, category, status, dateRange });

        // Update results display
        this.updateSearchResults(results, query);
    }

    /**
     * Apply advanced filters to search results
     */
    static applyAdvancedFilters(todos, filters) {
        const { priority, category, status, dateRange } = filters;
        const today = StorageManager.getCurrentDateString();

        return todos.filter(todo => {
            // Priority filter
            if (priority && todo.priority !== priority) return false;
            
            // Category filter
            if (category && todo.category !== category) return false;
            
            // Status filter
            if (status === 'active' && todo.completed) return false;
            if (status === 'completed' && !todo.completed) return false;
            
            // Date range filter
            if (dateRange) {
                switch (dateRange) {
                    case 'today':
                        if (todo.date !== today) return false;
                        break;
                    case 'yesterday':
                        if (todo.date !== this.getDaysAgo(1)) return false;
                        break;
                    case 'thisWeek':
                        if (todo.date < this.getDaysAgo(7)) return false;
                        break;
                    case 'thisMonth':
                        if (todo.date < this.getDaysAgo(30)) return false;
                        break;
                    case 'overdue':
                        if (todo.date >= today || todo.completed) return false;
                        break;
                }
            }
            
            return true;
        });
    }

    /**
     * Update search results display
     */
    static updateSearchResults(results, query) {
        const resultsContainer = document.getElementById('searchResultsList');
        const resultsCount = document.getElementById('searchResultsCount');
        
        if (!resultsContainer || !resultsCount) return;

        resultsCount.textContent = `(${results.length} found)`;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>${query ? 'No todos found matching your search criteria' : 'Enter a search term to find todos'}</p>
                </div>
            `;
            return;
        }

        const resultsHTML = results.map(todo => `
            <div class="search-result-item" data-todo-id="${todo.id}">
                <div class="result-content">
                    <div class="result-text">${this.escapeHtml(todo.text)}</div>
                    ${todo.description ? `<div class="result-description">${this.escapeHtml(todo.description)}</div>` : ''}
                    <div class="result-meta">
                        <span class="result-priority ${todo.priority}">${this.getPriorityIcon(todo.priority)} ${this.formatPriorityName(todo.priority)}</span>
                        ${todo.category ? `<span class="result-category">${this.getCategoryIcon(todo.category)} ${this.formatCategoryName(todo.category)}</span>` : ''}
                        <span class="result-date">📅 ${this.formatDateRelative(todo.date)}</span>
                        <span class="result-status ${todo.completed ? 'completed' : 'active'}">${todo.completed ? '✅ Completed' : '⏳ Active'}</span>
                    </div>
                </div>
                <div class="result-actions">
                    <button class="result-btn edit-btn" onclick="TodosManager.editTodoFromSearch('${todo.id}')" title="Edit">✏️</button>
                    <button class="result-btn complete-btn" onclick="TodosManager.toggleTodoFromSearch('${todo.id}')" title="${todo.completed ? 'Mark as active' : 'Complete'}">
                        ${todo.completed ? '↩️' : '✅'}
                    </button>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
    }

    /**
     * Edit todo from search results
     */
    static editTodoFromSearch(todoId) {
        app.hideModal();
        setTimeout(() => {
            this.showEditTodoModal(todoId);
        }, 300);
    }

    /**
     * Toggle todo completion from search results
     */
    static async toggleTodoFromSearch(todoId) {
        await this.toggleTodoCompletion(todoId);
        // Refresh search results
        this.performLiveSearch();
    }

    /**
     * Export search results
     */
    static exportSearchResults() {
        const query = document.getElementById('advancedSearchQuery')?.value || '';
        const results = this.getLastSearchResults();
        
        if (!results || results.length === 0) {
            app.showError('No search results to export');
            return;
        }

        const exportData = {
            searchQuery: query,
            searchDate: new Date().toISOString(),
            resultsCount: results.length,
            results: results.map(todo => ({
                id: todo.id,
                text: todo.text,
                description: todo.description,
                priority: todo.priority,
                category: todo.category,
                date: todo.date,
                dueDate: todo.dueDate,
                completed: todo.completed,
                completedAt: todo.completedAt,
                carriedFrom: todo.carriedFrom,
                carryCount: todo.carryCount
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `todo-search-results-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        app.showSuccess(`Exported ${results.length} search results`);
    }

    /**
     * Get last search results (stored temporarily)
     */
    static getLastSearchResults() {
        // This would be set during search
        return this._lastSearchResults || [];
    }

    /**
     * Show comprehensive todo analytics
     */
    static async showTodoAnalytics() {
        try {
            const stats = this.getStatistics();
            const modalContent = this.createAnalyticsModal(stats);
            app.showModal(modalContent);
        } catch (error) {
            console.error('Failed to show analytics:', error);
            app.showError('Failed to load analytics data');
        }
    }

    /**
     * Create analytics modal
     */
    static createAnalyticsModal(stats) {
        const categoryChartData = this.createCategoryChart(stats.categoryStats);
        const priorityChartData = this.createPriorityChart(stats.priorityStats);
        const trendsData = this.createTrendsChart(stats.completionTrends);

        return `
            <div class="modal-header">
                <h3 class="modal-title">📊 Todo Analytics Dashboard</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body analytics-dashboard">
                <!-- Overview Stats -->
                <div class="analytics-section">
                    <h4>📈 Overview</h4>
                    <div class="overview-grid">
                        <div class="stat-card">
                            <div class="stat-number">${stats.totalTodos}</div>
                            <div class="stat-label">Total Todos</div>
                        </div>
                        <div class="stat-card success">
                            <div class="stat-number">${stats.completedTodos}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                        <div class="stat-card pending">
                            <div class="stat-number">${stats.pendingTodos}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-number">${stats.overdueTodos}</div>
                            <div class="stat-label">Overdue</div>
                        </div>
                    </div>
                </div>

                <!-- Completion Rates -->
                <div class="analytics-section">
                    <h4>📊 Completion Rates</h4>
                    <div class="completion-rates">
                        <div class="rate-item">
                            <span class="rate-label">Today</span>
                            <div class="rate-bar">
                                <div class="rate-fill" style="width: ${stats.todayCompletionRate}%"></div>
                            </div>
                            <span class="rate-value">${stats.todayCompletionRate}%</span>
                        </div>
                        <div class="rate-item">
                            <span class="rate-label">This Week</span>
                            <div class="rate-bar">
                                <div class="rate-fill" style="width: ${stats.weekCompletionRate}%"></div>
                            </div>
                            <span class="rate-value">${stats.weekCompletionRate}%</span>
                        </div>
                        <div class="rate-item">
                            <span class="rate-label">This Month</span>
                            <div class="rate-bar">
                                <div class="rate-fill" style="width: ${stats.monthCompletionRate}%"></div>
                            </div>
                            <span class="rate-value">${stats.monthCompletionRate}%</span>
                        </div>
                    </div>
                </div>

                <!-- Category Distribution -->
                <div class="analytics-section">
                    <h4>📋 Category Breakdown</h4>
                    <div class="category-stats">
                        ${Object.entries(stats.categoryStats).map(([category, data]) => `
                            <div class="category-item">
                                <div class="category-header">
                                    <span class="category-name">${category === 'uncategorized' ? '📋 Uncategorized' : this.getCategoryIcon(category) + ' ' + this.formatCategoryName(category)}</span>
                                    <span class="category-total">${data.total} todos</span>
                                </div>
                                <div class="category-progress">
                                    <div class="category-bar">
                                        <div class="category-fill" style="width: ${data.completionRate}%"></div>
                                    </div>
                                    <span class="category-rate">${data.completionRate}%</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 7-Day Trend -->
                <div class="analytics-section">
                    <h4>📈 7-Day Completion Trend</h4>
                    <div class="trends-chart">
                        ${stats.completionTrends.map(day => `
                            <div class="trend-day">
                                <div class="trend-bar" style="height: ${Math.max(day.completionRate, 5)}%"></div>
                                <div class="trend-label">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <div class="trend-value">${day.completionRate}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Performance Insights -->
                <div class="analytics-section">
                    <h4>💡 Insights</h4>
                    <div class="insights-list">
                        ${this.generateInsights(stats).map(insight => `
                            <div class="insight-item ${insight.type}">
                                <span class="insight-icon">${insight.icon}</span>
                                <span class="insight-text">${insight.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.hideModal()">Close</button>
                <button class="btn btn-primary" onclick="TodosManager.exportAnalytics()">Export Analytics</button>
            </div>
        `;
    }

    /**
     * Generate insights based on statistics
     */
    static generateInsights(stats) {
        const insights = [];

        // Completion rate insights
        if (stats.todayCompletionRate >= 80) {
            insights.push({
                type: 'success',
                icon: '🎉',
                text: 'Great job! You\'re completing most of your todos today.'
            });
        } else if (stats.todayCompletionRate < 50) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                text: 'Consider reducing your daily todo load for better completion rates.'
            });
        }

        // Overdue todos
        if (stats.overdueTodos > 5) {
            insights.push({
                type: 'error',
                icon: '🚨',
                text: `You have ${stats.overdueTodos} overdue todos. Consider using bulk actions to reschedule them.`
            });
        }

        // Carried todos
        if (stats.carriedTodos > 3) {
            insights.push({
                type: 'info',
                icon: 'ℹ️',
                text: `${stats.carriedTodos} todos have been carried forward. Consider setting due dates or breaking them into smaller tasks.`
            });
        }

        // High priority todos
        if (stats.highPriorityTodos > 10) {
            insights.push({
                type: 'warning',
                icon: '🔥',
                text: 'You have many high-priority todos. Consider if they all truly need high priority.'
            });
        }

        // Productivity trends
        const avgCompletion = stats.completionTrends.reduce((sum, day) => sum + day.completionRate, 0) / 7;
        if (avgCompletion > 70) {
            insights.push({
                type: 'success',
                icon: '📈',
                text: 'Your completion rate has been consistently good this week!'
            });
        }

        return insights.length > 0 ? insights : [{
            type: 'info',
            icon: '📊',
            text: 'Keep tracking your todos to see more personalized insights.'
        }];
    }

    /**
     * Export comprehensive analytics data
     */
    static exportAnalytics() {
        const stats = this.getStatistics();
        const exportData = {
            exportDate: new Date().toISOString(),
            statistics: stats,
            insights: this.generateInsights(stats),
            rawData: this.todoItems
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `todo-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        app.hideModal();
        app.showSuccess('Analytics exported successfully!');
    }

    /**
     * Backup all todo data
     */
    static async backupTodoData() {
        try {
            const allTodos = await StorageManager.getAllFromStore('todos');
            const backupData = {
                backupDate: new Date().toISOString(),
                version: '1.0',
                todoCount: allTodos.length,
                todos: allTodos,
                statistics: this.getStatistics()
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            app.showSuccess(`Backup created successfully! (${allTodos.length} todos)`);

        } catch (error) {
            console.error('Backup failed:', error);
            app.showError('Failed to create backup');
        }
    }

    /**
     * Restore todo data from backup
     */
    static restoreTodoData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processBackupFile(file);
            }
        };
        input.click();
    }

    /**
     * Process backup file for restoration
     */
    static async processBackupFile(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            if (!backupData.todos || !Array.isArray(backupData.todos)) {
                throw new Error('Invalid backup file format');
            }

            const confirmMessage = `Restore ${backupData.todoCount} todos from backup created on ${new Date(backupData.backupDate).toLocaleDateString()}?\n\nThis will replace all current todos. This action cannot be undone.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }

            // Clear existing todos
            const existingTodos = await StorageManager.getAllFromStore('todos');
            for (const todo of existingTodos) {
                await StorageManager.deleteFromStore('todos', todo.id);
            }

            // Restore todos from backup
            let restoredCount = 0;
            for (const todo of backupData.todos) {
                await StorageManager.saveToStore('todos', todo);
                restoredCount++;
            }

            // Refresh display
            await this.refresh();
            app.showSuccess(`Successfully restored ${restoredCount} todos from backup!`);

        } catch (error) {
            console.error('Restore failed:', error);
            app.showError('Failed to restore from backup: ' + error.message);
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Check if todo is overdue
     */
    static isTodoOverdue(todo) {
        const today = StorageManager.getCurrentDateString();
        return todo.date < today && !todo.completed;
    }

    /**
     * Check if todo is for today
     */
    static isTodoToday(todo) {
        const today = StorageManager.getCurrentDateString();
        return todo.date === today;
    }

    /**
     * Format date relative to today
     */
    static formatDateRelative(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const today = new Date(StorageManager.getCurrentDateString());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateString === today.toISOString().split('T')[0]) {
            return 'Today';
        } else if (dateString === tomorrow.toISOString().split('T')[0]) {
            return 'Tomorrow';
        } else if (dateString === yesterday.toISOString().split('T')[0]) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    /**
     * Get category icon
     */
    static getCategoryIcon(category) {
        const icons = {
            'work': '💼',
            'personal': '🏠',
            'urgent': '🚨',
            'project': '📁',
            'meeting': '🤝',
            'follow-up': '📞'
        };
        return icons[category] || '📋';
    }

    /**
     * Format category name
     */
    static formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
    }

    /**
     * Get priority icon
     */
    static getPriorityIcon(priority) {
        const icons = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        };
        return icons[priority] || '⚪';
    }

    /**
     * Format priority name
     */
    static formatPriorityName(priority) {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    }

    /**
     * Get tomorrow's date string
     */
    static getTomorrowString() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    /**
     * Get date string for one week from now
     */
    static getWeekFromNowString() {
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return weekFromNow.toISOString().split('T')[0];
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
     * Get date string for N days from now
     */
    static getDaysFromNow(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
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
        this.todoItems = [];
        this.isInitialized = false;
        this.currentDate = null;
        this.filters = {
            status: 'all',
            priority: 'all', 
            category: 'all',
            date: 'today'
        };
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.TodosManager = TodosManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodosManager;
}