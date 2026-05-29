/**
 * Proxy Finder Plugin — tool.js
 * Displays V2Ray/Trojan/VLESS/Shadowsocks proxies from auto-updated JSON database
 * Data source: data/proxy-finder/proxy.json (updated by GitHub Action every 10 min)
 * Part of Vanilla Micro-SPA Tool Platform
 */

const ProxyFinderPlugin = (() => {
    'use strict';

    // ============================================
    // Configuration
    // ============================================

    const DATA_URL = 'data/proxy-finder/proxy.json';

    const TYPE_CONFIG = {
        'vless': {
            label: 'VLESS',
            cssClass: 'vless',
            icon: 'shield',
            color: '#a855f7',
            description: 'پروتکل VLESS — V2Ray/Xray'
        },
        'shadowsocks': {
            label: 'Shadowsocks',
            cssClass: 'ss',
            icon: 'cloud',
            color: '#3b82f6',
            description: 'پروتکل Shadowsocks'
        },
        'trojan': {
            label: 'Trojan',
            cssClass: 'trojan',
            icon: 'lock',
            color: '#f59e0b',
            description: 'پروتکل Trojan'
        },
        'vmess': {
            label: 'VMess',
            cssClass: 'vmess',
            icon: 'server',
            color: '#10b981',
            description: 'پروتکل VMess — V2Ray'
        },
        'mtproto': {
            label: 'MTProto',
            cssClass: 'mtproto',
            icon: 'send',
            color: '#6366f1',
            description: 'پروکسی تلگرام'
        }
    };

    // ============================================
    // Plugin State
    // ============================================

    let state = {
        proxies: [],
        filteredProxies: [],
        activeTab: 'all',
        searchQuery: '',
        statusFilter: 'all',    // 'all' | 'active' | 'dead'
        sortBy: 'latency',      // 'latency' | 'added_at' | 'source'
        isLoading: true,
        error: null
    };

    // ============================================
    // Data Loading
    // ============================================

    /**
     * Fetch proxy data from JSON file
     */
    const fetchProxies = async () => {
        state.isLoading = true;
        state.error = null;
        renderView();

        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format');
            }

            state.proxies = data;
            applyFilters();
            state.isLoading = false;
            renderView();

        } catch (error) {
            console.error('Failed to fetch proxies:', error);
            state.error = error.message;
            state.isLoading = false;
            state.proxies = [];
            state.filteredProxies = [];
            renderView();
        }
    };

    // ============================================
    // Filtering & Sorting
    // ============================================

    /**
     * Apply all active filters and sorting
     */
    const applyFilters = () => {
        let result = [...state.proxies];

        // Type filter
        if (state.activeTab !== 'all') {
            result = result.filter(p => p.type === state.activeTab);
        }

        // Status filter
        if (state.statusFilter === 'active') {
            result = result.filter(p => p.status === 'active');
        } else if (state.statusFilter === 'dead') {
            result = result.filter(p => p.status === 'dead');
        }

        // Search query
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.url && p.url.toLowerCase().includes(q)) ||
                (p.source && p.source.toLowerCase().includes(q)) ||
                (p.type && p.type.toLowerCase().includes(q))
            );
        }

        // Sort
        if (state.sortBy === 'latency') {
            result.sort((a, b) => {
                const la = a.latency_ms ?? 9999;
                const lb = b.latency_ms ?? 9999;
                return la - lb;
            });
        } else if (state.sortBy === 'added_at') {
            result.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
        } else if (state.sortBy === 'source') {
            result.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
        }

        state.filteredProxies = result;
    };

    /**
     * Get count of proxies by type
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
    const getStats = () => {
        const active = state.proxies.filter(p => p.status === 'active').length;
        const dead = state.proxies.filter(p => p.status === 'dead').length;
        const sources = new Set(state.proxies.map(p => p.source)).size;
        return {
            total: state.proxies.length,
            active,
            dead,
            sources
        };
    };

    // ============================================
    // URL Parsing
    // ============================================

    /**
     * Extract display info from proxy URL
     */
    const parseProxyUrl = (url) => {
        try {
            let server = '—';
            let port = '—';

            // Try to extract server:port from URL
            const urlPatterns = [
                /@([\w.-]+):(\d+)/,
                /:\/\/([\w.-]+):(\d+)/,
                /server=([^&]+)/,
                /host=([^&]+)/
            ];

            for (const pattern of urlPatterns) {
                const match = url.match(pattern);
                if (match) {
                    server = match[1];
                    port = match[2] || port;
                    break;
                }
            }

            return { server, port };
        } catch {
            return { server: '—', port: '—' };
        }
    };

    /**
     * Get latency class for color coding
     */
    const getLatencyClass = (latency) => {
        if (latency === null || latency === undefined) return 'slow';
        if (latency < 100) return 'fast';
        if (latency < 300) return 'medium';
        return 'slow';
    };

    // ============================================
    // Clipboard
    // ============================================

    /**
     * Copy text to clipboard
     */
    const copyToClipboard = async (text, btnElement) => {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            if (btnElement) {
                btnElement.classList.add('copied');
                const icon = btnElement.querySelector('svg');
                if (icon) {
                    icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
                }
                setTimeout(() => {
                    btnElement.classList.remove('copied');
                    if (icon) {
                        icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>';
                    }
                }, 2000);
            }
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    };

    // ============================================
    // View Rendering
    // ============================================

    /**
     * Main render function
     */
    const renderView = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;

        container.innerHTML = renderFullView();
        bindEvents();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    /**
     * Render the complete view
     */
    const renderFullView = () => `
        <div class="proxy-finder">
            ${renderHeader()}
            ${renderStatsBar()}
            ${renderControls()}
            ${renderTabs()}
            ${state.isLoading ? renderLoading() : state.error ? renderError() : renderProxyList()}
        </div>
    `;

    /**
     * Render header with title and refresh button
     */
    const renderHeader = () => `
        <div class="proxy-header">
            <div class="proxy-title-row">
                <h2 class="proxy-title">
                    <svg class="proxy-title-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    پروکسی‌یاب
                </h2>
                <button class="proxy-refresh-btn" id="btn-refresh-proxies">
                    <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/>
                    </svg>
                    بروزرسانی
                </button>
            </div>
        </div>
    `;

    /**
     * Render stats bar
     */
    const renderStatsBar = () => {
        const stats = getStats();
        return `
            <div class="proxy-stats-bar">
                <div class="proxy-stat-card">
                    <div class="proxy-stat-icon total">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                    </div>
                    <div class="proxy-stat-info">
                        <span class="proxy-stat-value">${stats.total.toLocaleString('fa-IR')}</span>
                        <span class="proxy-stat-label">کل پروکسی‌ها</span>
                    </div>
                </div>
                <div class="proxy-stat-card">
                    <div class="proxy-stat-icon active">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <div class="proxy-stat-info">
                        <span class="proxy-stat-value">${stats.active.toLocaleString('fa-IR')}</span>
                        <span class="proxy-stat-label">فعال</span>
                    </div>
                </div>
                <div class="proxy-stat-card">
                    <div class="proxy-stat-icon dead">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    </div>
                    <div class="proxy-stat-info">
                        <span class="proxy-stat-value">${stats.dead.toLocaleString('fa-IR')}</span>
                        <span class="proxy-stat-label">غیرفعال</span>
                    </div>
                </div>
                <div class="proxy-stat-card">
                    <div class="proxy-stat-icon sources">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                    </div>
                    <div class="proxy-stat-info">
                        <span class="proxy-stat-value">${stats.sources.toLocaleString('fa-IR')}</span>
                        <span class="proxy-stat-label">منبع</span>
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Render search and filter controls
     */
    const renderControls = () => `
        <div class="proxy-controls">
            <div class="proxy-search-wrapper">
                <input type="text" class="proxy-search-input" id="proxy-search" 
                       placeholder="جستجو در پروکسی‌ها... (آدرس، منبع، نوع)" 
                       value="${Utils.escapeHtml(state.searchQuery)}"
                       autocomplete="off">
                <svg class="proxy-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
            </div>
            <select class="proxy-filter-select" id="proxy-status-filter">
                <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>همه وضعیت‌ها</option>
                <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>فعال</option>
                <option value="dead" ${state.statusFilter === 'dead' ? 'selected' : ''}>غیرفعال</option>
            </select>
            <select class="proxy-filter-select" id="proxy-sort">
                <option value="latency" ${state.sortBy === 'latency' ? 'selected' : ''}>مرتب‌سازی: سرعت</option>
                <option value="added_at" ${state.sortBy === 'added_at' ? 'selected' : ''}>مرتب‌سازی: جدیدترین</option>
                <option value="source" ${state.sortBy === 'source' ? 'selected' : ''}>مرتب‌سازی: منبع</option>
            </select>
        </div>
    `;

    /**
     * Render type tabs
     */
    const renderTabs = () => {
        const counts = getTypeCounts();
        const tabs = [
            { id: 'all', label: 'همه', cssClass: '' },
            { id: 'vless', label: 'VLESS', cssClass: 'vless' },
            { id: 'shadowsocks', label: 'Shadowsocks', cssClass: 'ss' },
            { id: 'trojan', label: 'Trojan', cssClass: 'trojan' },
            { id: 'vmess', label: 'VMess', cssClass: 'vmess' },
            { id: 'mtproto', label: 'MTProto', cssClass: 'mtproto' }
        ];

        return `
            <div class="proxy-tabs">
                ${tabs.map(tab => `
                    <button class="proxy-tab ${state.activeTab === tab.id ? 'active' : ''}" 
                            data-tab="${tab.id}">
                        ${tab.cssClass ? `<span class="proxy-tab-dot ${tab.cssClass}"></span>` : ''}
                        ${tab.label}
                        <span class="proxy-tab-count">${(counts[tab.id] || 0).toLocaleString('fa-IR')}</span>
                    </button>
                `).join('')}
            </div>
        `;
    };

    /**
     * Render proxy list
     */
    const renderProxyList = () => {
        if (state.filteredProxies.length === 0) {
            return `
                <div class="proxy-empty">
                    <svg class="proxy-empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <span class="proxy-empty-text">پروکسی یافت نشد</span>
                </div>
            `;
        }

        return `
            <div class="proxy-list">
                ${state.filteredProxies.map(proxy => {
                    const info = parseProxyUrl(proxy.url);
                    const typeCfg = TYPE_CONFIG[proxy.type] || { cssClass: 'unknown', label: proxy.type, color: '#6b6b7b' };
                    const latencyClass = getLatencyClass(proxy.latency_ms);
                    const isDead = proxy.status === 'dead';

                    return `
                        <div class="proxy-card type-${typeCfg.cssClass} ${isDead ? 'dead' : ''}" data-proxy-id="${proxy.id}">
                            <span class="proxy-status ${proxy.status}"></span>
                            <span class="proxy-type-badge ${typeCfg.cssClass}">${typeCfg.label}</span>
                            
                            <div class="proxy-info">
                                <span class="proxy-url-display" title="${Utils.escapeHtml(proxy.url)}">
                                    ${Utils.escapeHtml(proxy.url.length > 80 ? proxy.url.substring(0, 80) + '...' : proxy.url)}
                                </span>
                                <div class="proxy-meta">
                                    <span class="proxy-meta-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
                                        </svg>
                                        ${Utils.escapeHtml(info.server)}:${Utils.escapeHtml(info.port)}
                                    </span>
                                    ${proxy.source ? `
                                        <span class="proxy-source">@${Utils.escapeHtml(proxy.source)}</span>
                                    ` : ''}
                                </div>
                            </div>

                            <span class="proxy-latency ${latencyClass}">
                                ${proxy.latency_ms !== null && proxy.latency_ms !== undefined ? 
                                    `${proxy.latency_ms}ms` : 
                                    '<span style="color: var(--color-text-muted);">—</span>'}
                            </span>

                            <button class="proxy-copy-btn" data-copy-url="${Utils.escapeHtml(proxy.url)}" title="کپی">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                </svg>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="text-align: center; padding: var(--space-md); color: var(--color-text-muted); font-size: var(--font-size-xs);">
                نمایش ${state.filteredProxies.length.toLocaleString('fa-IR')} از ${state.proxies.length.toLocaleString('fa-IR')} پروکسی
            </div>
        `;
    };

    /**
     * Render loading state
     */
    const renderLoading = () => `
        <div class="proxy-loading">
            <div class="proxy-spinner"></div>
        </div>
    `;

    /**
     * Render error state
     */
    const renderError = () => `
        <div class="proxy-empty">
            <svg class="proxy-empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span class="proxy-empty-text">خطا در دریافت پروکسی‌ها</span>
            <span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">${Utils.escapeHtml(state.error || '')}</span>
            <button class="proxy-refresh-btn" id="btn-retry-load">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8"/>
                </svg>
                تلاش مجدد
            </button>
        </div>
    `;

    // ============================================
    // Event Binding
    // ============================================

    /**
     * Bind all UI events
     */
    const bindEvents = () => {
        // Refresh button
        const refreshBtn = document.getElementById('btn-refresh-proxies');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => fetchProxies());
        }

        // Retry button (error state)
        const retryBtn = document.getElementById('btn-retry-load');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => fetchProxies());
        }

        // Search input
        const searchInput = document.getElementById('proxy-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                state.searchQuery = e.target.value;
                applyFilters();
                renderView();
            }, 250));
        }

        // Status filter
        const statusFilter = document.getElementById('proxy-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                state.statusFilter = e.target.value;
                applyFilters();
                renderView();
            });
        }

        // Sort select
        const sortSelect = document.getElementById('proxy-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                state.sortBy = e.target.value;
                applyFilters();
                renderView();
            });
        }

        // Type tabs
        document.querySelectorAll('.proxy-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                state.activeTab = tab.dataset.tab;
                applyFilters();
                renderView();
            });
        });

        // Copy buttons
        document.querySelectorAll('.proxy-copy-btn[data-copy-url]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.copyUrl;
                copyToClipboard(url, btn);
            });
        });
    };

    // ============================================
    // Plugin Lifecycle
    // ============================================

    /**
     * Initialize plugin
     */
    const init = async (container) => {
        renderView();
        await fetchProxies();
        EventBus.emit('tool:mounted', { toolId: 'proxy-finder' });
    };

    /**
     * Destroy plugin
     */
    const destroy = () => {
        state.proxies = [];
        state.filteredProxies = [];
        EventBus.emit('tool:destroyed', { toolId: 'proxy-finder' });
    };

    // ============================================
    // Public API
    // ============================================
    return {
        init,
        destroy,
        renderView
    };

})();

// Expose to global scope for PluginLoader
window.ProxyFinderPlugin = ProxyFinderPlugin;

// Freeze for immutability
Object.freeze(ProxyFinderPlugin);
