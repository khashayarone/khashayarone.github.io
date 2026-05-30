/**
 * Internet Status Checker Plugin — Khashayar One
 * Tests connectivity to predefined websites from the user's browser
 * All tests run client-side — no server required
 * Part of Khashayar One Tool Platform
 */

const InternetStatusPlugin = (() => {
    'use strict';

    // ============================================
    // Sites to Test
    // ============================================

    const TEST_SITES = [
        { name: 'Google', url: 'https://www.google.com', icon: 'G', color: '#4285f4', category: 'search' },
        { name: 'YouTube', url: 'https://www.youtube.com', icon: 'Y', color: '#ff0000', category: 'media' },
        { name: 'GitHub', url: 'https://github.com', icon: 'G', color: '#333333', category: 'dev' },
        { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'W', color: '#000000', category: 'info' },
        { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'S', color: '#f48225', category: 'dev' },
        { name: 'Twitter/X', url: 'https://twitter.com', icon: 'X', color: '#1da1f2', category: 'social' },
        { name: 'Instagram', url: 'https://www.instagram.com', icon: 'I', color: '#c13584', category: 'social' },
        { name: 'Telegram', url: 'https://telegram.org', icon: 'T', color: '#0088cc', category: 'messaging' },
        { name: 'Bale', url: 'https://bale.ai', icon: 'B', color: '#0077b6', category: 'messaging' },
        { name: 'Cloudflare', url: 'https://www.cloudflare.com', icon: 'C', color: '#f38020', category: 'infra' },
        { name: 'Amazon', url: 'https://www.amazon.com', icon: 'A', color: '#ff9900', category: 'shopping' },
        { name: 'Netflix', url: 'https://www.netflix.com', icon: 'N', color: '#e50914', category: 'media' },
    ];

    let state = {
        results: [],        // { name, url, icon, color, category, status, latency, timestamp }
        isTesting: false,
        testedCount: 0,
        totalSites: TEST_SITES.length,
        lastTestTime: null
    };

    /**
     * Test connectivity to a single URL
     * Uses fetch with no-cors mode and timeout
     * @param {Object} site - Site definition
     * @returns {Object} Test result
     */
    const testSite = async (site) => {
        const startTime = performance.now();
        let status = 'offline';
        let latency = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(site.url, {
                mode: 'no-cors',
                signal: controller.signal,
                cache: 'no-store'
            });

            clearTimeout(timeoutId);
            latency = Math.round(performance.now() - startTime);

            // If we got any response (even opaque), site is reachable
            status = 'online';
        } catch (error) {
            latency = Math.round(performance.now() - startTime);
            
            // Distinguish timeout from other errors
            if (error.name === 'AbortError') {
                status = 'timeout';
            } else {
                status = 'offline';
            }
        }

        return {
            ...site,
            status,
            latency,
            timestamp: Date.now()
        };
    };

    /**
     * Run all tests
     */
    const runTests = async () => {
        if (state.isTesting) return;

        state.isTesting = true;
        state.results = [];
        state.testedCount = 0;
        render();

        // Test sites in parallel batches of 4
        const BATCH_SIZE = 4;
        const results = [];

        for (let i = 0; i < TEST_SITES.length; i += BATCH_SIZE) {
            const batch = TEST_SITES.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(site => testSite(site)));
            results.push(...batchResults);
            
            state.testedCount = Math.min(i + BATCH_SIZE, TEST_SITES.length);
            state.results = [...results];
            render();
        }

        state.results = results;
        state.testedCount = TEST_SITES.length;
        state.isTesting = false;
        state.lastTestTime = Date.now();
        render();
    };

    /**
     * Get latency class for color coding
     */
    const getLatencyClass = (latency) => {
        if (latency === null) return '';
        if (latency < 500) return 'fast';
        if (latency < 2000) return 'medium';
        return 'slow';
    };

    /**
     * Get summary counts
     */
    const getSummary = () => {
        const online = state.results.filter(r => r.status === 'online').length;
        const offline = state.results.filter(r => r.status === 'offline' || r.status === 'timeout').length;
        const testing = state.isTesting ? state.totalSites - state.testedCount : 0;
        return { online, offline, testing, total: state.totalSites };
    };

    /**
     * Main render
     */
    const render = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;

        const summary = getSummary();

        container.innerHTML = `
            <div class="internet-status">
                <div class="is-header">
                    <h2 class="is-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                        </svg>
                        وضعیت اینترنت
                    </h2>
                    <div class="is-controls">
                        ${state.results.length > 0 && !state.isTesting ? `
                            <div class="is-summary">
                                <span style="display:flex;align-items:center;gap:4px;"><span class="is-summary-dot online"></span> ${summary.online} فعال</span>
                                ${summary.offline > 0 ? `<span style="display:flex;align-items:center;gap:4px;"><span class="is-summary-dot offline"></span> ${summary.offline} قطع</span>` : ''}
                            </div>
                        ` : ''}
                        <button class="is-test-btn" id="is-test-btn" ${state.isTesting ? 'disabled' : ''}>
                            ${state.isTesting ? '<div class="is-spinner-sm" style="border-top-color:white;"></div> در حال تست...' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/></svg> شروع تست'}
                        </button>
                    </div>
                </div>

                ${state.isTesting ? `<div class="is-progress-bar"><div class="is-progress-fill" style="width:${(state.testedCount / state.totalSites) * 100}%;"></div></div>` : ''}

                ${state.results.length === 0 && !state.isTesting ? `
                    <div class="is-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10"/>
                        </svg>
                        <p>برای بررسی وضعیت اتصال اینترنت، دکمه شروع تست را بزنید.</p>
                        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">تمامی تست‌ها از مرورگر شما انجام می‌شوند.</p>
                    </div>
                ` : `
                    <div class="is-results-grid">
                        ${state.results.map(site => {
                            const isOnline = site.status === 'online';
                            const isTesting = site.status === 'testing';
                            const isOffline = site.status === 'offline' || site.status === 'timeout';
                            const latClass = getLatencyClass(site.latency);
                            const statusText = site.status === 'online' ? '🟢 در دسترس' : site.status === 'timeout' ? '⏱ timeout' : '🔴 قطع';
                            const statusClass = site.status === 'online' ? 'online' : 'offline';

                            return `
                                <div class="is-site-card ${site.status}">
                                    <div class="is-site-header">
                                        <div class="is-site-icon" style="background:${site.color};">${site.icon}</div>
                                        <div class="is-site-info">
                                            <span class="is-site-name">${Utils.escapeHtml(site.name)}</span>
                                            <span class="is-site-url">${Utils.escapeHtml(site.url.replace('https://', ''))}</span>
                                        </div>
                                        <span class="is-site-status ${statusClass}">${statusText}</span>
                                    </div>
                                    ${site.latency !== null ? `
                                        <div class="is-site-details">
                                            <span>⚡</span>
                                            <span class="is-site-latency ${latClass}">${site.latency}ms</span>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                        ${state.isTesting ? TEST_SITES.slice(state.testedCount).map(site => `
                            <div class="is-site-card testing">
                                <div class="is-site-header">
                                    <div class="is-site-icon" style="background:${site.color};">${site.icon}</div>
                                    <div class="is-site-info">
                                        <span class="is-site-name">${Utils.escapeHtml(site.name)}</span>
                                        <span class="is-site-url">${Utils.escapeHtml(site.url.replace('https://', ''))}</span>
                                    </div>
                                    <span class="is-site-status testing"><div class="is-spinner-sm"></div> در حال تست</span>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                `}

                ${state.lastTestTime && !state.isTesting ? `
                    <p style="text-align:center;font-size:var(--font-size-xs);color:var(--color-text-muted);">
                        آخرین تست: ${getRelativeTime(state.lastTestTime)}
                    </p>
                ` : ''}
            </div>
        `;

        bindEvents();
    };

    const getRelativeTime = (ts) => {
        const diff = Date.now() - ts, s = Math.floor(diff/1000), m = Math.floor(s/60), h = Math.floor(m/60);
        if (s < 10) return 'لحظاتی پیش';
        if (s < 60) return `${s} ثانیه پیش`;
        if (m < 60) return `${m} دقیقه پیش`;
        return `${h} ساعت پیش`;
    };

    const bindEvents = () => {
        document.getElementById('is-test-btn')?.addEventListener('click', runTests);
    };

    const init = async (container) => {
        state.results = [];
        state.isTesting = false;
        state.testedCount = 0;
        state.lastTestTime = null;
        render();
        EventBus.emit('tool:mounted', { toolId: 'internet-status' });
    };

    const destroy = () => {
        state.isTesting = false;
        EventBus.emit('tool:destroyed', { toolId: 'internet-status' });
    };

    return { init, destroy };
})();

window.InternetStatusPlugin = InternetStatusPlugin;
Object.freeze(InternetStatusPlugin);
