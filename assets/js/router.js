/**
 * Khashayar One — Hash Router
 * Simple hash-based routing without page refresh
 * Part of Khashayar One Tool Platform
 */

const Router = (() => {
    'use strict';

    // Route mapping: hash → view handler
    const routes = new Map();

    // Current active route
    let currentRoute = 'dashboard';

    /**
     * Register a route
     * @param {string} name - Route name (without #/)
     * @param {Function} handler - Function to call when route is activated
     */
    const register = (name, handler) => {
        if (typeof handler !== 'function') {
            console.error(`[Router] Handler for "${name}" is not a function`);
            return;
        }
        routes.set(name, handler);
    };

    /**
     * Navigate to a route
     * @param {string} name - Route name
     */
    const navigate = (name) => {
        window.location.hash = '#/' + name;
    };

    /**
     * Get current route from hash
     * @returns {string} Current route name
     */
    const getCurrentRoute = () => {
        const hash = window.location.hash;
        if (!hash || hash === '#/' || hash === '#') return 'dashboard';
        return hash.replace('#/', '').split('?')[0].split('&')[0];
    };

    /**
     * Handle hash change
     */
    const handleRoute = () => {
        const route = getCurrentRoute();
        
        if (currentRoute === route) return;
        
        const previousRoute = currentRoute;
        currentRoute = route;
        
        // Update UI
        UI.updateActiveNav(route);
        
        // Call route handler
        const handler = routes.get(route);
        if (handler) {
            handler(route, previousRoute);
        } else {
            // Unknown route — go to dashboard
            console.warn(`[Router] Unknown route: "${route}", redirecting to dashboard`);
            navigate('dashboard');
            return;
        }
        
        // Emit event
        EventBus.emit(EventBus.Events.ROUTE_CHANGED, { route, previousRoute });
    };

    /**
     * Initialize router
     */
    const init = () => {
        // Listen for hash changes
        window.addEventListener('hashchange', handleRoute);
        
        // Handle initial route
        if (window.location.hash) {
            handleRoute();
        } else {
            // No hash — set default
            navigate('dashboard');
        }
        
        // Bind navigation clicks
        document.querySelectorAll('[data-route]').forEach(el => {
            el.addEventListener('click', (e) => {
                // Don't intercept if it's already a link or inside a tool-card
                if (el.tagName === 'A' || el.closest('.tool-card')) return;
                
                const route = el.dataset.route;
                if (route && routes.has(route)) {
                    e.preventDefault();
                    navigate(route);
                }
            });
        });
        
        console.log('✅ Router initialized');
    };

    return { register, navigate, getCurrentRoute, init };
})();

Object.freeze(Router);
