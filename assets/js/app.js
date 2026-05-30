/**
 * app.js — Application Bootstrap & Runtime Verification
 * Initializes all libraries, verifies runtime, prepares SPA shell
 * Phase 4: Sidebar, Dashboard, Data Layer, Plugin System & Settings API Management
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
            
            // Toggle collapse button visibility based on screen size
            const collapseBtn = document.querySelector('.sidebar-collapse-btn');
            if (collapseBtn) {
                collapseBtn.style.display = Utils.isMobileDevice() ? 'none' : 'flex';
            }
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
        
        // Hide collapse button on mobile
        if (Utils.isMobileDevice()) {
            collapseBtn.style.display = 'none';
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

    // ============================================
    // Phase 2 — Dashboard Behavior
    // ============================================

    /**
     * Initialize Bento Card Mouse Tracking
     * Creates dynamic radial gradient effect following cursor
     */
    const initBentoCardEffects = () => {
        const cards = document.querySelectorAll('.bento-card');
        
        if (cards.length === 0) return;

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                card.style.setProperty('--mouse-x', `${x}%`);
                card.style.setProperty('--mouse-y', `${y}%`);
            });

            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--mouse-x', '50%');
                card.style.setProperty('--mouse-y', '50%');
            });
        });

        console.log('✅ Bento Card Effects — Active');
    };

    /**
     * Initialize Tool Card Click Handler
     * Routes clicks through Plugin System
     */
    const initToolCardActions = () => {
        const toolCards = document.querySelectorAll('.bento-card[data-tool]');
        
        toolCards.forEach(card => {
            // Main card click
            card.addEventListener('click', (e) => {
                // Ignore if clicking the action button directly
                if (e.target.closest('.card-action-btn')) return;
                
                const toolName = card.dataset.tool;
                handleToolOpen(toolName);
            });

            // Action button click
            const actionBtn = card.querySelector('.card-action-btn');
            if (actionBtn) {
                actionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const toolName = card.dataset.tool;
                    handleToolOpen(toolName);
                });
            }
        });

        console.log('✅ Tool Card Actions — Active');
    };

    /**
     * Handle tool opening via Plugin System (Phase 4)
     * Routes to PluginContainer for registered plugins, shows toast for unregistered
     * @param {string} toolName - Tool identifier
     */
    const handleToolOpen = (toolName) => {
        // Check if plugin is registered in PluginRegistry
        if (typeof PluginRegistry !== 'undefined' && PluginRegistry.has(toolName)) {
            // Plugin is registered — use Plugin System
            PluginContainer.loadAndMount(toolName);
            return;
        }

        // Plugin not registered — show toast notification
        AppState.setState('ui.activeTool', toolName);
        EventBus.emit(EventBus.Events.TOOL_LOADING, { tool: toolName });
        
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: `ابزار "${toolName}" هنوز در دسترس نیست`,
                duration: 3000,
                gravity: 'bottom',
                position: 'left',
                style: {
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-primary)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--font-size-sm)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: 'var(--shadow-lg)'
                }
            }).showToast();
        }
        
        console.log(`🔧 Tool selected: ${toolName} (not yet registered as plugin)`);
    };

    /**
     * Initialize Header Action Buttons
     */
    const initHeaderActions = () => {
        const refreshBtn = document.querySelector('.header-btn[aria-label="Refresh"]');
        const newActionBtn = document.querySelector('.header-btn-primary');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Animate refresh icon with GSAP
                const icon = refreshBtn.querySelector('.btn-icon');
                if (icon && typeof gsap !== 'undefined') {
                    gsap.to(icon, {
                        rotation: 360,
                        duration: 0.6,
                        ease: 'power2.inOut'
                    });
                }
                
                // Emit refresh event
                EventBus.emit('dashboard:refresh');
                
                // Refresh data
                if (typeof ActionRegistry !== 'undefined') {
                    ActionRegistry.updateStats();
                }
                if (typeof DOMBindings !== 'undefined') {
                    DOMBindings.updateStatCards();
                    DOMBindings.updateActivityList();
                }
                
                // Toast notification
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: 'داشبورد بروزرسانی شد',
                        duration: 2000,
                        gravity: 'bottom',
                        position: 'left',
                        style: {
                            background: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: 'var(--shadow-lg)'
                        }
                    }).showToast();
                }
            });
        }

        if (newActionBtn) {
            newActionBtn.addEventListener('click', () => {
                EventBus.emit('action:new');
                console.log('➕ New action requested');
            });
        }

        console.log('✅ Header Actions — Active');
    };

    /**
     * Initialize View Switching
     * Syncs sidebar navigation with main content views
     */
    const initViewSwitching = () => {
        const views = document.querySelectorAll('.view[data-view]');
        
        if (views.length === 0) {
            console.warn('⚠️ View Switching — No views found');
            return;
        }

        // Listen for navigation events
        EventBus.on(EventBus.Events.NAVIGATION, ({ view }) => {
            views.forEach(v => {
                if (v.dataset.view === view) {
                    v.classList.add('active');
                    v.style.display = 'flex';
                } else {
                    v.classList.remove('active');
                    v.style.display = 'none';
                }
            });

            // Scroll to top of main zone smoothly
            const mainZone = document.getElementById('main-zone');
            if (mainZone) {
                if (window.__lenis) {
                    window.__lenis.scrollTo(mainZone, { offset: 0 });
                } else {
                    mainZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }

            // Initialize settings view when navigated to
            if (view === 'settings') {
                setTimeout(() => {
                    initSettingsView();
                    initBaleConnection();
                }, 100);
            }
        });

        console.log('✅ View Switching — Active');
    };

    /**
     * Initialize Dashboard Module (All dashboard functionality)
     */
    const initDashboard = () => {
        initBentoCardEffects();
        initToolCardActions();
        initHeaderActions();
        initViewSwitching();
        refreshIcons();
        console.log('✅ Dashboard Module — Complete');
    };

    // ============================================
    // Settings View — API Token Management
    // ============================================

    /**
     * GitHub repo constants (used by settings and plugins)
     */
    const GITHUB_REPO_OWNER = 'khashayarone';
    const GITHUB_REPO_NAME = 'khashayarone.github.io';
    const BALE_BOT_USERNAME = 'githubdlrobot';
    const BALE_CONNECTIONS_PATH = 'data/bale-connections';
    const BALE_STORAGE_KEY = 'bale-connection';

    /**
     * Initialize Settings View with API Cards
     */
    const initSettingsView = () => {
        const setBtn = document.getElementById('btn-set-github-token');
        const clearBtn = document.getElementById('btn-clear-github-token');
        const statusBadge = document.getElementById('github-token-status');

        const updateTokenUI = () => {
            const token = localStorage.getItem('yt-downloader:gh-token');
            if (token && token.startsWith('ghp_')) {
                if (statusBadge) {
                    statusBadge.textContent = 'فعال';
                    statusBadge.className = 'api-card-badge set';
                }
                if (setBtn) setBtn.style.display = 'none';
                if (clearBtn) clearBtn.style.display = 'flex';
            } else {
                if (statusBadge) {
                    statusBadge.textContent = 'تنظیم نشده';
                    statusBadge.className = 'api-card-badge unset';
                }
                if (setBtn) setBtn.style.display = 'flex';
                if (clearBtn) clearBtn.style.display = 'none';
            }
        };

        updateTokenUI();

        if (setBtn) {
            setBtn.addEventListener('click', () => {
                showGitHubTokenModal(null, () => {
                    updateTokenUI();
                });
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                localStorage.removeItem('yt-downloader:gh-token');
                localStorage.removeItem('yt-downloader:fork-repo');
                EventBus.emit('settings:token-cleared', {});
                updateTokenUI();
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: '🗑️ توکن GitHub حذف شد',
                        duration: 2000,
                        gravity: 'bottom',
                        position: 'left',
                        style: {
                            background: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: 'var(--shadow-lg)'
                        }
                    }).showToast();
                }
            });
        }
    };

    // ============================================
    // Bale Bot Connection Management
    // ============================================

    /**
     * Initialize Bale Bot Connection Card in Settings
     */
    const initBaleConnection = () => {
        const connectBtn = document.getElementById('btn-connect-bale-bot');
        const disconnectBtn = document.getElementById('btn-disconnect-bale-bot');
        const statusBadge = document.getElementById('bale-bot-status');
        const codeDisplay = document.getElementById('bale-code-display');
        const codeValue = document.getElementById('bale-code-value');

        // Load existing connection
        const loadConnectionState = () => {
            try {
                const raw = localStorage.getItem(BALE_STORAGE_KEY);
                if (raw) {
                    const data = JSON.parse(raw);
                    return data;
                }
            } catch (e) {
                // Corrupted
            }
            return null;
        };

        const saveConnectionState = (data) => {
            try {
                localStorage.setItem(BALE_STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                console.warn('Failed to save bale connection state');
            }
        };

        const updateUI = () => {
            const connection = loadConnectionState();
            
            if (connection && connection.status === 'connected') {
                // Connected state
                if (statusBadge) {
                    statusBadge.textContent = 'متصل';
                    statusBadge.className = 'api-card-badge set';
                }
                if (connectBtn) connectBtn.style.display = 'none';
                if (disconnectBtn) disconnectBtn.style.display = 'flex';
                if (codeDisplay) {
                    codeDisplay.style.display = 'flex';
                    if (codeValue) {
                        codeValue.textContent = connection.code || '';
                    }
                }
            } else if (connection && connection.status === 'pending') {
                // Waiting for user to send code in bot
                if (statusBadge) {
                    statusBadge.textContent = 'منتظر تأیید...';
                    statusBadge.className = 'api-card-badge connecting';
                }
                if (connectBtn) connectBtn.style.display = 'none';
                if (disconnectBtn) disconnectBtn.style.display = 'flex';
                if (codeDisplay) {
                    codeDisplay.style.display = 'flex';
                    if (codeValue) {
                        codeValue.textContent = connection.code || '';
                    }
                }
                // Poll for connection
                startConnectionPolling(connection.code);
            } else {
                // Not connected
                if (statusBadge) {
                    statusBadge.textContent = 'تنظیم نشده';
                    statusBadge.className = 'api-card-badge unset';
                }
                if (connectBtn) connectBtn.style.display = 'flex';
                if (disconnectBtn) disconnectBtn.style.display = 'none';
                if (codeDisplay) codeDisplay.style.display = 'none';
            }
        };

        // Copy code on click
        if (codeValue) {
            codeValue.addEventListener('click', () => {
                const code = codeValue.textContent;
                if (code && code !== '...') {
                    navigator.clipboard.writeText(code).then(() => {
                        codeValue.classList.add('copied');
                        setTimeout(() => codeValue.classList.remove('copied'), 1500);
                        
                        if (typeof Toastify !== 'undefined') {
                            Toastify({
                                text: '📋 کد اتصال کپی شد — حالا توی ربات بفرست',
                                duration: 2500,
                                gravity: 'bottom',
                                position: 'left',
                                style: {
                                    background: 'var(--color-bg-elevated)',
                                    color: '#2dd4bf',
                                    border: '1px solid rgba(45, 212, 191, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    fontFamily: 'var(--font-family-primary)',
                                    fontSize: 'var(--font-size-sm)',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: 'var(--shadow-lg)'
                                }
                            }).showToast();
                        }
                    }).catch(() => {
                        const textarea = document.createElement('textarea');
                        textarea.value = code;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    });
                }
            });
        };

        // Connect button
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                const code = generateBaleCode();
                
                saveConnectionState({
                    code: code,
                    status: 'pending',
                    created_at: Date.now()
                });

                updateUI();

                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: `✅ کد اتصال آماده شد! حالا @${BALE_BOT_USERNAME} رو استارت کن و کد رو بفرست`,
                        duration: 5000,
                        gravity: 'bottom',
                        position: 'left',
                        style: {
                            background: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: 'var(--shadow-lg)'
                        }
                    }).showToast();
                }
            });
        }

        // Disconnect button
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                localStorage.removeItem(BALE_STORAGE_KEY);
                updateUI();

                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: '🔌 اتصال ربات بله قطع شد',
                        duration: 2000,
                        gravity: 'bottom',
                        position: 'left',
                        style: {
                            background: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: 'var(--shadow-lg)'
                        }
                    }).showToast();
                }
            });
        }

        updateUI();
    };

    /**
     * Generate a unique connection code for Bale bot
     * @returns {string} Connection code (XXXX-XXXX-XXXX)
     */
    const generateBaleCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    };

    /**
     * Start polling for Bale bot connection confirmation
     * @param {string} code - Connection code
     */
    const startConnectionPolling = (code) => {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes
        
        const poll = async () => {
            attempts++;
            
            if (attempts > maxAttempts) {
                console.log('Bale connection polling timed out');
                return;
            }

            try {
                const url = `${BALE_CONNECTIONS_PATH}/${code}.json`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.status === 'connected') {
                        // Connection confirmed!
                        const connectionData = {
                            code: code,
                            status: 'connected',
                            chat_id: data.chat_id,
                            username: data.username,
                            first_name: data.first_name,
                            connected_at: data.connected_at
                        };
                        
                        try {
                            localStorage.setItem(BALE_STORAGE_KEY, JSON.stringify(connectionData));
                        } catch (e) {
                            console.warn('Failed to save bale connection');
                        }

                        // Update UI
                        initBaleConnection();

                        // Notify
                        EventBus.emit('bale:connected', {
                            code: code,
                            chat_id: data.chat_id
                        });

                        if (typeof Toastify !== 'undefined') {
                            Toastify({
                                text: `🎉 اتصال به ربات برقرار شد! خوش اومدی ${data.first_name || ''}`,
                                duration: 4000,
                                gravity: 'bottom',
                                position: 'left',
                                style: {
                                    background: 'var(--color-bg-elevated)',
                                    color: '#2dd4bf',
                                    border: '1px solid rgba(45, 212, 191, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    fontFamily: 'var(--font-family-primary)',
                                    fontSize: 'var(--font-size-sm)',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: 'var(--shadow-lg)'
                                }
                            }).showToast();
                        }

                        return; // Stop polling
                    }
                }
            } catch (e) {
                // File not ready yet — continue polling
            }

            // Continue polling every 5 seconds
            setTimeout(poll, 5000);
        };

        poll();
    };
    /**
     * Show GitHub Token Modal (shared between Settings and YouTube Downloader plugin)
     * @param {string|null} requestId - If provided, retry this request after token is saved
     * @param {Function|null} onSaved - Callback after token is saved
     */
    const showGitHubTokenModal = (requestId = null, onSaved = null) => {
        const existingToken = localStorage.getItem('yt-downloader:gh-token') || '';
        
        const overlay = document.createElement('div');
        overlay.className = 'token-modal-overlay';
        overlay.id = 'github-token-modal-overlay';
        overlay.innerHTML = `
            <div class="token-modal-box glass-base">
                <h3 class="token-modal-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    تنظیم توکن GitHub
                </h3>
                <p class="token-modal-desc">
                    برای دانلود خودکار نیاز به یک <strong>GitHub Personal Access Token (classic)</strong> دارید.
                    <br><br>
                    <strong>مراحل دریافت توکن:</strong>
                    <br>۱. به 
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">github.com/settings/tokens</a> 
                    بروید
                    <br>۲. روی <strong>Generate new token</strong> → <strong>classic</strong> کلیک کنید
                    <br>۳. فقط scope <code>workflow</code> را تیک بزنید
                    <br>۴. توکن را کپی کرده و در کادر زیر وارد کنید
                    <br><br>
                    <small style="color: var(--color-text-muted);">توکن شما فقط در مرورگر خودتان ذخیره می‌شود و به جای دیگری ارسال نمی‌شود.</small>
                </p>
                <div class="token-modal-input-row">
                    <input type="password" class="token-modal-input" id="token-modal-input" 
                           placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off" dir="ltr"
                           value="${Utils.escapeHtml(existingToken)}">
                    <button class="btn btn-primary" id="token-modal-save" style="white-space:nowrap;">
                        ذخیره
                    </button>
                </div>
                <div class="token-modal-checkboxes">
                    <label class="token-modal-checkbox">
                        <input type="checkbox" id="token-modal-fork" checked>
                        <div class="token-modal-checkbox-label">
                            <strong>فورک خودکار اکشن در اکانت من</strong>
                            <span>یک ریپو جدید به نام <code>youtube-downloader-action</code> در اکانت شما ساخته می‌شود و workflow در آن اجرا می‌شود. این کار باعث می‌شود محدودیت درخواست نداشته باشید و فشاری به ریپوی عمومی وارد نشود.</span>
                        </div>
                    </label>
                </div>
                <div class="token-modal-actions">
                    <button class="btn btn-ghost" id="token-modal-cancel">انصراف</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const saveBtn = overlay.querySelector('#token-modal-save');
        const cancelBtn = overlay.querySelector('#token-modal-cancel');
        const input = overlay.querySelector('#token-modal-input');
        const forkCheckbox = overlay.querySelector('#token-modal-fork');

        const remove = () => overlay.remove();

        saveBtn.addEventListener('click', async () => {
            const token = input.value.trim();
            if (!token || !token.startsWith('ghp_')) {
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: '⚠️ لطفاً یک توکن معتبر GitHub وارد کنید (با ghp_ شروع شود)',
                        duration: 3000,
                        gravity: 'bottom',
                        position: 'left',
                        style: {
                            background: 'var(--color-bg-elevated)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 'var(--font-size-sm)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: 'var(--shadow-lg)'
                        }
                    }).showToast();
                }
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'در حال ذخیره...';

            // Save token
            localStorage.setItem('yt-downloader:gh-token', token);

            // Fork workflow if checked
            if (forkCheckbox.checked) {
                try {
                    const forkResult = await forkWorkflowToUser(token);
                    if (forkResult) {
                        localStorage.setItem('yt-downloader:fork-repo', forkResult);
                        console.log('✅ Workflow forked to:', forkResult);
                    }
                } catch (e) {
                    console.warn('⚠️ Fork failed — will use original repo:', e.message);
                }
            }
            
            // Notify all plugins that token changed
            EventBus.emit('settings:token-updated', {
                token: token,
                forkedRepo: localStorage.getItem('yt-downloader:fork-repo') || null
            });
            
            remove();

            if (onSaved) onSaved();

            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: '✅ توکن با موفقیت ذخیره شد' + (forkCheckbox.checked ? ' — اکشن فورک شد' : ''),
                    duration: 2500,
                    gravity: 'bottom',
                    position: 'left',
                    style: {
                        background: 'var(--color-bg-elevated)',
                        color: '#2dd4bf',
                        border: '1px solid rgba(45, 212, 191, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-family-primary)',
                        fontSize: 'var(--font-size-sm)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: 'var(--shadow-lg)'
                    }
                }).showToast();
            }
        });

        cancelBtn.addEventListener('click', remove);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) remove();
        });

        setTimeout(() => input.focus(), 100);
    };

    /**
     * Fork the YouTube Downloader workflow to user's GitHub account
     * Creates a new repo named 'youtube-downloader-action' and copies the workflow file
     * @param {string} token - GitHub Personal Access Token
     * @returns {Promise<string|null>} Forked repo full name (username/repo) or null
     */
    const forkWorkflowToUser = async (token) => {
        // Step 1: Get authenticated user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!userResponse.ok) {
            console.error('❌ Failed to get user info');
            return null;
        }
        
        const user = await userResponse.json();
        const username = user.login;
        const repoFullName = `${username}/youtube-downloader-action`;
        
        // Step 2: Create new repository (or use existing)
        const createRepoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'youtube-downloader-action',
                description: 'Auto-forked YouTube Downloader workflow for Tool Platform — BYOK',
                private: false,
                auto_init: false
            })
        });

        // Repo might already exist — that's OK
        if (!createRepoResponse.ok) {
            const err = await createRepoResponse.json().catch(() => ({}));
            if (err.message && err.message.includes('already exists')) {
                console.log('ℹ️ Repository already exists, using existing');
            } else {
                console.error('❌ Failed to create repo:', err);
                return null;
            }
        }
        
        // Step 3: Fetch workflow file from original repo
        const workflowUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/.github/workflows/youtube-downloader.yml`;
        const workflowResponse = await fetch(workflowUrl);
        
        if (!workflowResponse.ok) {
            console.error('❌ Failed to fetch workflow file from original repo');
            return null;
        }
        
        const workflowContent = await workflowResponse.text();
        const contentEncoded = btoa(unescape(encodeURIComponent(workflowContent)));
        
        // Step 4: Create .github/workflows/youtube-downloader.yml in the user's repo
        // First check if workflows directory exists by trying to get it
        const getFileResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/.github/workflows/youtube-downloader.yml`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = null;
        if (getFileResponse.ok) {
            const existingFile = await getFileResponse.json();
            sha = existingFile.sha;
        }
        
        const putBody = {
            message: '🔄 Update YouTube Downloader workflow',
            content: contentEncoded
        };
        
        if (sha) {
            putBody.sha = sha;
        }
        
        const putResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/.github/workflows/youtube-downloader.yml`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(putBody)
        });
        
        if (!putResponse.ok) {
            console.error('❌ Failed to push workflow file to user repo');
            return null;
        }
        
        console.log(`✅ Workflow successfully forked to: ${repoFullName}`);
        return repoFullName;
    };

    // ============================================
    // Phase 3 — Data Layer Simulation
    // ============================================

    /**
     * Simulate initial history for demo
     * Runs async — UI updates reactively via EventBus
     */
    const simulateInitialHistory = async () => {
        const actions = ['ai-text-generator', 'image-optimizer', 'json-formatter', 'base64-encoder', 'github-actions'];
        
        for (const actionId of actions) {
            try {
                await ActionRegistry.execute(actionId, { demo: true });
                await Utils.wait(300);
            } catch (error) {
                // Silent fail for demo
            }
        }
        
        console.log('✅ Initial history simulation complete');
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

        // ============================================
        // Phase 2 — Initialize Dashboard
        // ============================================
        initDashboard();

        // ============================================
        // Phase 3 — Initialize Data Layer
        // ============================================
        ActionRegistry.initDefaultActions();
        
        // Initialize DOM bindings first (prepares reactive UI)
        DOMBindings.init();
        
        // Run simulation with small delay to demonstrate reactive binding
        // UI shows initial state, then updates as data arrives
        setTimeout(() => {
            simulateInitialHistory();
        }, 500);

        // ============================================
        // Phase 4 — Initialize Plugin System
        // ============================================
        PluginRegistry.initDefaultPlugins();

        // ============================================
        // Initialize Settings View (if active)
        // ============================================
        if (AppState.getState('ui.currentView') === 'settings') {
            setTimeout(() => {
                initSettingsView();
                initBaleConnection();
            }, 100);
        }
            setTimeout(() => initSettingsView(), 100);
        }

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
