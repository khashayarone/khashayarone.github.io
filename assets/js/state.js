/**
 * state.js — Lightweight Reactive State Manager
 * Observable pattern for SPA state management
 * Phase 3: Added execution.stats for real-time dashboard data
 * Part of Vanilla Micro-SPA Tool Platform Foundation
 */

const AppState = (() => {
    'use strict';

    /**
     * Get initial state object
     * Extracted to avoid duplication between init and reset
     */
    const getInitialState = () => ({
        // App Shell
        app: {
            ready: false,
            version: '1.0.0',
            environment: Utils.isGitHubPages() ? 'production' : 'development'
        },
        // UI State
        ui: {
            sidebarCollapsed: false,
            currentView: 'dashboard',
            activeTool: null,
            isLoading: false,
            loadingMessage: ''
        },
        // Theme
        theme: {
            mode: 'dark',
            accentColor: '#ff6b35'
        },
        // Action/Execution State
        execution: {
            isRunning: false,
            currentAction: null,
            progress: 0,
            status: 'idle', // idle | running | success | error
            stats: {
                active: 0,
                successful: 0,
                failed: 0,
                avgDuration: 0,
                successRate: 100,
                healthStatus: 'healthy' // healthy | degraded | critical
            }
        },
        // Device Info
        device: {
            isMobile: Utils.isMobileDevice(),
            prefersReducedMotion: Utils.prefersReducedMotion(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        }
    });

    // Initialize state from factory
    let state = getInitialState();

    // Set of listener callbacks
    const listeners = new Set();

    /**
     * Get current state (deep clone for immutability)
     * @param {string} path - Optional dot-notation path
     * @returns {*} State value or full state object
     */
    const getState = (path = null) => {
        const currentState = Utils.deepClone(state);
        if (!path) return currentState;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, currentState);
    };

    /**
     * Update state partially using dot-notation path
     * @param {string} path - Dot-notation path (e.g., 'execution.stats.active')
     * @param {*} value - New value to set
     */
    const setState = (path, value) => {
        if (!path || typeof path !== 'string') {
            console.error('[AppState] setState requires a valid path string');
            return;
        }

        const keys = path.split('.');
        let current = state;
        
        // Navigate to the nested object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        
        // Only update and notify if value actually changed
        if (oldValue !== value) {
            current[lastKey] = value;
            notify(path, value, oldValue);
        }
    };

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Called with { path, newValue, oldValue, state }
     * @returns {Function} Unsubscribe function
     */
    const subscribe = (callback) => {
        if (typeof callback !== 'function') {
            console.error('[AppState] subscribe requires a function');
            return () => {};
        }
        
        listeners.add(callback);
        return () => listeners.delete(callback);
    };

    /**
     * Notify all listeners of state change
     * @param {string} path - Dot-notation path that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    const notify = (path, newValue, oldValue) => {
        const currentState = getState();
        
        // Notify direct subscribers
        listeners.forEach(callback => {
            try {
                callback({ path, newValue, oldValue, state: currentState });
            } catch (error) {
                console.error('[AppState] Listener error:', error);
            }
        });
        
        // Also emit via EventBus for cross-module communication
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('state:change', { path, newValue, oldValue });
        }
    };

    /**
     * Reset state to initial values and notify all listeners
     */
    const resetState = () => {
        state = getInitialState();
        notify('*', state, null);
    };

    /**
     * Debug: Log current state to console
     */
    const debug = () => {
        console.group('🔍 AppState Debug');
        console.log('Full State:', getState());
        console.log('Listeners:', listeners.size);
        console.log('Execution Stats:', getState('execution.stats'));
        console.groupEnd();
    };

    // Public API
    return {
        getState,
        setState,
        subscribe,
        resetState,
        debug
    };
})();

// Freeze for immutability
Object.freeze(AppState);
