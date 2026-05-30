/**
 * plugin-container.js — Plugin Container & Skeleton Manager
 * Manages the workspace container, skeleton loading, and transitions
 * Mobile-aware: adds bottom padding for bottom navigation bar
 * Part of Vanilla Micro-SPA Tool Platform — Phase 4 Plugin System
 */

const PluginContainer = (() => {
    'use strict';

    let currentPlugin = null;
    let container = null;
    let isTransitioning = false;

    /**
     * Get or create the plugin container element
     * @returns {HTMLElement|null} Container element
     */
    const getContainer = () => {
        if (!container || !document.body.contains(container)) {
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
     * Apply mobile bottom padding to container
     * Adds space for bottom navigation bar on mobile devices
     * @param {HTMLElement} el - Container element
     */
    const applyMobilePadding = (el) => {
        if (!el) return;
        if (typeof Utils !== 'undefined' && Utils.isMobileDevice()) {
            el.style.paddingBottom = '80px';
        } else {
            el.style.paddingBottom = '';
        }
    };

    /**
     * Show skeleton loader in the container
     * @param {string} pluginTitle - Plugin title to show
     */
    const showSkeleton = (pluginTitle = '') => {
        const containerEl = getContainer();
        if (!containerEl) return;

        // Hide dashboard views
        const views = document.querySelectorAll('.view[data-view]');
        views.forEach(v => {
            v.classList.remove('active');
            v.style.display = 'none';
        });

        // Apply mobile padding before setting content
        applyMobilePadding(containerEl);

        containerEl.innerHTML = `
            <div class="plugin-skeleton">
                <div class="skeleton-header">
                    <div class="skeleton-back-btn"></div>
                    <div class="skeleton-title">${Utils.escapeHtml(pluginTitle || 'در حال بارگذاری...')}</div>
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

        containerEl.style.display = 'block';

        // Scroll to top of container smoothly
        if (window.__lenis) {
            window.__lenis.scrollTo(containerEl, { offset: 0, duration: 0.3 });
        } else {
            containerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    /**
     * Mount a plugin into the container
     * @param {string} pluginId - Plugin ID to mount
     * @param {Object} instance - Plugin instance with init() method
     */
    const mount = async (pluginId, instance) => {
        const containerEl = getContainer();
        if (!containerEl) {
            throw new Error('[PluginContainer] No container element found');
        }

        if (!instance || typeof instance.init !== 'function') {
            throw new Error(`Cannot mount plugin "${pluginId}": instance has no init() method`);
        }

        try {
            // Clear skeleton but keep container
            containerEl.innerHTML = '';
            
            // Add extra bottom padding on mobile for bottom navigation bar
            applyMobilePadding(containerEl);
            
            // Initialize plugin — plugin is responsible for rendering into container
            await instance.init(containerEl);

            currentPlugin = {
                id: pluginId,
                instance
            };

            // Emit mounted event
            EventBus.emit('plugin:mounted', { 
                pluginId,
                container: containerEl 
            });

            console.log(`📦 Plugin "${pluginId}" mounted successfully`);

        } catch (error) {
            console.error(`❌ Failed to mount plugin "${pluginId}":`, error);
            showError(error.message);
            throw error;
        }
    };

    /**
     * Unmount current plugin and return to dashboard
     */
    const unmount = async () => {
        if (isTransitioning) {
            console.warn('⚠️ Unmount already in progress');
            return;
        }

        isTransitioning = true;

        try {
            if (currentPlugin) {
                // Call destroy if available
                if (currentPlugin.instance && typeof currentPlugin.instance.destroy === 'function') {
                    try {
                        await currentPlugin.instance.destroy();
                    } catch (error) {
                        console.warn('⚠️ Plugin destroy error:', error);
                    }
                }

                // Clear container
                const containerEl = getContainer();
                if (containerEl) {
                    containerEl.innerHTML = '';
                    containerEl.style.display = 'none';
                    containerEl.style.paddingBottom = ''; // Reset mobile padding
                }

                // Update registry state
                PluginRegistry.markUnloaded(currentPlugin.id);
                
                // Emit event
                EventBus.emit('plugin:unmounted', { 
                    pluginId: currentPlugin.id 
                });

                console.log(`📦 Plugin "${currentPlugin.id}" unmounted`);
                
                currentPlugin = null;
            }

            // Reset UI state
            AppState.setState('ui.activeTool', null);
            AppState.setState('ui.currentView', 'dashboard');
            
            // Navigate back to dashboard
            EventBus.emit(EventBus.Events.NAVIGATION, { view: 'dashboard' });

            // Ensure dashboard view is visible
            const dashboardView = document.getElementById('view-dashboard');
            if (dashboardView) {
                dashboardView.classList.add('active');
                dashboardView.style.display = 'flex';
            }

        } catch (error) {
            console.error('❌ Error during unmount:', error);
        } finally {
            isTransitioning = false;
        }
    };

    /**
     * Show error state in container
     * @param {string} message - Error message
     */
    const showError = (message) => {
        const containerEl = getContainer();
        if (!containerEl) return;

        const pluginId = currentPlugin?.id || 'unknown';

        // Apply mobile padding before setting content
        applyMobilePadding(containerEl);

        containerEl.innerHTML = `
            <div class="plugin-error">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div class="plugin-error-title">خطا در بارگذاری ابزار</div>
                <div class="plugin-error-message">${Utils.escapeHtml(message)}</div>
                <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md);">
                    <button class="btn btn-primary" id="btn-plugin-retry">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                        </svg>
                        تلاش مجدد
                    </button>
                    <button class="btn btn-ghost" id="btn-plugin-back">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        بازگشت به داشبورد
                    </button>
                </div>
            </div>
        `;

        // Bind error buttons
        const retryBtn = document.getElementById('btn-plugin-retry');
        const backBtn = document.getElementById('btn-plugin-back');

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (currentPlugin) {
                    loadAndMount(currentPlugin.id);
                } else {
                    // Try to infer plugin ID from context
                    const activeTool = AppState.getState('ui.activeTool');
                    if (activeTool) {
                        loadAndMount(activeTool);
                    }
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                unmount();
            });
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    /**
     * Load and mount a plugin (full flow)
     * @param {string} pluginId - Plugin ID
     */
    const loadAndMount = async (pluginId) => {
        // Prevent concurrent loads
        if (isTransitioning) {
            console.warn('⚠️ Load already in progress');
            return;
        }

        isTransitioning = true;

        try {
            const plugin = PluginRegistry.get(pluginId);
            if (!plugin) {
                showError(`پلاگین "${pluginId}" در PluginRegistry ثبت نشده است`);
                return;
            }

            // If a plugin is already mounted, unmount it first
            if (currentPlugin && currentPlugin.id !== pluginId) {
                await unmount();
                // Small delay for cleanup
                await Utils.wait(200);
            }

            // Show skeleton immediately
            showSkeleton(plugin.title);

            // Update state
            AppState.setState('ui.currentView', 'plugin');
            AppState.setState('ui.activeTool', pluginId);

            // Load plugin files
            const loadedPlugin = await PluginLoader.load(pluginId);
            
            // Validate loaded instance
            if (!loadedPlugin || !loadedPlugin._instance) {
                throw new Error(`Plugin "${pluginId}" loaded but no instance was returned`);
            }

            const instance = loadedPlugin._instance;
            
            if (typeof instance.init !== 'function') {
                throw new Error(
                    `Plugin "${pluginId}" instance does not have an init() method. ` +
                    `Type: ${typeof instance}, Keys: ${Object.keys(instance).join(', ')}`
                );
            }

            // Small delay so skeleton is briefly visible for UX
            await Utils.wait(300);

            // Mount plugin
            await mount(pluginId, instance);

        } catch (error) {
            console.error('LoadAndMount error:', error);
            showError(error.message);
        } finally {
            isTransitioning = false;
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
        if (currentPlugin) {
            unmount();
        }
    });

    // Listen for escape key to close plugin (only when plugin view is active)
    EventBus.on('keyboard:escape', () => {
        if (currentPlugin && AppState.getState('ui.currentView') === 'plugin') {
            unmount();
        }
    });

    // Listen for navigation events — if navigating away, unmount plugin
    EventBus.on(EventBus.Events.NAVIGATION, ({ view }) => {
        if (view !== 'plugin' && currentPlugin) {
            // Don't unmount here, let the view switching handle display
            // But hide the plugin container
            const containerEl = getContainer();
            if (containerEl) {
                containerEl.style.display = 'none';
            }
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
