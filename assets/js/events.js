/**
 * events.js — Lightweight Event Bus
 * Pub/Sub pattern for decoupled communication
 * Part of Vanilla Micro-SPA Tool Platform Foundation
 */

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

        // Return unsubscribe function
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

    /**
     * Get count of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Listener count
     */
    const listenerCount = (event) => {
        return events.has(event) ? events.get(event).size : 0;
    };

    // Event Constants (Centralized)
    const Events = {
        APP_READY: 'app:ready',
        APP_ERROR: 'app:error',
        TOOL_LOADING: 'tool:loading',
        TOOL_LOADED: 'tool:loaded',
        TOOL_ERROR: 'tool:error',
        ACTION_START: 'action:start',
        ACTION_PROGRESS: 'action:progress',
        ACTION_COMPLETE: 'action:complete',
        ACTION_ERROR: 'action:error',
        THEME_CHANGE: 'theme:change',
        NAVIGATION: 'navigation',
        RESIZE: 'resize',
        SIDEBAR_TOGGLE: 'sidebar:toggle'
    };

    // Public API
    return {
        on,
        off,
        emit,
        once,
        clear,
        listenerCount,
        Events
    };
})();

Object.freeze(EventBus);
Object.freeze(EventBus.Events);
