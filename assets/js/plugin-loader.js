/**
 * plugin-loader.js — Lazy Plugin Loader
 * Handles dynamic CSS/JS loading, lifecycle, and sandboxing
 * Part of Vanilla Micro-SPA Tool Platform — Phase 4 Plugin System
 */

const PluginLoader = (() => {
    'use strict';

    // Track loaded CSS files to avoid duplicates
    const loadedCSS = new Set();
    // Track loaded JS files to avoid duplicates
    const loadedJS = new Set();

    /**
     * Load a CSS file dynamically
     * @param {string} path - CSS file path
     * @returns {Promise} Resolves when CSS is loaded
     */
    const loadCSS = (path) => {
        return new Promise((resolve) => {
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
                // Non-critical, resolve anyway so plugin can still try to work
                resolve();
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
            // Check if already loaded
            if (loadedJS.has(path)) {
                console.log(`📜 JS already loaded: ${path}`);
                // Even if loaded, give a small tick for any pending execution
                setTimeout(resolve, 50);
                return;
            }

            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            
            script.onload = () => {
                loadedJS.add(path);
                console.log(`📜 JS loaded: ${path}`);
                // Small delay to ensure any initialization code has run
                setTimeout(resolve, 100);
            };
            
            script.onerror = () => {
                console.error(`❌ JS failed to load: ${path}`);
                reject(new Error(`Failed to load script: ${path}`));
            };
            
            document.head.appendChild(script);
        });
    };

    /**
     * Find plugin instance in global scope
     * Uses multiple strategies to locate the plugin object
     * @param {string} pluginId - Plugin identifier
     * @returns {Object|null} Plugin instance with init() method
     */
    const findPluginInstance = (pluginId) => {
        // Map plugin IDs to expected global variable names
        const instanceMap = {
            'movie-finder': 'MovieFinderPlugin',
            'proxy-finder': 'ProxyFinderPlugin',
            'youtube-downloader': 'YouTubeDownloaderPlugin',
            'youtube-search': 'YouTubeSearchPlugin',
            'soundcloud-downloader': 'SoundCloudDownloaderPlugin',
            'json-formatter': 'JSONFormatterPlugin',
            'image-optimizer': 'ImageOptimizerPlugin',
            'color-picker': 'ColorPickerPlugin',
            'base64-encoder': 'Base64EncoderPlugin',
            'github-actions': 'GitHubActionsPlugin'
        };

        const globalName = instanceMap[pluginId];
        
        // Strategy 1: Direct window lookup by exact name
        if (globalName && window[globalName]) {
            const obj = window[globalName];
            if (typeof obj === 'object' && obj !== null && typeof obj.init === 'function') {
                console.log(`✅ Plugin instance found via window.${globalName}`);
                return obj;
            }
        }

        // Strategy 2: Search all window properties for objects with init() method
        const candidates = [];
        for (const key of Object.keys(window)) {
            try {
                const obj = window[key];
                if (obj && typeof obj === 'object' && obj !== window && obj !== null && typeof obj.init === 'function') {
                    candidates.push({ key, obj });
                }
            } catch (e) {
                // Skip inaccessible properties
            }
        }

        // Strategy 2a: Fuzzy match on plugin ID
        if (globalName) {
            const exactMatch = candidates.find(c => c.key === globalName);
            if (exactMatch) {
                console.log(`✅ Plugin instance found via candidate match: window.${exactMatch.key}`);
                return exactMatch.obj;
            }
        }

        // Strategy 2b: Match by naming pattern
        const idNormalized = pluginId.replace(/-/g, '').toLowerCase();
        const fuzzyMatch = candidates.find(c => {
            const keyLower = c.key.toLowerCase();
            return keyLower.includes(idNormalized) || idNormalized.includes(keyLower);
        });

        if (fuzzyMatch) {
            console.log(`✅ Plugin instance found via fuzzy match: window.${fuzzyMatch.key}`);
            return fuzzyMatch.obj;
        }

        // Strategy 2c: If only one candidate with init(), use it as fallback
        if (candidates.length === 1) {
            console.log(`⚠️ Using only available plugin-like object: window.${candidates[0].key}`);
            return candidates[0].obj;
        }

        // Debug: log all candidates to help diagnose
        console.error(`❌ Plugin instance not found for "${pluginId}".`);
        console.error(`   Expected global name: ${globalName || 'unknown'}`);
        console.error(`   Candidates with init() method:`, candidates.map(c => c.key));
        
        return null;
    };

    /**
     * Load a plugin by ID
     * @param {string} pluginId - Plugin identifier
     * @returns {Promise<Object>} Plugin definition with _instance populated
     */
    const load = async (pluginId) => {
        const plugin = PluginRegistry.get(pluginId);
        
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" not registered in PluginRegistry`);
        }

        // Check if already loaded and has valid instance
        if (plugin._loaded && plugin._instance && typeof plugin._instance.init === 'function') {
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
            // Load CSS first (non-blocking, fire and forget)
            if (plugin.cssPath) {
                loadCSS(plugin.cssPath).catch(err => {
                    console.warn(`⚠️ CSS load warning for ${pluginId}:`, err);
                });
            }

            // Load JS (blocking — must complete before finding instance)
            if (plugin.jsPath) {
                await loadJS(plugin.jsPath);
            } else {
                throw new Error(`Plugin "${pluginId}" has no jsPath defined`);
            }

            // Find plugin instance in global scope
            const instance = findPluginInstance(pluginId);
            
            if (!instance) {
                throw new Error(
                    `Plugin "${pluginId}" loaded but instance not found in global scope. ` +
                    `Make sure the plugin script exposes itself via window.${instanceMap[pluginId] || pluginId + 'Plugin'}`
                );
            }

            if (typeof instance.init !== 'function') {
                throw new Error(
                    `Plugin "${pluginId}" instance found but does not have an init() method`
                );
            }

            // Mark as loaded
            PluginRegistry.markLoaded(pluginId, instance);

            // Emit loaded event
            EventBus.emit(EventBus.Events.TOOL_LOADED, { 
                tool: pluginId,
                title: plugin.title 
            });

            console.log(`✅ Plugin "${pluginId}" loaded successfully`);
            
            // Return updated plugin info
            return PluginRegistry.get(pluginId);

        } catch (error) {
            console.error(`❌ Failed to load plugin "${pluginId}":`, error);
            
            EventBus.emit(EventBus.Events.TOOL_ERROR, { 
                tool: pluginId,
                error: error.message 
            });

            // Clean up failed load state
            PluginRegistry.markUnloaded(pluginId);

            throw error;
        } finally {
            AppState.setState('ui.isLoading', false);
            AppState.setState('ui.loadingMessage', '');
        }
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
