/**
 * plugin-registry.js — Plugin Manifest Registry
 * Registers all available plugins with their metadata
 * Part of Vanilla Micro-SPA Tool Platform — Phase 4 Plugin System
 */

const PluginRegistry = (() => {
    'use strict';

    // Registered plugins map
    const plugins = new Map();

    /**
     * Register a plugin from manifest
     * @param {Object} manifest - Plugin manifest object
     */
    const register = (manifest) => {
        if (!manifest.id) {
            console.error('[PluginRegistry] Manifest must have an id');
            return;
        }

        if (plugins.has(manifest.id)) {
            console.warn(`[PluginRegistry] Plugin "${manifest.id}" already registered — overwriting`);
        }

        plugins.set(manifest.id, {
            id: manifest.id,
            title: manifest.title || manifest.id,
            icon: manifest.icon || 'box',
            category: manifest.category || 'uncategorized',
            size: manifest.size || 'medium',
            description: manifest.description || '',
            version: manifest.version || '1.0.0',
            author: manifest.author || '',
            permissions: manifest.permissions || [],
            jsPath: manifest.jsPath || `plugins/${manifest.id}/tool.js`,
            cssPath: manifest.cssPath || `plugins/${manifest.id}/tool.css`,
            dataPath: manifest.dataPath || null,
            dataPattern: manifest.dataPattern || null,
            yearRange: manifest.yearRange || null,
            // Runtime state (not from manifest)
            _loaded: false,
            _instance: null
        });

        console.log(`📦 Plugin registered: ${manifest.id}`);
    };

    /**
     * Get a plugin by ID
     * @param {string} id - Plugin ID
     * @returns {Object|null} Plugin definition or null
     */
    const get = (id) => {
        return plugins.get(id) || null;
    };

    /**
     * Get all registered plugins
     * @returns {Array} Array of plugin definitions
     */
    const getAll = () => {
        return Array.from(plugins.values());
    };

    /**
     * Get plugins by category
     * @param {string} category - Category name
     * @returns {Array} Filtered plugins
     */
    const getByCategory = (category) => {
        return getAll().filter(p => p.category === category);
    };

    /**
     * Check if plugin is registered
     * @param {string} id - Plugin ID
     * @returns {boolean}
     */
    const has = (id) => {
        return plugins.has(id);
    };

    /**
     * Check if plugin is loaded
     * @param {string} id - Plugin ID
     * @returns {boolean}
     */
    const isLoaded = (id) => {
        const plugin = plugins.get(id);
        return plugin ? plugin._loaded : false;
    };

    /**
     * Mark plugin as loaded
     * @param {string} id - Plugin ID
     * @param {*} instance - Plugin instance
     */
    const markLoaded = (id, instance = null) => {
        const plugin = plugins.get(id);
        if (plugin) {
            plugin._loaded = true;
            plugin._instance = instance;
        }
    };

    /**
     * Mark plugin as unloaded
     * @param {string} id - Plugin ID
     */
    const markUnloaded = (id) => {
        const plugin = plugins.get(id);
        if (plugin) {
            plugin._loaded = false;
            plugin._instance = null;
        }
    };

    /**
     * Initialize default plugins
     */
    const initDefaultPlugins = () => {
        // Register Movie Finder plugin
        register({
            id: 'movie-finder',
            title: 'فیلم‌یاب',
            icon: 'film',
            category: 'entertainment',
            size: 'large',
            description: 'جستجوی پیشرفته فیلم‌ها با فیلترهای دقیق — دیتابیس ۲۰۰۰ تا ۲۰۲۶',
            version: '1.0.0',
            author: 'Tool Platform',
            permissions: [],
            jsPath: 'plugins/movie-finder/tool.js',
            cssPath: 'plugins/movie-finder/tool.css',
            dataPath: 'data/movie-finder/',
            dataPattern: 'movies_{year}.json',
            yearRange: [2000, 2026]
        });

        // More plugins can be registered here in the future
        // register({ id: 'json-formatter', title: 'فرمت‌دهنده JSON', ... });
        // register({ id: 'image-optimizer', title: 'بهینه‌ساز تصاویر', ... });

        console.log(`✅ Plugin Registry — ${plugins.size} plugins registered`);
    };

    // Public API
    return {
        register,
        get,
        getAll,
        getByCategory,
        has,
        isLoaded,
        markLoaded,
        markUnloaded,
        initDefaultPlugins
    };
})();

Object.freeze(PluginRegistry);
