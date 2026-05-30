/**
 * Proxy Finder Plugin — Khashayar One
 * Displays V2Ray/VLESS/Trojan/Shadowsocks proxies from auto-updated JSON
 * Data source: data/proxy-finder/proxy.json
 * Part of Khashayar One Tool Platform
 */

const ProxyFinderPlugin = (() => {
    'use strict';

    const DATA_URL = 'data/proxy-finder/proxy.json';

    const TYPE_CONFIG = {
        'vless': { label: 'VLESS', cssClass: 'vless', color: '#a855f7' },
        'shadowsocks': { label: 'Shadowsocks', cssClass: 'ss', color: '#3b82f6' },
        'trojan': { label: 'Trojan', cssClass: 'trojan', color: '#f59e0b' },
        'vmess': { label: 'VMess', cssClass: 'vmess', color: '#10b981' },
        'mtproto': { label: 'MTProto', cssClass: 'vless', color: '#6366f1' }
    };

    let state = {
        proxies: [],
        filtered: [],
        activeTab: 'all',
        searchQuery: '',
        statusFilter: 'all',
        sortBy: 'latency',
        isLoading: true,
        error: null
    };

    /**
     * Fetch proxy data
     */
    const fetchProxies = async () => {
        state.isLoading = true;
        state.error = null;
        render();

        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid format');
            
            state.proxies = data;
            applyFilters();
            state.isLoading = false;
            render();
        } catch (error) {
            state.error = error.message;
            state.isLoading = false;
            render();
        }
    };

    /**
     * Apply filters and sorting
     */
    const applyFilters = () => {
        let result = [...state.proxies];

        if (state.activeTab !== 'all') {
            result = result.filter(p => p.type === state.activeTab);
        }

        if (state.statusFilter === 'active') {
            result = result.filter(p => p.status === 'active');
        } else if (state.statusFilter === 'dead') {
            result = result.filter(p => p.status === 'dead');
        }

        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.url && p.url.toLowerCase().includes(q)) ||
                (p.source && p.source.toLowerCase().includes(q)) ||
                (p.type && p.type.toLowerCase().includes(q))
            );
        }

        if (state.sortBy === 'latency') {
            result.sort((a, b) => (a.latency_ms ?? 9999) - (b.latency_ms ?? 9999));
        } else if (state.sortBy === 'added_at') {
            result.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
        }

        state.filtered = result;
    };

    /**
     * Get type counts
     */
    const getTypeCounts = () => {
        const counts = { all: state.proxies.length };
        state.proxies.forEach(p => {
            counts[p.type] = (counts[p.type] || 0) + 1;
        });
        return counts;
    };

    /**
     * Get stats
     */
    const getStats = () => ({
        total: state.proxies.length,
        active: state.proxies.filter(p => p.status === 'active').length,
        dead: state.proxies.filter(p => p.status === 'dead').length,
        sources: new Set(state.proxies.map(p => p.source)).size
    });

    /**
     * Parse proxy URL for display
     */
    const parseUrl = (url) => {
        try {
            const patterns = [/@([\w.-]+):(\d+)/, /:\/\/([\w.-]+):(\d+)/, /server=([^&]+)/, /host=([^&]+)/];
            for (const p of patterns) {
                const match = url.match(p);
                if (match) return { server: match[1], port: match[2] || '—' };
            }
        } catch (e) { /* ignore */ }
        return { server: '—', port: '—' };
    };

    /**
     * Get latency CSS class
     */
    const getLatencyClass = (latency) => {
        if (latency === null || latency === undefined) return 'slow';
        if (latency < 100) return 'fast';
        if (latency < 300) return 'medium';
        return 'slow';
    };

    /**
     * Copy to clipboard
     */
    const copyToClipboard = async (text, btn) => {
        try {
            await navigator.clipboard.writeText(text);
            if (btn) {
                btn.classList.add('copied');
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
                }, 2000);
            }
        } catch (e) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    };

    /**
     * Main render
     */
    const render = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;

        const stats = getStats();
        const counts = getTypeCounts();
        const tabs = [
            { id: 'all', label: 'همه', cssClass: '' },
            { id: 'vless', label: 'VLESS', cssClass: 'vless' },
            { id: 'shadowsocks', label: 'Shadowsocks', cssClass: 'ss' },
            { id: 'trojan', label: 'Trojan', cssClass: 'trojan' },
            { id: 'vmess', label: 'VMess', cssClass: 'vmess' }
        ];

        container.innerHTML = `
            <div class="proxy-finder">
                <div class="proxy-header">
                    <h2 class="proxy-title">🛡️ پروکسی‌یاب</h2>
                    <button class="btn btn-ghost" id="proxy-refresh">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/>
                        </svg>
                        بروزرسانی
                    </button>
                </div>

                <div class="proxy-stats-bar">
                    <div class="proxy-stat-card">
                        <div class="proxy-stat-icon total"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                        <div class="proxy-stat-info">
                            <span class="proxy-stat-value">${stats.total.toLocaleString('fa-IR')}</span>
                            <span class="proxy-stat-label">کل پروکسی‌ها</span>
                        </div>
                    </div>
                    <div class="proxy-stat-card">
                        <div class="proxy-stat-icon active"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                        <div class="proxy-stat-info">
                            <span class="proxy-stat-value">${stats.active.toLocaleString('fa-IR')}</span>
                            <span class="proxy-stat-label">فعال</span>
                        </div>
                    </div>
                    <div class="proxy-stat-card">
                        <div class="proxy-stat-icon dead"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                        <div class="proxy-stat-info">
                            <span class="proxy-stat-value">${stats.dead.toLocaleString('fa-IR')}</span>
                            <span class="proxy-stat-label">غیرفعال</span>
                        </div>
                    </div>
                    <div class="proxy-stat-card">
                        <div class="proxy-stat-icon sources"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                        <div class="proxy-stat-info">
                            <span class="proxy-stat-value">${stats.sources.toLocaleString('fa-IR')}</span>
                            <span class="proxy-stat-label">منبع</span>
                        </div>
                    </div>
                </div>

                <div class="proxy-controls">
                    <input type="text" class="proxy-search" id="proxy-search-input" placeholder="جستجو در پروکسی‌ها..." value="${Utils.escapeHtml(state.searchQuery)}">
                    <select class="proxy-filter-select" id="proxy-status-filter">
                        <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>همه وضعیت‌ها</option>
                        <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>فعال</option>
                        <option value="dead" ${state.statusFilter === 'dead' ? 'selected' : ''}>غیرفعال</option>
                    </select>
                    <select class="proxy-filter-select" id="proxy-sort">
                        <option value="latency" ${state.sortBy === 'latency' ? 'selected' : ''}>سرعت</option>
                        <option value="added_at" ${state.sortBy === 'added_at' ? 'selected' : ''}>جدیدترین</option>
                    </select>
                </div>

                <div class="proxy-tabs">
                    ${tabs.map(tab => `
                        <button class="proxy-tab ${state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
                            ${tab.cssClass ? `<span class="proxy-tab-dot ${tab.cssClass}"></span>` : ''}
                            ${tab.label}
                            <span class="proxy-tab-count">${(counts[tab.id] || 0).toLocaleString('fa-IR')}</span>
                        </button>
                    `).join('')}
                </div>

                ${state.isLoading ? `
                    <div class="proxy-loading"><div class="proxy-spinner"></div></div>
                ` : state.error ? `
                    <div class="proxy-empty">⚠️ خطا: ${Utils.escapeHtml(state.error)}</div>
                ` : state.filtered.length === 0 ? `
                    <div class="proxy-empty">پروکسی یافت نشد</div>
                ` : `
                    <div class="proxy-list">
                        ${state.filtered.map(proxy => {
                            const info = parseUrl(proxy.url);
                            const typeCfg = TYPE_CONFIG[proxy.type] || { cssClass: '', label: proxy.type };
                            const latClass = getLatencyClass(proxy.latency_ms);
                            const isDead = proxy.status === 'dead';
                            return `
                                <div class="proxy-card-item type-${typeCfg.cssClass} ${isDead ? 'dead' : ''}">
                                    <span class="proxy-status-dot ${proxy.status}"></span>
                                    <span class="proxy-type-badge ${typeCfg.cssClass}">${typeCfg.label}</span>
                                    <div class="proxy-info">
                                        <span class="proxy-url">${Utils.escapeHtml(proxy.url.substring(0, 80))}${proxy.url.length > 80 ? '...' : ''}</span>
                                        <div class="proxy-meta">
                                            <span class="proxy-meta-item">${Utils.escapeHtml(info.server)}:${Utils.escapeHtml(info.port)}</span>
                                            ${proxy.source ? `<span class="proxy-source">@${Utils.escapeHtml(proxy.source)}</span>` : ''}
                                        </div>
                                    </div>
                                    <span class="proxy-latency ${latClass}">${proxy.latency_ms !== null ? proxy.latency_ms + 'ms' : '—'}</span>
                                    <button class="proxy-copy-btn" data-copy="${Utils.escapeHtml(proxy.url)}">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                        </svg>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        bindEvents();
    };

    /**
     * Bind events
     */
    const bindEvents = () => {
        document.getElementById('proxy-refresh')?.addEventListener('click', fetchProxies);

        document.getElementById('proxy-search-input')?.addEventListener('input', Utils.debounce((e) => {
            state.searchQuery = e.target.value;
            applyFilters();
            render();
        }, 250));

        document.getElementById('proxy-status-filter')?.addEventListener('change', (e) => {
            state.statusFilter = e.target.value;
            applyFilters();
            render();
        });

        document.getElementById('proxy-sort')?.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            applyFilters();
            render();
        });

        document.querySelectorAll('.proxy-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                state.activeTab = tab.dataset.tab;
                applyFilters();
                render();
            });
        });

        document.querySelectorAll('.proxy-copy-btn[data-copy]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(btn.dataset.copy, btn);
            });
        });
    };

    /**
     * Initialize plugin
     */
    const init = async (container) => {
        await fetchProxies();
        EventBus.emit('tool:mounted', { toolId: 'proxy-finder' });
    };

    /**
     * Destroy plugin
     */
    const destroy = () => {
        state.proxies = [];
        state.filtered = [];
        EventBus.emit('tool:destroyed', { toolId: 'proxy-finder' });
    };

    return { init, destroy };
})();

window.ProxyFinderPlugin = ProxyFinderPlugin;
Object.freeze(ProxyFinderPlugin);
