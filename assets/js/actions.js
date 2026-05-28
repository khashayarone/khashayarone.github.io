/**
 * actions.js — Action Registry & Execution Engine
 * Defines real action entities, execution state, and history
 * Part of Vanilla Micro-SPA Tool Platform — Phase 3 Data Layer
 */

const ActionRegistry = (() => {
    'use strict';

    // Private action definitions
    const actionDefinitions = new Map();
    
    // Execution history (max 50 entries)
    const history = [];
    const MAX_HISTORY = 50;

    /**
     * Register a new action type
     * @param {string} id - Unique action identifier
     * @param {Object} definition - Action metadata and handler
     */
    const register = (id, definition) => {
        if (actionDefinitions.has(id)) {
            console.warn(`⚠️ Action "${id}" already registered — overwriting`);
        }
        
        actionDefinitions.set(id, {
            id,
            title: definition.title || id,
            description: definition.description || '',
            icon: definition.icon || 'zap',
            category: definition.category || 'general',
            estimatedDuration: definition.estimatedDuration || 1000,
            handler: definition.handler || null
        });
    };

    /**
     * Execute an action by ID
     * @param {string} actionId - Registered action ID
     * @param {Object} params - Action parameters
     * @returns {Promise} Execution result
     */
    const execute = async (actionId, params = {}) => {
        const definition = actionDefinitions.get(actionId);
        
        if (!definition) {
            throw new Error(`Action "${actionId}" not registered`);
        }

        const executionId = Utils.generateId('exec');
        const startTime = Date.now();

        // Create execution record
        const execution = {
            id: executionId,
            actionId,
            title: definition.title,
            params,
            status: 'running', // running | success | error
            progress: 0,
            startTime,
            endTime: null,
            duration: null,
            result: null,
            error: null
        };

        // Add to history immediately
        addToHistory(execution);

        // Emit start event
        EventBus.emit(EventBus.Events.ACTION_START, execution);
        AppState.setState('execution.isRunning', true);
        AppState.setState('execution.currentAction', executionId);
        AppState.setState('execution.status', 'running');
        AppState.setState('execution.progress', 0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                if (execution.progress < 90) {
                    execution.progress += Math.random() * 15;
                    if (execution.progress > 90) execution.progress = 90;
                    
                    AppState.setState('execution.progress', Math.round(execution.progress));
                    EventBus.emit(EventBus.Events.ACTION_PROGRESS, {
                        id: executionId,
                        progress: Math.round(execution.progress)
                    });
                }
            }, definition.estimatedDuration / 10);

            // Execute handler or simulate
            let result;
            if (definition.handler) {
                result = await definition.handler(params);
            } else {
                // Simulated execution
                await Utils.wait(definition.estimatedDuration);
                result = { success: true, message: `Action "${definition.title}" completed` };
            }

            clearInterval(progressInterval);

            // Mark success
            execution.status = 'success';
            execution.progress = 100;
            execution.result = result;
            execution.endTime = Date.now();
            execution.duration = execution.endTime - startTime;

            AppState.setState('execution.status', 'success');
            AppState.setState('execution.progress', 100);
            EventBus.emit(EventBus.Events.ACTION_COMPLETE, execution);

            return execution;

        } catch (error) {
            // Mark error
            execution.status = 'error';
            execution.error = error.message;
            execution.endTime = Date.now();
            execution.duration = execution.endTime - startTime;

            AppState.setState('execution.status', 'error');
            AppState.setState('execution.progress', 0);
            EventBus.emit(EventBus.Events.ACTION_ERROR, execution);

            throw error;
        } finally {
            AppState.setState('execution.isRunning', false);
            updateStats();
        }
    };

    /**
     * Add execution to history
     * @param {Object} execution - Execution record
     */
    const addToHistory = (execution) => {
        history.unshift(execution);
        if (history.length > MAX_HISTORY) {
            history.pop();
        }
        EventBus.emit('history:updated', getHistory());
    };

    /**
     * Get execution history
     * @param {number} limit - Max entries to return
     * @returns {Array} History entries
     */
    const getHistory = (limit = 10) => {
        return history.slice(0, limit);
    };

    /**
     * Get action statistics
     * @returns {Object} Aggregated statistics
     */
    const getStats = () => {
        const allExecutions = history;
        const successful = allExecutions.filter(e => e.status === 'success');
        const running = allExecutions.filter(e => e.status === 'running');
        const failed = allExecutions.filter(e => e.status === 'error');

        const avgDuration = successful.length > 0
            ? successful.reduce((sum, e) => sum + (e.duration || 0), 0) / successful.length
            : 0;

        const successRate = allExecutions.length > 0
            ? Math.round((successful.length / allExecutions.length) * 100)
            : 100;

        return {
            total: allExecutions.length,
            active: running.length,
            successful: successful.length,
            failed: failed.length,
            avgDuration: avgDuration,
            successRate: successRate,
            healthStatus: successRate >= 90 ? 'healthy' : successRate >= 70 ? 'degraded' : 'critical'
        };
    };

    /**
     * Update global stats in AppState
     */
    const updateStats = () => {
        const stats = getStats();
        
        AppState.setState('execution.stats', {
            active: stats.active,
            successful: stats.successful,
            failed: stats.failed,
            avgDuration: stats.avgDuration,
            successRate: stats.successRate,
            healthStatus: stats.healthStatus
        });
    };

    /**
     * Get all registered action definitions
     * @returns {Array} Action definitions
     */
    const getDefinitions = () => {
        return Array.from(actionDefinitions.values());
    };

    /**
     * Initialize default actions
     */
    const initDefaultActions = () => {
        // AI Text Generator
        register('ai-text-generator', {
            title: 'تولید متن هوشمند',
            description: 'تولید محتوای متنی با هوش مصنوعی',
            icon: 'sparkles',
            category: 'ai',
            estimatedDuration: 2100
        });

        // Image Optimizer
        register('image-optimizer', {
            title: 'بهینه‌ساز تصاویر',
            description: 'فشرده‌سازی و بهینه‌سازی تصاویر',
            icon: 'image',
            category: 'media',
            estimatedDuration: 3200
        });

        // JSON Formatter
        register('json-formatter', {
            title: 'فرمت‌دهنده JSON',
            description: 'اعتبارسنجی و فرمت داده‌های JSON',
            icon: 'braces',
            category: 'data',
            estimatedDuration: 800
        });

        // Color Picker
        register('color-picker', {
            title: 'انتخاب‌گر رنگ',
            description: 'انتخاب و تبدیل کدهای رنگی',
            icon: 'palette',
            category: 'utility',
            estimatedDuration: 400
        });

        // Base64 Encoder
        register('base64-encoder', {
            title: 'Base64 Encoder',
            description: 'کدگذاری و decode سریع',
            icon: 'binary',
            category: 'utility',
            estimatedDuration: 500
        });

        // GitHub Actions
        register('github-actions', {
            title: 'GitHub Actions',
            description: 'مدیریت و اجرای workflow ها',
            icon: 'github',
            category: 'devops',
            estimatedDuration: 4500
        });

        console.log(`✅ Action Registry — ${actionDefinitions.size} actions registered`);
    };

    // Public API
    return {
        register,
        execute,
        getHistory,
        getStats,
        getDefinitions,
        updateStats,
        initDefaultActions
    };
})();

Object.freeze(ActionRegistry);
