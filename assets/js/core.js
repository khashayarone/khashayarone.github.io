/**
 * Khashayar One — Core Module
 * Merged: Utils + EventBus + AppState
 * Part of Khashayar One Tool Platform
 */

// ============================================
// Utils — Pure Utility Functions
// ============================================

const Utils = (() => {
    'use strict';

    /**
     * Generate unique ID with optional prefix
     * @param {string} prefix - ID prefix
     * @returns {string} Unique identifier
     */
    const generateId = (prefix = 'k1') => {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    };

    /**
     * Debounce function for performance optimization
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    const debounce = (fn, delay = 250) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    };

    /**
     * Throttle function for scroll/resize handlers
     * @param {Function} fn - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    const throttle = (fn, limit = 100) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    };

    /**
     * Safe JSON parse with fallback
     * @param {string} str - JSON string to parse
     * @param {*} fallback - Fallback value on error
     * @returns {*} Parsed object or fallback
     */
    const safeJSONParse = (str, fallback = null) => {
        try {
            return JSON.parse(str);
        } catch {
            return fallback;
        }
    };

    /**
     * Deep clone object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    const deepClone = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    };

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped HTML-safe string
     */
    const escapeHtml = (str) => {
        if (!str || typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    /**
     * Check if device is mobile/tablet
     * @returns {boolean} True if touch device
     */
    const isMobileDevice = () => {
        return window.matchMedia('(max-width: 768px)').matches;
    };

    /**
     * Check if reduced motion is preferred
     * @returns {boolean} True if reduced motion
     */
    const prefersReducedMotion = () => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    /**
     * Wait for specified milliseconds
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Promise that resolves after delay
     */
    const wait = (ms = 1000) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    /**
     * Check if running on GitHub Pages
     * @returns {boolean} True if on GitHub Pages
     */
    const isGitHubPages = () => {
        return window.location.hostname.includes('github.io');
    };

    return {
        generateId,
        debounce,
        throttle,
        safeJSONParse,
        deepClone,
        escapeHtml,
        isMobileDevice,
        prefersReducedMotion,
        wait,
        isGitHubPages
    };
})();

Object.freeze(Utils);


// ============================================
// EventBus — Lightweight Pub/Sub System
// ============================================

const EventBus = (() => {
    'use strict';

    const events = new Map();

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    const on = (event, callback) => {
        if (!events.has(event)) {
            events.set(event, new Set());
        }
        events.get(event).add(callback);
        return () => off(event, callback);
    };

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     */
    const off = (event, callback) => {
        if (events.has(event)) {
            events.get(event).delete(callback);
            if (events.get(event).size === 0) {
                events.delete(event);
            }
        }
    };

    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {*} data - Data to pass to subscribers
     */
    const emit = (event, data = null) => {
        if (events.has(event)) {
            events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in "${event}" handler:`, error);
                }
            });
        }
    };

    /**
     * Subscribe to event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    const once = (event, callback) => {
        const wrapper = (data) => {
            callback(data);
            off(event, wrapper);
        };
        on(event, wrapper);
    };

    /**
     * Clear all event listeners
     * @param {string} event - Optional event name to clear specific
     */
    const clear = (event = null) => {
        if (event) {
            events.delete(event);
        } else {
            events.clear();
        }
    };

    // Event Constants
    const Events = {
        APP_READY: 'app:ready',
        APP_ERROR: 'app:error',
        ROUTE_CHANGED: 'route:changed',
        BALE_CONNECTED: 'bale:connected',
        BALE_DISCONNECTED: 'bale:disconnected',
        BALE_CODE_GENERATED: 'bale:code-generated',
        BALE_PREFERENCE_UPDATED: 'bale:preference-updated',
        PLUGIN_LOAD: 'plugin:load',
        PLUGIN_LOADED: 'plugin:loaded',
        PLUGIN_UNLOAD: 'plugin:unload',
        DOWNLOAD_START: 'download:start',
        DOWNLOAD_COMPLETE: 'download:complete',
        DOWNLOAD_ERROR: 'download:error',
        NAVIGATION: 'navigation',
        RESIZE: 'resize',
        STATE_CHANGE: 'state:change'
    };

    return { on, off, emit, once, clear, Events };
})();

Object.freeze(EventBus);
Object.freeze(EventBus.Events);


// ============================================
// AppState — Reactive State Manager
// ============================================

const AppState = (() => {
    'use strict';

    const getInitialState = () => ({
        app: {
            ready: false,
            version: '2.0.0',
            environment: Utils.isGitHubPages() ? 'production' : 'development'
        },
        ui: {
            currentRoute: 'dashboard',
            currentView: 'dashboard',
            isMobile: Utils.isMobileDevice(),
            isLoading: false,
            loadingMessage: ''
        },
        device: {
            isMobile: Utils.isMobileDevice(),
            prefersReducedMotion: Utils.prefersReducedMotion(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        }
    });

    let state = getInitialState();
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
     * @param {string} path - Dot-notation path
     * @param {*} value - New value to set
     */
    const setState = (path, value) => {
        if (!path || typeof path !== 'string') {
            console.error('[AppState] setState requires a valid path string');
            return;
        }

        const keys = path.split('.');
        let current = state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        
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
     */
    const notify = (path, newValue, oldValue) => {
        const currentState = getState();
        
        listeners.forEach(callback => {
            try {
                callback({ path, newValue, oldValue, state: currentState });
            } catch (error) {
                console.error('[AppState] Listener error:', error);
            }
        });
        
        EventBus.emit(EventBus.Events.STATE_CHANGE, { path, newValue, oldValue });
    };

    /**
     * Reset state to initial values
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
        console.groupEnd();
    };

    return { getState, setState, subscribe, resetState, debug };
})();

Object.freeze(AppState);
