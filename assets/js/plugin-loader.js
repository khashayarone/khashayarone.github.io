/**
 * Khashayar One — Plugin Loader
 * Lazy-loads plugin CSS/JS and manages lifecycle
 * Part of Khashayar One Tool Platform
 */

const PluginLoader = (() => {
    'use strict';

    // Track loaded resources
    const loadedCSS = new Set();
    const loadedJS = new Set();
    
    // Plugin registry
    const plugins = new Map();

    /**
     * Register a plugin
     * @param {Object} config - Plugin configuration
     * @param {string} config.id - Unique plugin ID
     * @param {string} config.name - Display name
     * @param {string} config.cssPath - Path to plugin CSS
     * @param {string} config.jsPath - Path to plugin JS
     * @param {string} config.globalName - Expected window global variable name
     */
    const register = (config) => {
        if (!config.id) {
            console.error('[PluginLoader] Plugin must have an id');
            return;
        }

        plugins.set(config.id, {
            id: config.id,
            name: config.name || config.id,
            cssPath: config.cssPath || `plugins/${config.id}/plugin.css`,
            jsPath: config.jsPath || `plugins/${config.id}/plugin.js`,
            globalName: config.globalName || null,
            loaded: false,
            instance: null
        });

        console.log(`📦 Plugin registered: ${config.id}`);
    };

    /**
     * Check if a plugin is registered
     * @param {string} id - Plugin ID
     * @returns {boolean}
     */
    const has = (id) => {
        return plugins.has(id);
    };

    /**
     * Get a plugin by ID
     * @param {string} id - Plugin ID
     * @returns {Object|null}
     */
    const get = (id) => {
        return plugins.get(id) || null;
    };

    /**
     * Load a CSS file dynamically
     * @param {string} path - CSS file path
     * @returns {Promise}
     */
    const loadCSS = (path) => {
        return new Promise((resolve) => {
            if (loadedCSS.has(path)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = path;
            link.onload = () => {
                loadedCSS.add(path);
                resolve();
            };
            link.onerror = () => {
                console.warn(`[PluginLoader] CSS failed: ${path}`);
                resolve(); // Non-critical
            };
            document.head.appendChild(link);
        });
    };

    /**
     * Load a JS file dynamically
     * @param {string} path - JS file path
     * @returns {Promise}
     */
    const loadJS = (path) => {
        return new Promise((resolve, reject) => {
            if (loadedJS.has(path)) {
                setTimeout(resolve, 50);
                return;
            }

            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            script.onload = () => {
                loadedJS.add(path);
                setTimeout(resolve, 100); // Let script initialize
            };
            script.onerror = () => {
                reject(new Error(`Failed to load: ${path}`));
            };
            document.head.appendChild(script);
        });
    };

    /**
     * Find plugin instance in global scope
     * @param {string} pluginId - Plugin ID
     * @param {string} globalName - Expected global variable name
     * @returns {Object|null}
     */
    const findInstance = (pluginId, globalName) => {
        if (!globalName) return null;

        // Direct lookup
        if (window[globalName] && typeof window[globalName].init === 'function') {
            return window[globalName];
        }

        // Search window for matching object
        for (const key of Object.keys(window)) {
            try {
                const obj = window[key];
                if (obj && typeof obj === 'object' && typeof obj.init === 'function' &&
                    key.toLowerCase().includes(pluginId.replace(/-/g, '').toLowerCase())) {
                    return obj;
                }
            } catch (e) {
                // Skip inaccessible
            }
        }

        return null;
    };

    /**
     * Load and initialize a plugin
     * @param {string} pluginId - Plugin ID
     * @param {HTMLElement} container - Container element
     * @returns {Promise<Object>} Plugin instance
     */
    const load = async (pluginId, container) => {
        const plugin = plugins.get(pluginId);
        
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" not registered`);
        }

        // Already loaded — reuse instance
        if (plugin.loaded && plugin.instance) {
            await plugin.instance.init(container);
            return plugin.instance;
        }

        try {
            // Load CSS (non-blocking)
            if (plugin.cssPath) {
                loadCSS(plugin.cssPath).catch(err => console.warn(err));
            }

            // Load JS (blocking)
            if (plugin.jsPath) {
                await loadJS(plugin.jsPath);
            }

            // Find instance
            const instance = findInstance(pluginId, plugin.globalName);
            
            if (!instance) {
                throw new Error(`Plugin "${pluginId}" instance not found. Expected: window.${plugin.globalName}`);
            }

            if (typeof instance.init !== 'function') {
                throw new Error(`Plugin "${pluginId}" has no init() method`);
            }

            // Initialize
            await instance.init(container);

            // Mark as loaded
            plugin.loaded = true;
            plugin.instance = instance;

            console.log(`✅ Plugin loaded: ${pluginId}`);
            
            EventBus.emit(EventBus.Events.PLUGIN_LOADED, { pluginId });

            return instance;

        } catch (error) {
            console.error(`❌ Plugin load failed: ${pluginId}`, error);
            throw error;
        }
    };

    /**
     * Unload a plugin (call destroy and clean up)
     * @param {string} pluginId - Plugin ID
     */
    const unload = async (pluginId) => {
        const plugin = plugins.get(pluginId);
        
        if (!plugin || !plugin.instance) return;

        if (typeof plugin.instance.destroy === 'function') {
            try {
                await plugin.instance.destroy();
            } catch (e) {
                console.warn(`[PluginLoader] Destroy error for ${pluginId}:`, e);
            }
        }

        plugin.instance = null;
        // Keep loaded=false to allow reloading
        plugin.loaded = false;

        EventBus.emit(EventBus.Events.PLUGIN_UNLOAD, { pluginId });
    };

    return { register, has, get, load, unload, loadCSS, loadJS };
})();

Object.freeze(PluginLoader);
