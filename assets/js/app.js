/**
 * Khashayar One — Application Bootstrap
 * Orchestrates navigation, wizard, dashboard, settings, and plugin routing
 * Part of Khashayar One Tool Platform
 */

(async () => {
    'use strict';

    console.group('⚡ Khashayar One — Bootstrap');

    // ============================================
    // Library Initialization
    // ============================================

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

    // ============================================
    // View Management
    // ============================================

    /**
     * Get the main view container
     * @returns {HTMLElement}
     */
    const getViewContainer = () => {
        return document.getElementById('view-container');
    };

    /**
     * Render the appropriate view based on connection state and current route
     * @param {string} route - Current route name
     */
    const renderView = (route) => {
        const container = getViewContainer();
        if (!container) return;

        // Check Bale connection status
        const isConnected = Bale.isConnected();
        const isPending = Bale.isPending();

        // If not connected and not on settings, show wizard
        if (!isConnected && route !== 'settings') {
            if (isPending) {
                // Show step 2 (code sent, waiting for confirmation)
                const connection = Bale.getConnection();
                UI.renderWizard(container, 2, {
                    code: connection.code,
                    botUsername: Bale.getBotUsername()
                });
                bindWizardEvents();
            } else {
                // Show step 1 (welcome)
                UI.renderWizard(container, 1);
                bindWizardEvents();
            }
            return;
        }

        // Connected — render appropriate view
        switch (route) {
            case 'dashboard':
                UI.renderDashboard(container);
                break;
            case 'settings':
                renderSettings(container);
                break;
            case 'internet-status':
                renderPlaceholder(container, 'وضعیت اینترنت', 'این ابزار به زودی در دسترس قرار می‌گیرد.');
                break;
            case 'proxy-finder':
                loadPluginView(container, 'proxy-finder');
                break;
            case 'youtube':
                loadPluginView(container, 'youtube-downloader');
                break;
            case 'telegram':
                loadPluginView(container, 'telegram-downloader');
                break;
            case 'instagram':
                loadPluginView(container, 'instagram-downloader');
                break;
                renderPlaceholder(container, getToolName(route), 'این ابزار در فازهای بعدی توسعه اضافه خواهد شد.');
                break;
            default:
                UI.renderDashboard(container);
                break;
        }

        refreshIcons();
    };

    /**
     * Get display name for a tool route
     * @param {string} route - Route name
     * @returns {string} Display name
     */
    const getToolName = (route) => {
        const names = {
            'youtube': 'دانلودر یوتوب',
            'telegram': 'دانلودر تلگرام',
            'instagram': 'دانلودر اینستاگرام',
            'proxy-finder': 'پروکسی‌یاب',
            'internet-status': 'وضعیت اینترنت'
        };
        return names[route] || route;
    };

    /**
     * Render a placeholder view for tools not yet implemented
     * @param {HTMLElement} container - View container
     * @param {string} title - Tool title
     * @param {string} message - Placeholder message
     */
    const renderPlaceholder = (container, title, message) => {
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;text-align:center;gap:var(--space-lg);">
                <div style="width:80px;height:80px;border-radius:50%;background:var(--color-accent-dim);display:flex;align-items:center;justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h2 style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold);color:var(--color-text-primary);">${Utils.escapeHtml(title)}</h2>
                <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">${Utils.escapeHtml(message)}</p>
                <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'">
                    بازگشت به داشبورد
                </button>
            </div>
        `;
    };

    /**
     * Load a plugin into the view container
     * @param {HTMLElement} container - View container
     * @param {string} pluginId - Plugin ID
     */
    const loadPluginView = async (container, pluginId) => {
        // Show skeleton
        UI.skeleton(container, 'full');
        
        try {
            // Create plugin container
            container.innerHTML = '<div id="plugin-container"></div>';
            const pluginContainer = document.getElementById('plugin-container');
            
            // Load and initialize plugin
            await PluginLoader.load(pluginId, pluginContainer);
        } catch (error) {
            console.error(`Failed to load plugin "${pluginId}":`, error);
            container.innerHTML = `
                <div style="text-align:center;padding:var(--space-3xl);color:var(--color-error);">
                    <div style="width:80px;height:80px;border-radius:50%;background:rgba(248,113,113,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-lg);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    </div>
                    <p style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold);">⚠️ خطا در بارگذاری ابزار</p>
                    <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-top:var(--space-sm);">${Utils.escapeHtml(error.message)}</p>
                    <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'" style="margin-top:var(--space-xl);">بازگشت به داشبورد</button>
                </div>
            `;
        }
    };

    // ============================================
    // Settings View
    // ============================================

    /**
     * Render settings view
     * @param {HTMLElement} container - View container
     */
    const renderSettings = (container) => {
        const currentPref = Bale.getPreference();
        const connection = Bale.getConnection();
        const firstName = connection ? connection.first_name || 'کاربر' : 'کاربر';

        container.innerHTML = `
            <div class="settings-container">
                <h2 class="settings-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-left:8px;">
                        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                    تنظیمات
                </h2>

                <div class="settings-section">
                    <h3 class="settings-section-title">نحوه دریافت فایل‌های دانلودی</h3>
                    
                    <div class="settings-option ${currentPref === 'file' ? 'selected' : ''}" data-pref="file">
                        <div class="settings-radio">
                            <div class="settings-radio-inner"></div>
                        </div>
                        <div class="settings-option-content">
                            <span class="settings-option-title">📁 فقط فایل</span>
                            <span class="settings-option-desc">فایل مستقیماً در ربات بله ارسال می‌شود</span>
                        </div>
                    </div>

                    <div class="settings-option ${currentPref === 'link' ? 'selected' : ''}" data-pref="link">
                        <div class="settings-radio">
                            <div class="settings-radio-inner"></div>
                        </div>
                        <div class="settings-option-content">
                            <span class="settings-option-title">🔗 فقط لینک دانلود</span>
                            <span class="settings-option-desc">لینک مستقیم فایل در ربات ارسال می‌شود</span>
                        </div>
                    </div>

                    <div class="settings-option ${currentPref === 'both' ? 'selected' : ''}" data-pref="both">
                        <div class="settings-radio">
                            <div class="settings-radio-inner"></div>
                        </div>
                        <div class="settings-option-content">
                            <span class="settings-option-title">📁🔗 فایل + لینک</span>
                            <span class="settings-option-desc">هم فایل و هم لینک دانلود ارسال می‌شود</span>
                        </div>
                    </div>
                </div>

                <div class="settings-divider"></div>

                <div class="settings-section">
                    <h3 class="settings-section-title">وضعیت اتصال ربات</h3>
                    <div class="settings-option">
                        <div class="settings-radio" style="border-color:var(--color-success);">
                            <div class="settings-radio-inner" style="background:var(--color-success);"></div>
                        </div>
                        <div class="settings-option-content">
                            <span class="settings-option-title">🟢 متصل به @${Bale.getBotUsername()}</span>
                            <span class="settings-option-desc">${Utils.escapeHtml(firstName)} عزیز، فایل‌های دانلودی به ربات ارسال می‌شوند</span>
                        </div>
                    </div>
                </div>

                <div class="settings-disconnect">
                    <button class="btn btn-danger" id="btn-disconnect">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                        قطع اتصال ربات
                    </button>
                </div>
            </div>
        `;

        bindSettingsEvents();
    };

    // ============================================
    // Event Binding
    // ============================================

    /**
     * Bind wizard step events
     */
    const bindWizardEvents = () => {
        // Step 1: Get code button
        const getCodeBtn = document.getElementById('wizard-get-code');
        if (getCodeBtn) {
            getCodeBtn.addEventListener('click', () => {
                // Show loading state
                getCodeBtn.disabled = true;
                getCodeBtn.innerHTML = `
                    <div class="wizard-status-spinner" style="width:20px;height:20px;border-color:rgba(255,255,255,0.2);border-top-color:white;"></div>
                    در حال تولید کد...
                `;
                
                setTimeout(() => {
                    const code = Bale.createConnection();
                    const container = getViewContainer();
                    UI.renderWizard(container, 2, {
                        code: code,
                        botUsername: Bale.getBotUsername()
                    });
                    bindWizardEvents();
                    UI.toast('🔑 کد اتصال آماده شد — برای ربات بفرست', 'success');
                }, 600);
            });
        }

        // Step 2: Copy code button
        const copyBtn = document.getElementById('wizard-copy-code');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeText = document.getElementById('wizard-code-text');
                if (codeText) {
                    const code = codeText.textContent;
                    if (code && code !== '....-....-....') {
                        navigator.clipboard.writeText(code).then(() => {
                            codeText.classList.add('copied');
                            copyBtn.innerHTML = `
                                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                کپی شد!
                            `;
                            copyBtn.classList.add('btn-success');
                            UI.toast('📋 کد کپی شد — حالا توی ربات @' + Bale.getBotUsername() + ' بفرست', 'success', 4000);
                            
                            setTimeout(() => {
                                codeText.classList.remove('copied');
                                copyBtn.innerHTML = `
                                    <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                    </svg>
                                    کپی کد
                                `;
                                copyBtn.classList.remove('btn-success');
                            }, 2500);
                        }).catch(() => {
                            UI.toast('⚠️ خطا در کپی کردن — لطفاً دستی کپی کن', 'error');
                        });
                    }
                }
            });
        }

        // Step 2: Code display click to copy (fallback)
        const codeDisplay = document.getElementById('wizard-code-display');
        if (codeDisplay) {
            codeDisplay.addEventListener('click', () => {
                const codeText = document.getElementById('wizard-code-text');
                if (codeText && copyBtn) {
                    copyBtn.click();
                }
            });
        }

        // Step 2: New code button
        const newCodeBtn = document.getElementById('wizard-new-code');
        if (newCodeBtn) {
            newCodeBtn.addEventListener('click', () => {
                Bale.disconnect(true);
                const code = Bale.createConnection();
                const container = getViewContainer();
                UI.renderWizard(container, 2, {
                    code: code,
                    botUsername: Bale.getBotUsername()
                });
                bindWizardEvents();
                UI.toast('🔑 کد جدید آماده شد', 'info');
            });
        }

        // Step 3: Enter dashboard button
        const enterBtn = document.getElementById('wizard-enter');
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                enterBtn.innerHTML = `
                    <div class="wizard-status-spinner" style="width:20px;height:20px;border-color:rgba(255,255,255,0.2);border-top-color:white;"></div>
                    در حال انتقال...
                `;
                enterBtn.disabled = true;
                
                setTimeout(() => {
                    Router.navigate('dashboard');
                }, 500);
            });
        }
    };

    /**
     * Bind settings events
     */
    const bindSettingsEvents = () => {
        // Output preference options
        document.querySelectorAll('.settings-option[data-pref]').forEach(option => {
            option.addEventListener('click', () => {
                const pref = option.dataset.pref;
                
                // Update UI
                document.querySelectorAll('.settings-option[data-pref]').forEach(o => {
                    o.classList.remove('selected');
                });
                option.classList.add('selected');
                
                // Save preference
                Bale.updatePreference(pref);
                
                // Show toast
                const labels = { file: 'فقط فایل', link: 'فقط لینک', both: 'فایل + لینک' };
                UI.toast(`✅ تنظیمات ذخیره شد: ${labels[pref] || pref}`, 'success');
            });
        });

        // Disconnect button
        const disconnectBtn = document.getElementById('btn-disconnect');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                const overlay = UI.modal({
                    title: 'قطع اتصال ربات',
                    body: '<p>آیا مطمئنی می‌خوای اتصال ربات رو قطع کنی؟</p><p style="color:var(--color-text-muted);font-size:var(--font-size-sm);">برای استفاده مجدد از دانلودرها باید دوباره کد اتصال بگیری.</p>',
                    footer: `
                        <button class="btn btn-ghost" id="modal-cancel">انصراف</button>
                        <button class="btn btn-danger" id="modal-confirm">قطع اتصال</button>
                    `,
                });

                const cancelBtn = overlay.querySelector('#modal-cancel');
                const confirmBtn = overlay.querySelector('#modal-confirm');

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => overlay.remove());
                }

                if (confirmBtn) {
                    confirmBtn.addEventListener('click', () => {
                        Bale.disconnect();
                        overlay.remove();
                        UI.toast('🔌 اتصال ربات قطع شد', 'warning');
                        Router.navigate('dashboard');
                    });
                }
            });
        }
    };

    /**
     * Bind navigation events
     */
    const bindNavigation = () => {
        // Topbar navigation
        document.querySelectorAll('.topbar-nav-item[data-route]').forEach(item => {
            item.addEventListener('click', () => {
                const route = item.dataset.route;
                Router.navigate(route);
            });
        });

        // Bottom bar navigation
        document.querySelectorAll('.bottom-bar-item[data-route]').forEach(item => {
            item.addEventListener('click', () => {
                const route = item.dataset.route;
                Router.navigate(route);
            });
        });

        // Connection badge click → go to settings
        const badge = document.getElementById('connection-badge');
        if (badge) {
            badge.addEventListener('click', () => {
                Router.navigate('settings');
            });
            badge.style.cursor = 'pointer';
        }
    };

    // ============================================
    // Route Registration
    // ============================================

    const registerRoutes = () => {
        const routes = ['dashboard', 'youtube', 'telegram', 'instagram', 'proxy-finder', 'internet-status', 'settings'];
        
        routes.forEach(route => {
            Router.register(route, (currentRoute) => {
                AppState.setState('ui.currentRoute', currentRoute);
                renderView(currentRoute);
            });
        });
    };

    // ============================================
    // Bale Connection Events
    // ============================================

    const setupBaleListeners = () => {
        // When connection is confirmed, update UI
        EventBus.on(EventBus.Events.BALE_CONNECTED, (data) => {
            UI.updateConnectionBadge('connected', 'متصل');
            
            // If on wizard step 2, show step 3
            const container = getViewContainer();
            const wizardStep = container.querySelector('.wizard-step.active[data-step="2"]');
            if (wizardStep) {
                UI.renderWizard(container, 3, {
                    firstName: data.first_name || 'دوست'
                });
                bindWizardEvents();
                
                UI.toast(`🎉 اتصال به ربات برقرار شد! خوش اومدی ${data.first_name || ''}`, 'success', 4000);
            }
        });

        // When disconnected
        EventBus.on(EventBus.Events.BALE_DISCONNECTED, () => {
            UI.updateConnectionBadge('disconnected', 'قطع');
        });
    };

    // ============================================
    // Resize Handler
    // ============================================

    const setupResizeHandler = () => {
        const handleResize = Utils.throttle(() => {
            AppState.setState('device.viewportWidth', window.innerWidth);
            AppState.setState('device.viewportHeight', window.innerHeight);
            AppState.setState('device.isMobile', Utils.isMobileDevice());
            AppState.setState('ui.isMobile', Utils.isMobileDevice());
            EventBus.emit(EventBus.Events.RESIZE, {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 150);

        window.addEventListener('resize', handleResize);
    };

    // ============================================
    // Keyboard Shortcuts
    // ============================================

    const setupKeyboardShortcuts = () => {
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                const overlay = document.querySelector('.modal-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        });
    };

    // ============================================
    // Main Bootstrap
    // ============================================

    const bootstrap = async () => {
        // Initialize libraries
        const results = {
            lucide: initLucide(),
            gsap: initGSAP(),
            lenis: initLenis(),
            toastify: initToastify()
        };

        // Setup handlers
        setupResizeHandler();
        setupKeyboardShortcuts();

        // Initialize connection badge
        if (Bale.isConnected()) {
            UI.updateConnectionBadge('connected', 'متصل');
        } else {
            UI.updateConnectionBadge('disconnected', 'قطع');
        }

        // Resume polling if pending connection exists
        Bale.resumePolling();

        // Setup Bale event listeners
        setupBaleListeners();

        // Register routes
        registerRoutes();
        
        // Register plugins
        PluginLoader.register({
            id: 'proxy-finder',
            name: 'پروکسی‌یاب',
            cssPath: 'plugins/proxy-finder/plugin.css',
            jsPath: 'plugins/proxy-finder/plugin.js',
            globalName: 'ProxyFinderPlugin'
        });
        // Register YouTube Downloader plugin
        PluginLoader.register({
            id: 'youtube-downloader',
            name: 'دانلودر یوتوب',
            cssPath: 'plugins/youtube-downloader/plugin.css',
            jsPath: 'plugins/youtube-downloader/plugin.js',
            globalName: 'YouTubeDownloaderPlugin'
        });
        // Register Telegram Downloader plugin
        PluginLoader.register({
            id: 'telegram-downloader',
            name: 'دانلودر تلگرام',
            cssPath: 'plugins/telegram-downloader/plugin.css',
            jsPath: 'plugins/telegram-downloader/plugin.js',
            globalName: 'TelegramDownloaderPlugin'
        });
        // Register Instagram Downloader plugin
        PluginLoader.register({
            id: 'instagram-downloader',
            name: 'دانلودر اینستاگرام',
            cssPath: 'plugins/instagram-downloader/plugin.css',
            jsPath: 'plugins/instagram-downloader/plugin.js',
            globalName: 'InstagramDownloaderPlugin'
        });
        // Bind navigation
        bindNavigation();

        // Initialize router (triggers first render)
        Router.init();

        // Mark app as ready
        AppState.setState('app.ready', true);
        EventBus.emit(EventBus.Events.APP_READY, {
            timestamp: Date.now(),
            results
        });

        // Summary
        const allReady = Object.values(results).every(Boolean);
        if (allReady) {
            console.log('✅ All systems nominal — Khashayar One is online');
        } else {
            console.warn('⚠️ Some systems degraded — Check warnings above');
        }

        console.groupEnd();

        // Dev indicator
        if (AppState.getState('app.environment') === 'development') {
            console.log(
                '%c⚡ Khashayar One %cReady',
                'color: #ff6b35; font-size: 14px;',
                'color: #2dd4bf;'
            );
        }
    };

    // Start
    try {
        await bootstrap();
    } catch (error) {
        console.error('❌ Bootstrap failed:', error);
        EventBus.emit(EventBus.Events.APP_ERROR, error);
    }
})();
