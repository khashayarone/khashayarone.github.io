/**
 * plugin-loader.js — Lazy Plugin Loader
 * Handles dynamic CSS/JS loading, lifecycle, and sandboxing
 * Part of Vanilla Micro-SPA Tool Platform — Phase 4 Plugin System
 */

const PluginLoader = (() => {
    'use strict';

    // Track loaded CSS files to avoid duplicates
    const loadedCSS = new Set();

    /**
     * Load a CSS file dynamically
     * @param {string} path - CSS file path
     * @returns {Promise} Resolves when CSS is loaded
     */
    const loadCSS = (path) => {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (loadedCSS.has(path)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = path;
            link.onload = () => {
                loadedCSS.add(path);
                console.log(`📄 CSS loaded: ${path}`);
                resolve();
            };
            link.onerror = () => {
                console.warn(`⚠️ CSS failed to load: ${path}`);
                resolve(); // Non-critical, resolve anyway
            };
            document.head.appendChild(link);
        });
    };

    /**
     * Load a JavaScript file dynamically
     * @param {string} path - JS file path
     * @returns {Promise} Resolves when JS is loaded and executed
     */
    const loadJS = (path) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            script.onload = () => {
                console.log(`📜 JS loaded: ${path}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ JS failed to load: ${path}`);
                reject(new Error(`Failed to load script: ${path}`));
            };
            document.head.appendChild(script);
        });
    };

    /**
     * Load a plugin by ID
     * @param {string} pluginId - Plugin identifier
     * @returns {Promise<Object>} Plugin definition with instance
     */
    const load = async (pluginId) => {
        const plugin = PluginRegistry.get(pluginId);
        
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" not registered`);
        }

        // Check if already loaded
        if (plugin._loaded && plugin._instance) {
            console.log(`📦 Plugin "${pluginId}" already loaded, reusing instance`);
            return plugin;
        }

        // Emit loading event
        EventBus.emit(EventBus.Events.TOOL_LOADING, { 
            tool: pluginId,
            title: plugin.title 
        });

        // Update state
        AppState.setState('ui.isLoading', true);
        AppState.setState('ui.loadingMessage', `در حال بارگذاری ${plugin.title}...`);

        try {
            // Load CSS first (non-blocking)
            if (plugin.cssPath) {
                await loadCSS(plugin.cssPath);
            }

            // Load JS
            if (plugin.jsPath) {
                await loadJS(plugin.jsPath);
            }

            // Find plugin instance in global scope
            // Plugin should expose itself as window[PluginName] or similar
            const instance = findPluginInstance(pluginId);
            
            if (!instance || typeof instance.init !== 'function') {
                throw new Error(`Plugin "${pluginId}" does not expose a valid init() method`);
            }

            // Mark as loaded
            PluginRegistry.markLoaded(pluginId, instance);

            // Emit loaded event
            EventBus.emit(EventBus.Events.TOOL_LOADED, { 
                tool: pluginId,
                title: plugin.title 
            });

            console.log(`✅ Plugin "${pluginId}" loaded successfully`);
            return PluginRegistry.get(pluginId);

        } catch (error) {
            console.error(`❌ Failed to load plugin "${pluginId}":`, error);
            
            EventBus.emit(EventBus.Events.TOOL_ERROR, { 
                tool: pluginId,
                error: error.message 
            });

            throw error;
        } finally {
            AppState.setState('ui.isLoading', false);
            AppState.setState('ui.loadingMessage', '');
        }
    };

    /**
     * Find plugin instance in global scope
     * Maps plugin IDs to expected global variable names
     * @param {string} pluginId - Plugin identifier
     * @returns {Object|null} Plugin instance
     */
    const findPluginInstance = (pluginId) => {
        // Map plugin IDs to expected global names
        const instanceMap = {
            'movie-finder': 'MovieFinderPlugin',
            'json-formatter': 'JSONFormatterPlugin',
            'image-optimizer': 'ImageOptimizerPlugin',
            'color-picker': 'ColorPickerPlugin',
            'base64-encoder': 'Base64EncoderPlugin',
            'github-actions': 'GitHubActionsPlugin'
        };

        const globalName = instanceMap[pluginId];
        
        if (globalName && window[globalName]) {
            return window[globalName];
        }

        // Fallback: search window for any object with matching init method
        for (const key of Object.keys(window)) {
            const obj = window[key];
            if (obj && typeof obj === 'object' && typeof obj.init === 'function') {
                // Check if this is our plugin by trying to match naming pattern
                if (key.toLowerCase().includes(pluginId.replace(/-/g, '').toLowerCase())) {
                    return obj;
                }
            }
        }

        return null;
    };

    /**
     * Preload a plugin (load in background without initializing)
     * @param {string} pluginId - Plugin identifier
     * @returns {Promise} Resolves when plugin is preloaded
     */
    const preload = async (pluginId) => {
        const plugin = PluginRegistry.get(pluginId);
        if (!plugin || plugin._loaded) return;

        try {
            if (plugin.cssPath) await loadCSS(plugin.cssPath);
            if (plugin.jsPath) await loadJS(plugin.jsPath);
            console.log(`📦 Plugin "${pluginId}" preloaded`);
        } catch (error) {
            console.warn(`⚠️ Preload failed for "${pluginId}":`, error);
        }
    };

    // Public API
    return {
        load,
        preload,
        loadCSS,
        loadJS
    };
})();

Object.freeze(PluginLoader);
