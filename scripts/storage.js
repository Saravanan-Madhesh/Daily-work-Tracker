/**
 * Daily Work Tracker - Enhanced Storage Management System
 * Handles LocalStorage and IndexedDB operations with comprehensive data management
 */

class StorageManager {
    // Class constants
    static DB_NAME = 'DailyWorkTrackerDB';
    static DB_VERSION = 3;
    static DATA_RETENTION_DAYS = 30;
    static db = null;
    static isInitialized = false;

    /**
     * Initialize the storage system
     */
    static async init() {
        try {
            console.log('Initializing Storage Manager...');
            
            // Initialize LocalStorage
            this.initLocalStorage();
            
            // Initialize IndexedDB
            await this.initIndexedDB();
            
            // Run data migrations
            await this.runMigrations();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('Storage Manager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Storage Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize IndexedDB
     */
    static async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                this.createObjectStores(db);
            };
        });
    }

    /**
     * Create IndexedDB object stores
     */
    static createObjectStores(db) {
        // Project roadmap store
        if (!db.objectStoreNames.contains('roadmaps')) {
            const roadmapStore = db.createObjectStore('roadmaps', { keyPath: 'id' });
            roadmapStore.createIndex('projectName', 'projectName', { unique: false });
            roadmapStore.createIndex('startDate', 'startDate', { unique: false });
        }

        // Milestones store
        if (!db.objectStoreNames.contains('milestones')) {
            const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id' });
            milestonesStore.createIndex('projectId', 'projectId', { unique: false });
            milestonesStore.createIndex('date', 'date', { unique: false });
        }

        // Daily checklist items store
        if (!db.objectStoreNames.contains('checklistItems')) {
            const checklistStore = db.createObjectStore('checklistItems', { keyPath: 'id' });
            checklistStore.createIndex('date', 'date', { unique: false });
            checklistStore.createIndex('isTemplate', 'isTemplate', { unique: false });
        }

        // Todo items store
        if (!db.objectStoreNames.contains('todos')) {
            const todosStore = db.createObjectStore('todos', { keyPath: 'id' });
            todosStore.createIndex('date', 'date', { unique: false });
            todosStore.createIndex('completed', 'completed', { unique: false });
            todosStore.createIndex('priority', 'priority', { unique: false });
        }

        // Meetings store
        if (!db.objectStoreNames.contains('meetings')) {
            const meetingsStore = db.createObjectStore('meetings', { keyPath: 'id' });
            meetingsStore.createIndex('date', 'date', { unique: false });
            meetingsStore.createIndex('time', 'time', { unique: false });
            meetingsStore.createIndex('completed', 'completed', { unique: false });
        }

        // Daily journals store (for export history)
        if (!db.objectStoreNames.contains('journals')) {
            const journalsStore = db.createObjectStore('journals', { keyPath: 'id' });
            journalsStore.createIndex('date', 'date', { unique: false });
        }

        console.log('IndexedDB object stores created');
    }

    /**
     * Initialize LocalStorage
     */
    static initLocalStorage() {
        // Test LocalStorage availability
        try {
            const testKey = 'dwt_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            console.log('LocalStorage initialized');
        } catch (error) {
            console.warn('LocalStorage not available:', error);
        }
    }

    /**
     * Run data migrations
     */
    static async runMigrations() {
        try {
            const currentVersion = await this.get('data_version') || 0;
            const targetVersion = 2; // Update this when adding new migrations
            
            console.log(`Running migrations from version ${currentVersion} to ${targetVersion}`);
            
            // Run migrations sequentially
            for (let version = currentVersion + 1; version <= targetVersion; version++) {
                try {
                    await this.runMigration(version);
                    await this.set('data_version', version);
                    console.log(`Migration to version ${version} completed`);
                } catch (error) {
                    console.error(`Migration to version ${version} failed:`, error);
                    throw new Error(`Migration failed at version ${version}: ${error.message}`);
                }
            }
            
            console.log(`Data migrations completed. Current version: ${await this.get('data_version')}`);
        } catch (error) {
            console.error('Migration failed:', error);
            // Don't throw to prevent app from breaking - just log the error
            console.warn('Continuing without migrations...');
        }
    }

    /**
     * Run specific migration version
     */
    static async runMigration(version) {
        switch (version) {
            case 1:
                await this.migrationV1();
                break;
            case 2:
                await this.migrationV2();
                break;
            default:
                console.warn(`No migration defined for version ${version}`);
        }
    }

    /**
     * Migration to version 1 - Initialize default templates
     */
    static async migrationV1() {
        console.log('Running migration V1: Initialize default checklist templates');
        
        try {
            // Initialize default checklist templates
            const defaultTemplates = [
                { 
                    id: 'template_1', 
                    text: 'Support Handling', 
                    isTemplate: true, 
                    order: 1,
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 'template_2', 
                    text: 'Customer Feedback Handling', 
                    isTemplate: true, 
                    order: 2,
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 'template_3', 
                    text: 'Bug Fixes / Customer Bug Fixes', 
                    isTemplate: true, 
                    order: 3,
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 'template_4', 
                    text: 'Peer Test', 
                    isTemplate: true, 
                    order: 4,
                    createdAt: new Date().toISOString()
                }
            ];

            for (const template of defaultTemplates) {
                const checklistModel = this.createChecklistModel(template);
                await this.saveToStore('checklistItems', checklistModel);
            }

            // Initialize default settings
            const defaultSettings = {
                theme: 'light',
                resetTime: '00:00',
                notifications: false,
                autoCarryTodos: true,
                defaultTodoPriority: 'medium'
            };

            await this.set('app_settings', defaultSettings);
            
            console.log('Migration V1 completed: Default templates and settings initialized');
        } catch (error) {
            console.error('Migration V1 failed:', error);
            throw error;
        }
    }

    /**
     * Migration to version 2 - Add data cleanup and optimization
     */
    static async migrationV2() {
        console.log('Running migration V2: Data cleanup and optimization');
        
        try {
            // Initialize checklist history tracking
            await this.initializeChecklistHistory();

            // Set up storage quota monitoring
            await this.initializeStorageQuotaMonitoring();

            // Initialize data integrity checks
            await this.set('data_integrity_enabled', true);
            await this.set('last_integrity_check', new Date().toISOString());
            
            console.log('Migration V2 completed: Data cleanup and optimization finished');
        } catch (error) {
            console.error('Migration V2 failed:', error);
            throw error;
        }
    }

    /**
     * Initialize checklist history tracking
     */
    static async initializeChecklistHistory() {
        try {
            // Create checklist completion history if it doesn't exist
            const existingHistory = await this.get('checklist_history');
            if (!existingHistory) {
                const initialHistory = {
                    startDate: this.getCurrentDateString(),
                    totalDays: 0,
                    completedDays: 0,
                    streak: 0,
                    longestStreak: 0,
                    averageCompletionRate: 0,
                    completionDates: [],
                    monthlyStats: {},
                    lastUpdated: new Date().toISOString()
                };
                
                await this.set('checklist_history', initialHistory);
                console.log('Checklist history tracking initialized');
            }
        } catch (error) {
            console.error('Failed to initialize checklist history:', error);
        }
    }

    /**
     * Initialize storage quota monitoring
     */
    static async initializeStorageQuotaMonitoring() {
        try {
            const quotaSettings = {
                enabled: true,
                maxSizeBytes: 50 * 1024 * 1024, // 50MB default limit
                warningThresholdPercent: 80,
                autoCleanup: true,
                lastCheck: new Date().toISOString(),
                cleanupRules: {
                    oldJournalsRetentionDays: 90,
                    oldChecklistItemsRetentionDays: 60,
                    oldCompletedTodosRetentionDays: 30,
                    oldMeetingsRetentionDays: 180
                }
            };
            
            await this.set('storage_quota_settings', quotaSettings);
            console.log('Storage quota monitoring initialized');
        } catch (error) {
            console.error('Failed to initialize storage quota monitoring:', error);
        }
    }

    // ===== LOCALSTORAGE METHODS =====

    /**
     * Get item from LocalStorage
     */
    static get(key) {
        try {
            const value = localStorage.getItem(`dwt_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return null;
        }
    }

    /**
     * Set item in LocalStorage
     */
    static async set(key, value) {
        try {
            localStorage.setItem(`dwt_${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('LocalStorage set error:', error);
            return false;
        }
    }

    /**
     * Remove item from LocalStorage
     */
    static remove(key) {
        try {
            localStorage.removeItem(`dwt_${key}`);
            return true;
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            return false;
        }
    }

    /**
     * Clear all LocalStorage data
     */
    static clearLocalStorage() {
        try {
            Object.keys(localStorage)
                .filter(key => key.startsWith('dwt_'))
                .forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('LocalStorage clear error:', error);
            return false;
        }
    }

    // ===== INDEXEDDB METHODS =====

    /**
     * Save data to IndexedDB store
     */
    static async saveToStore(storeName, data) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Generate ID if not provided
            if (!data.id) {
                data.id = this.generateId();
            }
            
            // Add timestamp
            data.updatedAt = new Date().toISOString();
            
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(data);
            };

            request.onerror = () => {
                reject(new Error(`Failed to save to ${storeName}`));
            };
        });
    }

    /**
     * Get data from IndexedDB store
     */
    static async getFromStore(storeName, id) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get from ${storeName}`));
            };
        });
    }

    /**
     * Get all data from IndexedDB store
     */
    static async getAllFromStore(storeName, indexName = null, indexValue = null) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && indexValue !== null) {
                const index = store.index(indexName);
                request = index.getAll(indexValue);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get all from ${storeName}`));
            };
        });
    }

    /**
     * Delete data from IndexedDB store
     */
    static async deleteFromStore(storeName, id) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete from ${storeName}`));
            };
        });
    }

    /**
     * Clear all data from IndexedDB store
     */
    static async clearStore(storeName) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear ${storeName}`));
            };
        });
    }

    // ===== DATA MODELS =====

    /**
     * Create a new project roadmap data model
     */
    static createRoadmapModel(data) {
        return {
            id: data.id || this.generateId(),
            projectName: data.projectName || '',
            description: data.description || '',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            status: data.status || 'active', // active, completed, paused
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Create a new milestone data model
     */
    static createMilestoneModel(data) {
        return {
            id: data.id || this.generateId(),
            projectId: data.projectId || 'default',
            title: data.title || '',
            description: data.description || '',
            date: data.date || '',
            completed: data.completed || false,
            completedAt: data.completedAt || null,
            order: data.order || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Create a new checklist item data model
     */
    static createChecklistModel(data) {
        return {
            id: data.id || this.generateId(),
            text: data.text || '',
            completed: data.completed || false,
            date: data.date || this.getCurrentDateString(),
            isTemplate: data.isTemplate || false,
            order: data.order || 0,
            completedAt: data.completedAt || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Create a new todo item data model
     */
    static createTodoModel(data) {
        return {
            id: data.id || this.generateId(),
            text: data.text || '',
            description: data.description || '',
            completed: data.completed || false,
            priority: data.priority || 'medium', // low, medium, high
            date: data.date || this.getCurrentDateString(),
            dueDate: data.dueDate || null,
            category: data.category || '',
            carryForward: data.carryForward !== false, // Default true
            carriedFrom: data.carriedFrom || null,
            completedAt: data.completedAt || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Create a new meeting data model
     */
    static createMeetingModel(data) {
        return {
            id: data.id || this.generateId(),
            title: data.title || '',
            time: data.time || '',
            date: data.date || this.getCurrentDateString(),
            description: data.description || '',
            attendees: data.attendees || [],
            completed: data.completed || false,
            notes: data.notes || '',
            notesUpdatedAt: data.notesUpdatedAt || null,
            completedAt: data.completedAt || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Create a new journal entry data model
     */
    static createJournalModel(data) {
        return {
            id: data.id || this.generateId(),
            date: data.date || this.getCurrentDateString(),
            type: data.type || 'daily', // daily, weekly, monthly, custom
            content: data.content || '',
            metadata: data.metadata || {},
            exported: data.exported || false,
            exportPath: data.exportPath || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    // ===== DATA VALIDATION =====

    /**
     * Validate roadmap data
     */
    static validateRoadmapData(data) {
        const errors = [];
        
        if (!data.projectName || data.projectName.trim().length === 0) {
            errors.push('Project name is required');
        }
        
        if (!data.startDate) {
            errors.push('Start date is required');
        }
        
        if (!data.endDate) {
            errors.push('End date is required');
        }
        
        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            errors.push('End date must be after start date');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate milestone data
     */
    static validateMilestoneData(data) {
        const errors = [];
        
        if (!data.title || data.title.trim().length === 0) {
            errors.push('Milestone title is required');
        }
        
        if (!data.date) {
            errors.push('Milestone date is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate checklist data
     */
    static validateChecklistData(data) {
        const errors = [];
        
        if (!data.text || data.text.trim().length === 0) {
            errors.push('Checklist text is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate todo data
     */
    static validateTodoData(data) {
        const errors = [];
        
        if (!data.text || data.text.trim().length === 0) {
            errors.push('Todo text is required');
        }
        
        if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
            errors.push('Invalid priority level');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate meeting data
     */
    static validateMeetingData(data) {
        const errors = [];
        
        if (!data.title || data.title.trim().length === 0) {
            errors.push('Meeting title is required');
        }
        
        if (!data.time) {
            errors.push('Meeting time is required');
        }
        
        // Validate time format (HH:MM)
        if (data.time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
            errors.push('Invalid time format. Use HH:MM format');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate journal entry data
     */
    static validateJournalData(journal) {
        const errors = [];

        // Required fields
        if (!journal.id) errors.push('Journal ID is required');
        if (!journal.date) errors.push('Journal date is required');
        if (!journal.content || journal.content.trim().length === 0) {
            errors.push('Journal content is required');
        }

        // Field lengths
        if (journal.title && journal.title.length > 200) {
            errors.push('Journal title must be 200 characters or less');
        }
        if (journal.content && journal.content.length > 10000) {
            errors.push('Journal content must be 10,000 characters or less');
        }

        // Date validation
        if (journal.date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(journal.date)) {
                errors.push('Journal date must be in YYYY-MM-DD format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ===== UTILITY METHODS =====

    /**
     * Generate unique ID
     */
    static generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current date string
     */
    static getCurrentDateString() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Format bytes to human readable string
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Export all data for backup
     */
    static async exportAllData() {
        try {
            const data = {
                version: await this.get('data_version') || 1,
                exportDate: new Date().toISOString(),
                localStorage: {},
                indexedDB: {}
            };

            // Export LocalStorage data
            Object.keys(localStorage)
                .filter(key => key.startsWith('dwt_'))
                .forEach(key => {
                    const cleanKey = key.replace('dwt_', '');
                    data.localStorage[cleanKey] = this.get(cleanKey);
                });

            // Export IndexedDB data
            const stores = ['roadmaps', 'milestones', 'checklistItems', 'todos', 'meetings', 'journals'];
            for (const storeName of stores) {
                try {
                    data.indexedDB[storeName] = await this.getAllFromStore(storeName);
                } catch (error) {
                    console.warn(`Could not export ${storeName}:`, error);
                    data.indexedDB[storeName] = [];
                }
            }

            return data;
        } catch (error) {
            console.error('Data export failed:', error);
            throw error;
        }
    }

    /**
     * Import data from backup
     */
    static async importAllData(data) {
        if (!data || !data.version) {
            throw new Error('Invalid backup data');
        }

        try {
            // Import LocalStorage data
            if (data.localStorage) {
                Object.entries(data.localStorage).forEach(([key, value]) => {
                    this.set(key, value);
                });
            }

            // Import IndexedDB data
            if (data.indexedDB) {
                for (const [storeName, items] of Object.entries(data.indexedDB)) {
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            await this.saveToStore(storeName, item);
                        }
                    }
                }
            }

            console.log('Data import completed');
            return true;
        } catch (error) {
            console.error('Data import failed:', error);
            throw error;
        }
    }

    /**
     * Check if storage is initialized
     */
    static checkInitialization() {
        if (!this.isInitialized) {
            console.warn('StorageManager not initialized. Call StorageManager.init() first.');
            return false;
        }
        return true;
    }

    /**
     * Get basic storage information
     */
    static async getStorageInfo() {
        try {
            let localStorageSize = 0;
            try {
                const localStorageItems = Object.keys(localStorage)
                    .filter(key => key.startsWith('dwt_'));
                
                localStorageSize = localStorageItems.reduce((size, key) => {
                    return size + (localStorage.getItem(key) || '').length;
                }, 0);
            } catch (error) {
                console.warn('Could not calculate LocalStorage size:', error);
            }

            // Get IndexedDB usage estimate
            let indexedDBSize = 0;
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                try {
                    const estimate = await navigator.storage.estimate();
                    indexedDBSize = estimate.usage || 0;
                } catch (error) {
                    console.warn('Could not get storage estimate:', error);
                }
            }

            return {
                localStorage: {
                    size: localStorageSize,
                    sizeFormatted: this.formatBytes(localStorageSize)
                },
                indexedDB: {
                    size: indexedDBSize,
                    sizeFormatted: this.formatBytes(indexedDBSize)
                },
                total: {
                    size: localStorageSize + indexedDBSize,
                    sizeFormatted: this.formatBytes(localStorageSize + indexedDBSize)
                }
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return {
                localStorage: { size: 0, sizeFormatted: '0 Bytes' },
                indexedDB: { size: 0, sizeFormatted: '0 Bytes' },
                total: { size: 0, sizeFormatted: '0 Bytes' }
            };
        }
    }

    /**
     * Clean up old data based on retention policies
     */
    static async cleanupOldData() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.DATA_RETENTION_DAYS);
            const cutoffString = cutoffDate.toISOString().split('T')[0];

            console.log(`Cleaning up data older than ${cutoffString}`);

            let totalCleaned = 0;

            // Clean completed todos older than retention period
            const todos = await this.getAllFromStore('todos') || [];
            for (const todo of todos) {
                if (todo.completed && todo.date < cutoffString) {
                    await this.deleteFromStore('todos', todo.id);
                    totalCleaned++;
                }
            }

            // Clean old journal entries (keep last 90 days)
            const journalCutoff = new Date();
            journalCutoff.setDate(journalCutoff.getDate() - 90);
            const journalCutoffString = journalCutoff.toISOString().split('T')[0];

            const journals = await this.getAllFromStore('journals') || [];
            for (const journal of journals) {
                if (journal.date < journalCutoffString) {
                    await this.deleteFromStore('journals', journal.id);
                    totalCleaned++;
                }
            }

            if (totalCleaned > 0) {
                console.log(`Cleaned up ${totalCleaned} old items`);
            }

            return totalCleaned;

        } catch (error) {
            console.error('Data cleanup failed:', error);
            return 0;
        }
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
