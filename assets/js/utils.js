/**
 * utils.js — Pure Utility Functions
 * Zero DOM dependency, fully reusable
 * Part of Vanilla Micro-SPA Tool Platform Foundation
 */

const Utils = (() => {
    'use strict';

    /**
     * Generate unique ID with optional prefix
     * @param {string} prefix - ID prefix
     * @returns {string} Unique identifier
     */
    const generateId = (prefix = 'tool') => {
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
     * Deep clone object (simple, for state management)
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    const deepClone = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
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
     * Format date to Persian/English locale
     * @param {Date|string} date - Date to format
     * @param {string} locale - Locale string
     * @returns {string} Formatted date
     */
    const formatDate = (date, locale = 'fa-IR') => {
        const d = new Date(date);
        return d.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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

    // Public API
    return {
        generateId,
        debounce,
        throttle,
        safeJSONParse,
        deepClone,
        isMobileDevice,
        prefersReducedMotion,
        formatDate,
        wait,
        isGitHubPages
    };
})();

// Freeze for immutability
Object.freeze(Utils);
