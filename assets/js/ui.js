/**
 * Khashayar One — UI Helpers
 * Toast notifications, Modal, Skeleton, Wizard rendering
 * Part of Khashayar One Tool Platform
 */

const UI = (() => {
    'use strict';

    /**
     * Show a toast notification
     * @param {string} text - Message text
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Duration in ms
     */
    const toast = (text, type = 'info', duration = 3000) => {
        if (typeof Toastify === 'undefined') {
            console.warn('Toastify not loaded');
            return;
        }

        const colors = {
            success: { bg: 'rgba(45, 212, 191, 0.15)', border: 'rgba(45, 212, 191, 0.3)', text: '#2dd4bf' },
            error: { bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.3)', text: '#f87171' },
            warning: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
            info: { bg: 'var(--color-bg-elevated)', border: 'var(--color-border-primary)', text: 'var(--color-text-primary)' }
        };

        const c = colors[type] || colors.info;

        Toastify({
            text,
            duration,
            gravity: 'bottom',
            position: 'left',
            style: {
                background: c.bg,
                color: c.text,
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-family-primary)',
                fontSize: 'var(--font-size-sm)',
                backdropFilter: 'blur(12px)',
                boxShadow: 'var(--shadow-lg)'
            }
        }).showToast();
    };

    /**
     * Show a modal dialog
     * @param {Object} options - { title, body, footer, onClose }
     * @returns {HTMLElement} The overlay element
     */
    const modal = (options = {}) => {
        const { title = '', body = '', footer = '', onClose = null } = options;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box glass">
                ${title ? `<h3 class="modal-title">${title}</h3>` : ''}
                ${body ? `<div class="modal-body">${body}</div>` : ''}
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;

        const remove = () => {
            overlay.remove();
            if (onClose) onClose();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) remove();
        });

        document.body.appendChild(overlay);
        return overlay;
    };

    /**
     * Show a skeleton loader
     * @param {HTMLElement} container - Container element
     * @param {string} type - 'card' | 'text' | 'full'
     */
    const skeleton = (container, type = 'card') => {
        if (!container) return;

        const templates = {
            card: `
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
            `,
            text: `
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text skeleton-text-sm"></div>
            `,
            full: `
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text skeleton-text-sm"></div>
            `
        };

        container.innerHTML = templates[type] || templates.card;
    };

    /**
     * Render the onboarding wizard
     * @param {HTMLElement} container - Container element
     * @param {number} step - Wizard step (1, 2, or 3)
     * @param {Object} data - Step-specific data
     */
    const renderWizard = (container, step, data = {}) => {
        if (!container) return;

        const views = {
            1: `
                <div class="wizard-step active" data-step="1">
                    <div class="wizard-icon welcome">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h2 class="wizard-title">به Khashayar One خوش اومدی! 🚀</h2>
                    <p class="wizard-description">
                        ابزارهای قدرتمند دانلود و مدیریت محتوا در جیب شما.
                        برای استفاده از دانلودرها، ابتدا باید به ربات بله متصل بشی.
                    </p>
                    <button class="btn btn-primary btn-lg" id="wizard-get-code">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        دریافت کد اتصال
                    </button>
                </div>
            `,
            2: `
                <div class="wizard-step active" data-step="2">
                    <div class="wizard-icon code">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                    </div>
                    <h2 class="wizard-title">کد اتصال شما</h2>
                    <p class="wizard-description">
                        این کد رو کپی کن و برای ربات <strong>@${data.botUsername || 'khashayarbot'}</strong> توی بله بفرست.
                    </p>
                    <div class="wizard-code-display" id="wizard-code-display">
                        <span class="wizard-code-text" id="wizard-code-text">${data.code || '....-....-....'}</span>
                    </div>
                    <button class="btn btn-primary" id="wizard-copy-code">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        کپی کد
                    </button>
                    <div class="wizard-status" id="wizard-status">
                        <div class="wizard-status-spinner"></div>
                        <span>منتظر تأیید اتصال...</span>
                    </div>
                </div>
            `,
            3: `
                <div class="wizard-step active" data-step="3">
                    <div class="wizard-icon success">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <h2 class="wizard-title">✅ اتصال برقرار شد!</h2>
                    <p class="wizard-description">
                        ${data.firstName || 'دوست'} جان، به Khashayar One خوش اومدی! 🎉
                        از حالا می‌تونی از همه ابزارها استفاده کنی.
                        فایل‌های دانلودی مستقیماً توی ربات بله برات ارسال میشه. 📥
                    </p>
                    <button class="btn btn-primary btn-lg" id="wizard-enter">
                        ورود به داشبورد
                    </button>
                </div>
            `,
        };

        container.innerHTML = `
            <div class="wizard-container">
                ${views[step] || views[1]}
            </div>
        `;
    };

    /**
     * Render the dashboard with tool cards
     * @param {HTMLElement} container - Container element
     * @param {Array} tools - Array of tool definitions
     */
    const renderDashboard = (container, tools = []) => {
        if (!container) return;

        const defaultTools = [
            {
                id: 'youtube',
                name: 'دانلودر یوتوب',
                description: 'دانلود ویدیو و صوت از یوتوب با کیفیت‌های مختلف',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>',
                cssClass: 'youtube',
                route: 'youtube',
                badge: 'آماده',
                badgeClass: 'ready'
            },
            {
                id: 'telegram',
                name: 'دانلودر تلگرام',
                description: 'دانلود فایل از کانال‌ها و گروه‌های تلگرام',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.441-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.123.034.335.02.56z"/></svg>',
                cssClass: 'telegram',
                route: 'telegram',
                badge: 'به زودی',
                badgeClass: 'coming-soon'
            },
            {
                id: 'instagram',
                name: 'دانلودر اینستاگرام',
                description: 'دانلود پست، استوری و ریلز اینستاگرام',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
                cssClass: 'instagram',
                route: 'instagram',
                badge: 'به زودی',
                badgeClass: 'coming-soon'
            },
            {
                id: 'proxy',
                name: 'پروکسی‌یاب',
                description: 'لیست پروکسی‌های بروز V2Ray، Shadowsocks، Trojan',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
                cssClass: 'proxy',
                route: 'proxy-finder',
                badge: 'آماده',
                badgeClass: 'ready'
            },
            {
                id: 'internet',
                name: 'وضعیت اینترنت',
                description: 'تست اتصال به سایت‌های پرکاربرد از مرورگر شما',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
                cssClass: 'internet',
                route: 'internet-status',
                badge: 'به زودی',
                badgeClass: 'coming-soon'
            }
        ];

        const toolsToRender = tools.length > 0 ? tools : defaultTools;

        container.innerHTML = `
            <div class="tools-grid">
                ${toolsToRender.map(tool => `
                    <div class="card tool-card ${tool.cssClass || ''}" data-route="${tool.route}" data-tool="${tool.id}">
                        <div class="card-header">
                            <div class="card-icon">${tool.icon}</div>
                            ${tool.badge ? `<span class="tool-badge ${tool.badgeClass || ''}">${tool.badge}</span>` : ''}
                        </div>
                        <h3 class="card-title">${tool.name}</h3>
                        <p class="card-description">${tool.description}</p>
                        <div class="card-footer">
                            <button class="btn btn-primary">
                                باز کردن
                                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind card clicks
        container.querySelectorAll('.tool-card[data-route]').forEach(card => {
            card.addEventListener('click', () => {
                const route = card.dataset.route;
                if (route) {
                    window.location.hash = '#/' + route;
                }
            });
        });
    };

    /**
     * Update connection badge in topbar
     * @param {string} status - 'connected' | 'disconnected'
     * @param {string} text - Display text
     */
    const updateConnectionBadge = (status, text) => {
        const badge = document.getElementById('connection-badge');
        const textEl = document.getElementById('connection-text');
        
        if (badge) {
            badge.className = `connection-badge ${status}`;
        }
        if (textEl) {
            textEl.textContent = text || (status === 'connected' ? 'متصل' : 'قطع');
        }
    };

    /**
     * Update active navigation item
     * @param {string} route - Current route
     */
    const updateActiveNav = (route) => {
        // Topbar
        document.querySelectorAll('.topbar-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.route === route);
        });
