/**
 * app.js — Application Bootstrap & Runtime Verification
 * Initializes all libraries, verifies runtime, prepares SPA shell
 * Phase 2: Sidebar Navigation & Collapse Behavior
 * Part of Vanilla Micro-SPA Tool Platform Foundation
 */

(async () => {
    'use strict';

    console.group('🚀 Tool Platform — Shell Bootstrap');

    /**
     * Initialize Lucide Icons
     */
    const initLucide = () => {
        try {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
                console.log('✅ Lucide Icons — Initialized');
                return true;
            }
            throw new Error('Lucide not loaded');
        } catch (error) {
            console.warn('⚠️ Lucide Icons — Failed:', error.message);
            return false;
        }
    };

    /**
     * Refresh Lucide Icons (for dynamically added icons)
     */
    const refreshIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    /**
     * Initialize GSAP
     */
    const initGSAP = () => {
        try {
            if (typeof gsap !== 'undefined') {
                console.log('✅ GSAP Animation Engine — Ready (v' + gsap.version + ')');
                return true;
            }
            throw new Error('GSAP not loaded');
        } catch (error) {
            console.warn('⚠️ GSAP — Failed:', error.message);
            return false;
        }
    };

    /**
     * Initialize Lenis Smooth Scroll
     */
    const initLenis = () => {
        try {
            if (typeof Lenis !== 'undefined') {
                const lenis = new Lenis({
                    duration: 1.2,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    smoothWheel: true,
                    wheelMultiplier: 0.8,
                    touchMultiplier: 1.5
                });

                function raf(time) {
                    lenis.raf(time);
                    requestAnimationFrame(raf);
                }
                requestAnimationFrame(raf);

                // Expose to global for future use
                window.__lenis = lenis;
                console.log('✅ Lenis Smooth Scroll — Initialized');
                return true;
            }
            throw new Error('Lenis not loaded');
        } catch (error) {
            console.warn('⚠️ Lenis Smooth Scroll — Failed:', error.message);
            return false;
        }
    };

    /**
     * Initialize Swup SPA
     */
    const initSwup = () => {
        try {
            if (typeof Swup !== 'undefined') {
                const swup = new Swup({
                    containers: ['#main-zone'],
                    animateHistoryBrowsing: true,
                    animationSelector: '[class*="transition-"]',
                    cache: true
                });

                window.__swup = swup;
                console.log('✅ Swup SPA Transitions — Initialized');
                return true;
            }
            throw new Error('Swup not loaded');
        } catch (error) {
            console.warn('⚠️ Swup — Failed:', error.message);
            return false;
        }
    };

    /**
     * Initialize Toastify
     */
    const initToastify = () => {
        try {
            if (typeof Toastify !== 'undefined') {
                console.log('✅ Toastify Notifications — Ready');
                return true;
            }
            throw new Error('Toastify not loaded');
        } catch (error) {
            console.warn('⚠️ Toastify — Failed:', error.message);
            return false;
        }
    };

    /**
     * Verify Floating UI
     */
    const initFloatingUI = () => {
        try {
            if (typeof FloatingUICore !== 'undefined' || 
                (typeof window !== 'undefined' && window.FloatingUICore)) {
                console.log('✅ Floating UI — Ready');
                return true;
            }
            console.warn('⚠️ Floating UI — Not detected (will be verified at usage)');
            return true; // Non-critical
        } catch (error) {
            console.warn('⚠️ Floating UI — Failed:', error.message);
            return true; // Non-critical
        }
    };

    /**
     * Setup Resize Handler
     */
    const setupResizeHandler = () => {
        const handleResize = Utils.throttle(() => {
            AppState.setState('device.viewportWidth', window.innerWidth);
            AppState.setState('device.viewportHeight', window.innerHeight);
            AppState.setState('device.isMobile', Utils.isMobileDevice());
            EventBus.emit(EventBus.Events.RESIZE, {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 150);

        window.addEventListener('resize', handleResize);
        console.log('✅ Resize Handler — Active');
    };

    /**
     * Setup Keyboard Shortcuts
     */
    const setupKeyboardShortcuts = () => {
        document.addEventListener('keydown', (e) => {
            // Escape to close modals/overlays
            if (e.key === 'Escape') {
                EventBus.emit('keyboard:escape');
            }
            // Toggle sidebar with Ctrl+B
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                EventBus.emit(EventBus.Events.SIDEBAR_TOGGLE);
            }
        });
        console.log('✅ Keyboard Shortcuts — Active');
    };

    // ============================================
    // Phase 2 — Sidebar Behavior
    // ============================================

    /**
     * Initialize Sidebar Navigation
     * Handles view switching and active state management
     */
    const initSidebarNavigation = () => {
        const navItems = document.querySelectorAll('.nav-item[data-view]');
        
        if (navItems.length === 0) {
            console.warn('⚠️ Sidebar Navigation — No nav items found');
            return;
        }

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                
                // Update active state visually
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update application state
                AppState.setState('ui.currentView', view);
                
                // Emit navigation event for other modules
                EventBus.emit(EventBus.Events.NAVIGATION, { 
                    view,
                    previousView: AppState.getState('ui.currentView')
                });

                console.log(`📍 Navigation: ${view}`);
            });
        });

        console.log('✅ Sidebar Navigation — Active');
    };

    /**
     * Initialize Sidebar Collapse
     * Handles collapse/expand with GSAP animation
     */
    const initSidebarCollapse = () => {
        const collapseBtn = document.querySelector('.sidebar-collapse-btn');
        const sidebar = document.querySelector('.sidebar');
        
        if (!collapseBtn || !sidebar) {
            console.warn('⚠️ Sidebar Collapse — Elements not found');
            return;
        }

        // Update collapse button icon based on state
        const updateCollapseIcon = (isCollapsed) => {
            const icon = collapseBtn.querySelector('i');
            if (icon) {
                if (isCollapsed) {
                    icon.setAttribute('data-lucide', 'panel-right-open');
                } else {
                    icon.setAttribute('data-lucide', 'panel-right-close');
                }
                refreshIcons();
            }
        };

        collapseBtn.addEventListener('click', () => {
            const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
            const newCollapsedState = !isCurrentlyCollapsed;
            
            // Toggle class
            if (newCollapsedState) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
            
            // Update state
            AppState.setState('ui.sidebarCollapsed', newCollapsedState);
            
            // Update icon
            updateCollapseIcon(newCollapsedState);
            
            // Animate with GSAP if available
            if (typeof gsap !== 'undefined') {
                const targetWidth = newCollapsedState 
                    ? 'var(--sidebar-collapsed)' 
                    : 'var(--sidebar-width)';
                
                gsap.to(sidebar, {
                    width: targetWidth,
                    duration: 0.3,
                    ease: 'power2.inOut'
                });
            }
            
            // Emit event
            EventBus.emit(EventBus.Events.SIDEBAR_TOGGLE, { 
                collapsed: newCollapsedState 
            });
        });

        // Listen for keyboard shortcut from EventBus
        EventBus.on(EventBus.Events.SIDEBAR_TOGGLE, (data) => {
            // If event came from keyboard shortcut (no data), trigger click
            if (!data || data.collapsed === undefined) {
                collapseBtn.click();
            }
        });

        console.log('✅ Sidebar Collapse — Active');
    };

    /**
     * Initialize Sidebar (All sidebar functionality)
     */
    const initSidebar = () => {
        initSidebarNavigation();
        initSidebarCollapse();
        refreshIcons();
        console.log('✅ Sidebar Module — Complete');
    };

    /**
     * Main Bootstrap Sequence
     */
    const bootstrap = async () => {
        const results = {
            lucide: initLucide(),
            gsap: initGSAP(),
            lenis: initLenis(),
            swup: initSwup(),
            toastify: initToastify(),
            floatingUI: initFloatingUI()
        };

        // Setup core handlers
        setupResizeHandler();
        setupKeyboardShortcuts();

        // ============================================
        // Phase 2 — Initialize Sidebar
        // ============================================
        initSidebar();

        // Mark app as ready
        AppState.setState('app.ready', true);
        EventBus.emit(EventBus.Events.APP_READY, {
            timestamp: Date.now(),
            results
        });

        // Summary
        const allReady = Object.values(results).every(Boolean);
        if (allReady) {
            console.log('✅ All systems nominal — Shell is online');
        } else {
            console.warn('⚠️ Some systems degraded — Check warnings above');
        }

        console.groupEnd();

        // Visual indicator (dev only)
        if (AppState.getState('app.environment') === 'development') {
            console.log(
                '%c🔧 Tool Platform Shell %cReady',
                'color: #ff6b35; font-size: 14px;',
                'color: #2dd4bf;'
            );
        }
    };

    // Start bootstrap
    try {
        await bootstrap();
    } catch (error) {
        console.error('❌ Bootstrap failed:', error);
        EventBus.emit(EventBus.Events.APP_ERROR, error);
    }
})();
