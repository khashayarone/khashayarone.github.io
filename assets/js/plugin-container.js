/**
 * plugin-container.js — Plugin Container & Skeleton Manager
 * Manages the workspace container, skeleton loading, and transitions
 * Part of Vanilla Micro-SPA Tool Platform — Phase 4 Plugin System
 */

const PluginContainer = (() => {
    'use strict';

    let currentPlugin = null;
    let container = null;
    let skeletonTimeout = null;

    /**
     * Get or create the plugin container element
     * @returns {HTMLElement} Container element
     */
    const getContainer = () => {
        if (!container) {
            container = document.getElementById('plugin-container');
            if (!container) {
                // Create container if it doesn't exist
                const mainZone = document.getElementById('main-zone');
                if (mainZone) {
                    container = document.createElement('div');
                    container.id = 'plugin-container';
                    container.className = 'plugin-container';
                    mainZone.appendChild(container);
                }
            }
        }
        return container;
    };

    /**
     * Show skeleton loader in the container
     * @param {string} pluginTitle - Plugin title to show
     */
    const showSkeleton = (pluginTitle = '') => {
        const container = getContainer();
        if (!container) return;

        container.innerHTML = `
            <div class="plugin-skeleton">
                <div class="skeleton-header">
                    <div class="skeleton-back-btn"></div>
                    <div class="skeleton-title"></div>
                </div>
                <div class="skeleton-body">
                    <div class="skeleton-hero"></div>
                    <div class="skeleton-row">
                        <div class="skeleton-block skeleton-block-lg"></div>
                        <div class="skeleton-block skeleton-block-sm"></div>
                        <div class="skeleton-block skeleton-block-sm"></div>
                    </div>
                    <div class="skeleton-row">
                        <div class="skeleton-block skeleton-block-md"></div>
                        <div class="skeleton-block skeleton-block-md"></div>
                    </div>
                    <div class="skeleton-text skeleton-text-lg"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text skeleton-text-sm"></div>
                </div>
            </div>
        `;

        if (pluginTitle) {
            const titleEl = container.querySelector('.skeleton-title');
            if (titleEl) {
                titleEl.textContent = pluginTitle;
            }
        }

        // Scroll to container
        if (window.__lenis) {
            window.__lenis.scrollTo(container, { offset: 0, duration: 0.3 });
        } else {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    /**
     * Mount a plugin into the container
     * @param {string} pluginId - Plugin ID to mount
     * @param {Object} instance - Plugin instance
     */
    const mount = async (pluginId, instance) => {
        const container = getContainer();
        if (!container) {
            console.error('[PluginContainer] No container found');
            return;
        }

        try {
            // Initialize plugin
            if (instance && typeof instance.init === 'function') {
                await instance.init(container);
            }

            currentPlugin = {
                id: pluginId,
                instance
            };

            // Emit mounted event
            EventBus.emit('plugin:mounted', { 
                pluginId,
                container 
            });

            console.log(`📦 Plugin "${pluginId}" mounted`);

        } catch (error) {
            console.error(`❌ Failed to mount plugin "${pluginId}":`, error);
            showError(error.message);
        }
    };

    /**
     * Unmount current plugin and return to dashboard
     */
    const unmount = async () => {
        if (currentPlugin) {
            // Call destroy if available
            if (currentPlugin.instance && typeof currentPlugin.instance.destroy === 'function') {
                await currentPlugin.instance.destroy();
            }

            // Clear container
            if (container) {
                container.innerHTML = '';
            }

            // Update state
            PluginRegistry.markUnloaded(currentPlugin.id);
            
            // Emit event
            EventBus.emit('plugin:unmounted', { 
                pluginId: currentPlugin.id 
            });

            console.log(`📦 Plugin "${currentPlugin.id}" unmounted`);
            
            currentPlugin = null;

            // Return to dashboard view
            AppState.setState('ui.activeTool', null);
            AppState.setState('ui.currentView', 'dashboard');
            EventBus.emit(EventBus.Events.NAVIGATION, { view: 'dashboard' });
        }
    };

    /**
     * Show error state in container
     * @param {string} message - Error message
     */
    const showError = (message) => {
        const container = getContainer();
        if (!container) return;

        container.innerHTML = `
            <div class="plugin-error">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div class="plugin-error-title">خطا در بارگذاری ابزار</div>
                <div class="plugin-error-message">${Utils.escapeHtml(message)}</div>
                <button class="btn btn-primary" id="btn-plugin-retry">
                    تلاش مجدد
                </button>
                <button class="btn btn-ghost" id="btn-plugin-back">
                    بازگشت به داشبورد
                </button>
            </div>
        `;

        // Bind error buttons
        const retryBtn = document.getElementById('btn-plugin-retry');
        const backBtn = document.getElementById('btn-plugin-back');

        if (retryBtn && currentPlugin) {
            retryBtn.addEventListener('click', () => {
                loadAndMount(currentPlugin.id);
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                unmount();
            });
        }
    };

    /**
     * Load and mount a plugin (full flow)
     * @param {string} pluginId - Plugin ID
     */
    const loadAndMount = async (pluginId) => {
        const plugin = PluginRegistry.get(pluginId);
        if (!plugin) {
            showError(`پلاگین "${pluginId}" یافت نشد`);
            return;
        }

        // Show skeleton immediately
        showSkeleton(plugin.title);

        // Update state
        AppState.setState('ui.currentView', 'plugin');
        AppState.setState('ui.activeTool', pluginId);

        try {
            // Load plugin files
            const loadedPlugin = await PluginLoader.load(pluginId);
            
            // Small delay so skeleton is visible
            await Utils.wait(400);

            // Mount plugin
            await mount(pluginId, loadedPlugin._instance);

        } catch (error) {
            showError(error.message);
        }
    };

    /**
     * Get currently active plugin
     * @returns {Object|null}
     */
    const getCurrentPlugin = () => {
        return currentPlugin;
    };

    // Listen for plugin close events
    EventBus.on('tool:close', () => {
        unmount();
    });

    // Listen for escape key to close plugin
    EventBus.on('keyboard:escape', () => {
        if (currentPlugin && AppState.getState('ui.currentView') === 'plugin') {
            unmount();
        }
    });

    // Public API
    return {
        getContainer,
        showSkeleton,
        mount,
        unmount,
        showError,
        loadAndMount,
        getCurrentPlugin
    };
})();

Object.freeze(PluginContainer);
