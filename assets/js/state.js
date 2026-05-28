/**
 * state.js — Lightweight Reactive State Manager
 * Observable pattern for SPA state management
 * Part of Vanilla Micro-SPA Tool Platform Foundation
 */

const AppState = (() => {
    'use strict';

    let state = {
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
            status: 'idle' // idle | running | success | error
        },
        // Device Info
        device: {
            isMobile: Utils.isMobileDevice(),
            prefersReducedMotion: Utils.prefersReducedMotion(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        }
    };

    const listeners = new Set();

    /**
     * Get current state (deep clone for immutability)
     * @param {string} path - Optional dot-notation path
     * @returns {*} State value
     */
    const getState = (path = null) => {
        const currentState = Utils.deepClone(state);
        if (!path) return currentState;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, currentState);
    };

    /**
     * Update state partially
     * @param {string} path - Dot-notation path
     * @param {*} value - New value
     */
    const setState = (path, value) => {
        const keys = path.split('.');
        let current = state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        const oldValue = current[keys[keys.length - 1]];
        current[keys[keys.length - 1]] = value;
        
        // Notify listeners only if value changed
        if (oldValue !== value) {
            notify(path, value, oldValue);
        }
    };

    /**
     * Subscribe to state changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    const subscribe = (callback) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
    };

    /**
     * Notify all listeners of state change
     * @param {string} path - Changed path
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    const notify = (path, newValue, oldValue) => {
        listeners.forEach(callback => {
            try {
                callback({ path, newValue, oldValue, state: getState() });
            } catch (error) {
                console.error('[AppState] Listener error:', error);
            }
        });
        
        // Also emit via EventBus for cross-module communication
        EventBus.emit('state:change', { path, newValue, oldValue });
    };

    /**
     * Reset state to initial values
     */
    const resetState = () => {
        state = Utils.deepClone({
            app: { ready: false, version: '1.0.0', environment: Utils.isGitHubPages() ? 'production' : 'development' },
            ui: { sidebarCollapsed: false, currentView: 'dashboard', activeTool: null, isLoading: false, loadingMessage: '' },
            theme: { mode: 'dark', accentColor: '#ff6b35' },
            execution: { isRunning: false, currentAction: null, progress: 0, status: 'idle' },
            device: { isMobile: Utils.isMobileDevice(), prefersReducedMotion: Utils.prefersReducedMotion(), viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }
        });
        notify('*', state, null);
    };

    /**
     * Debug: Log current state to console
     */
    const debug = () => {
        console.group('🔍 AppState Debug');
        console.log('Full State:', getState());
        console.log('Listeners:', listeners.size);
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

Object.freeze(AppState);
