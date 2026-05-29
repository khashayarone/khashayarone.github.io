/**
 * YouTube Downloader Plugin — tool.js
 * Downloads YouTube videos via GitHub Action workflow
 * Rate limited: 10 requests/hour, 5 min cooldown between requests
 * Part of Vanilla Micro-SPA Tool Platform
 */

const YouTubeDownloaderPlugin = (() => {
    'use strict';

    // ============================================
    // Configuration
    // ============================================

    const MAX_REQUESTS_PER_HOUR = 10;
    const COOLDOWN_MINUTES = 5;
    const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
    const HOUR_MS = 60 * 60 * 1000;

    const QUALITY_OPTIONS = [
        { value: '2160p', label: '4K — 2160p' },
        { value: '1440p', label: '2K — 1440p' },
        { value: '1080p', label: 'Full HD — 1080p' },
        { value: '720p', label: 'HD — 720p' },
        { value: '480p', label: '480p' },
        { value: '360p', label: '360p' },
        { value: 'audio', label: '🎵 فقط صوت (MP3)' }
    ];

    const STORAGE_KEY = 'yt-downloader';
    const HISTORY_KEY = 'yt-downloader:history';

    // ============================================
    // Plugin State
    // ============================================

    let state = {
        url: '',
        quality: '1080p',
        audioOnly: false,
        history: [],
        limits: {
            remaining: MAX_REQUESTS_PER_HOUR,
            cooldownRemaining: 0,
            todayTotal: 0,
            canRequest: true
        },
        isLoading: false,
        error: null,
        cooldownTimer: null
    };

    // ============================================
    // Storage Management
    // ============================================

    /**
     * Get hour key for rate limiting bucket
     */
    const getHourKey = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    };

    /**
     * Load rate limit data from localStorage
     */
    const loadLimits = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                const currentHourKey = getHourKey();
                
                // Reset if hour changed
                if (data.hourKey !== currentHourKey) {
                    return {
                        hourKey: currentHourKey,
                        count: 0,
                        lastRequest: 0
                    };
                }
                return data;
            }
        } catch (e) {
            // Corrupted data — reset
        }
        return {
            hourKey: getHourKey(),
            count: 0,
            lastRequest: 0
        };
    };

    /**
     * Save rate limit data to localStorage
     */
    const saveLimits = (data) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save limits to localStorage');
        }
    };

    /**
     * Load request history
     */
    const loadHistory = () => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data)) {
                    return data.slice(0, 50); // Max 50 items
                }
            }
        } catch (e) {
            // Corrupted — reset
        }
        return [];
    };

    /**
     * Save request history
     */
    const saveHistory = (history) => {
        try {
            const trimmed = history.slice(0, 50);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Failed to save history to localStorage');
        }
    };

    // ============================================
    // Rate Limiting Logic
    // ============================================

    /**
     * Calculate current limits
     */
    const calculateLimits = () => {
        const limitData = loadLimits();
        const now = Date.now();
        
        // Count in current hour
        const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - limitData.count);
        
        // Cooldown
        let cooldownRemaining = 0;
        if (limitData.lastRequest > 0) {
            const elapsed = now - limitData.lastRequest;
            if (elapsed < COOLDOWN_MS) {
                cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000); // in seconds
            }
        }
        
        const canRequest = remaining > 0 && cooldownRemaining === 0;
        
        state.limits = {
            remaining,
            cooldownRemaining,
            todayTotal: limitData.count,
            canRequest
        };
        
        // Start cooldown timer if needed
        if (cooldownRemaining > 0 && !state.cooldownTimer) {
            startCooldownTimer(cooldownRemaining);
        }
    };

    /**
     * Start cooldown countdown timer
     */
    const startCooldownTimer = (seconds) => {
        if (state.cooldownTimer) {
            clearInterval(state.cooldownTimer);
        }
        
        state.cooldownTimer = setInterval(() => {
            seconds--;
            state.limits.cooldownRemaining = seconds;
            
            if (seconds <= 0) {
                clearInterval(state.cooldownTimer);
                state.cooldownTimer = null;
                state.limits.cooldownRemaining = 0;
                calculateLimits();
                renderView();
            } else {
                // Update only the cooldown card
                updateCooldownDisplay();
            }
        }, 1000);
    };

    /**
     * Format seconds to MM:SS
     */
    const formatCooldown = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    /**
     * Record a new request
     */
    const recordRequest = () => {
        const limitData = loadLimits();
        limitData.count++;
        limitData.lastRequest = Date.now();
        saveLimits(limitData);
        calculateLimits();
    };

    // ============================================
    // Request Simulation (until GitHub Action is ready)
    // ============================================

    /**
     * Submit download request
     * Currently simulated — will connect to GitHub Action in next phase
     */
    const submitRequest = async () => {
        if (!state.limits.canRequest) return;
        if (!state.url.trim()) return;
        
        // Validate YouTube URL
        if (!isValidYouTubeUrl(state.url)) {
            state.error = 'لینک یوتوب نامعتبر است';
            renderView();
            return;
        }

        state.isLoading = true;
        state.error = null;
        renderView();

        // Record request
        recordRequest();

        // Create history entry
        const requestId = Utils.generateId('yt');
        const entry = {
            id: requestId,
            url: state.url,
            quality: state.audioOnly ? 'audio' : state.quality,
            audioOnly: state.audioOnly,
            title: extractVideoId(state.url) || 'Unknown Video',
            status: 'processing',  // 'processing' | 'completed' | 'error'
            fileUrl: null,
            timestamp: Date.now(),
            completedAt: null
        };

        state.history.unshift(entry);
        saveHistory(state.history);
        
        // Clear form
        state.url = '';
        state.error = null;
        
        renderView();

        // Simulate processing (2-5 seconds)
        const processingTime = 2000 + Math.random() * 3000;
        
        setTimeout(() => {
            // Simulate completion
            const idx = state.history.findIndex(h => h.id === requestId);
            if (idx !== -1) {
                state.history[idx].status = 'completed';
                state.history[idx].fileUrl = '#simulated-download-url';
                state.history[idx].completedAt = Date.now();
                state.history[idx].title = '🎬 Sample Video Title — ' + (state.history[idx].audioOnly ? 'Audio' : state.history[idx].quality);
                saveHistory(state.history);
                renderView();
            }
            state.isLoading = false;
        }, processingTime);

        state.isLoading = false;
    };

    /**
     * Validate YouTube URL
     */
    const isValidYouTubeUrl = (url) => {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^(https?:\/\/)?(www\.)?(m\.)?youtube\.com\/watch\?v=[\w-]+/,
            /^(https?:\/\/)?youtu\.be\/[\w-]+/
        ];
        return patterns.some(p => p.test(url));
    };

    /**
     * Extract video ID from YouTube URL
     */
    const extractVideoId = (url) => {
        const patterns = [
            /(?:v=|\/)([\w-]{11})(?:[&?]|$)/,
            /youtu\.be\/([\w-]{11})/,
            /\/shorts\/([\w-]{11})/
        ];
        for (const p of patterns) {
            const match = url.match(p);
            if (match) return match[1];
        }
        return null;
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
     * Update only cooldown display (for timer efficiency)
     */
    const updateCooldownDisplay = () => {
        const cooldownEl = document.getElementById('yt-cooldown-value');
        if (cooldownEl) {
            cooldownEl.textContent = state.limits.cooldownRemaining > 0 
                ? formatCooldown(state.limits.cooldownRemaining)
                : 'آماده';
        }
        
        const cooldownLabel = document.getElementById('yt-cooldown-label');
        if (cooldownLabel) {
            cooldownLabel.textContent = state.limits.cooldownRemaining > 0 
                ? 'زمان تا درخواست بعدی'
                : 'وضعیت';
        }

        // Update submit button
        const submitBtn = document.getElementById('yt-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = !state.limits.canRequest || state.isLoading;
        }
    };

    /**
     * Render full view
     */
    const renderFullView = () => `
        <div class="yt-downloader">
            ${renderHeader()}
            ${renderLimitsBar()}
            ${renderDownloadBox()}
            ${renderHistory()}
        </div>
    `;

    /**
     * Render header
     */
    const renderHeader = () => `
        <div class="yt-header">
            <h2 class="yt-title">
                <svg class="yt-title-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                دانلودر یوتوب
            </h2>
        </div>
    `;

    /**
     * Render limits bar
     */
    const renderLimitsBar = () => `
        <div class="yt-limits-bar">
            <div class="yt-limit-card">
                <div class="yt-limit-icon remaining">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                </div>
                <div class="yt-limit-info">
                    <span class="yt-limit-value">${state.limits.remaining.toLocaleString('fa-IR')} / ${MAX_REQUESTS_PER_HOUR}</span>
                    <span class="yt-limit-label">درخواست باقی‌مانده</span>
                </div>
            </div>
            
            <div class="yt-limit-card">
                <div class="yt-limit-icon cooldown">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <div class="yt-limit-info">
                    <span class="yt-limit-value" id="yt-cooldown-value">${state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده'}</span>
                    <span class="yt-limit-label" id="yt-cooldown-label">${state.limits.cooldownRemaining > 0 ? 'زمان تا درخواست بعدی' : 'وضعیت'}</span>
                </div>
            </div>
            
            <div class="yt-limit-card">
                <div class="yt-limit-icon today">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <div class="yt-limit-info">
                    <span class="yt-limit-value">${state.limits.todayTotal.toLocaleString('fa-IR')}</span>
                    <span class="yt-limit-label">درخواست این ساعت</span>
                </div>
            </div>
            
            <div class="yt-limit-card">
                <div class="yt-limit-icon status">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                </div>
                <div class="yt-limit-info">
                    <span class="yt-limit-value" style="font-size: var(--font-size-base); color: ${state.limits.canRequest ? '#2dd4bf' : '#f59e0b'};">
                        ${state.limits.canRequest ? 'مجاز' : 'محدود'}
                    </span>
                    <span class="yt-limit-label">وضعیت</span>
                </div>
            </div>
        </div>
    `;

    /**
     * Render download box
     */
    const renderDownloadBox = () => `
        <div class="yt-download-box">
            <div class="yt-input-group">
                <label class="yt-input-label">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    لینک ویدیو
                </label>
                <input type="text" class="yt-url-input" id="yt-url-input" 
                       placeholder="https://www.youtube.com/watch?v=... یا https://youtu.be/..."
                       value="${Utils.escapeHtml(state.url)}"
                       autocomplete="off"
                       dir="ltr">
            </div>
            
            <div class="yt-options-row">
                <div class="yt-input-group">
                    <label class="yt-input-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        کیفیت
                    </label>
                    <select class="yt-select" id="yt-quality-select" ${state.audioOnly ? 'disabled' : ''}>
                        ${QUALITY_OPTIONS.filter(q => q.value !== 'audio').map(q => `
                            <option value="${q.value}" ${state.quality === q.value ? 'selected' : ''}>${q.label}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="yt-checkbox-group ${state.audioOnly ? 'checked' : ''}" id="yt-audio-only">
                    <input type="checkbox" class="yt-checkbox" id="yt-audio-checkbox" ${state.audioOnly ? 'checked' : ''}>
                    <span class="yt-checkbox-label">فقط صوت (MP3)</span>
                </div>
            </div>
            
            ${state.error ? `
                <div class="yt-limit-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    ${Utils.escapeHtml(state.error)}
                </div>
            ` : ''}
            
            ${!state.limits.canRequest && !state.error ? `
                <div class="yt-limit-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    ${state.limits.cooldownRemaining > 0 ? `${formatCooldown(state.limits.cooldownRemaining)} تا درخواست بعدی صبر کنید` : 'محدودیت درخواست ساعتی (۱۰ درخواست) به پایان رسیده'}
                </div>
            ` : ''}
            
            <div class="yt-submit-row">
                <button class="yt-submit-btn" id="yt-submit-btn" ${(!state.limits.canRequest || state.isLoading) ? 'disabled' : ''}>
                    ${state.isLoading ? `
                        <div class="yt-history-spinner" style="width: 20px; height: 20px; border-color: rgba(255,255,255,0.2); border-top-color: white;"></div>
                        در حال ارسال...
                    ` : `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        شروع دانلود
                    `}
                </button>
            </div>
        </div>
    `;

    /**
     * Render request history
     */
    const renderHistory = () => `
        <div class="yt-history-section">
            <h3 class="yt-history-title">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                درخواست‌های اخیر
            </h3>
            
            ${state.history.length === 0 ? `
                <div class="yt-history-empty">
                    هنوز درخواستی ثبت نشده است
                </div>
            ` : `
                <div class="yt-history-list">
                    ${state.history.slice(0, 20).map(item => {
                        const timeAgo = getRelativeTime(item.timestamp);
                        const isProcessing = item.status === 'processing';
                        const isCompleted = item.status === 'completed';
                        const isError = item.status === 'error';

                        return `
                            <div class="yt-history-item">
                                <div class="yt-history-icon ${isProcessing ? 'processing' : isCompleted ? 'completed' : 'error'}">
                                    ${isProcessing ? `
                                        <div class="yt-history-spinner"></div>
                                    ` : isCompleted ? `
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    ` : `
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                                        </svg>
                                    `}
                                </div>
                                <div class="yt-history-content">
                                    <span class="yt-history-item-title">${Utils.escapeHtml(item.title)}</span>
                                    <span class="yt-history-item-meta">
                                        ${item.audioOnly ? '🎵 صوت' : '🎬 ' + item.quality}
                                        ${isProcessing ? ' — در حال پردازش...' : isCompleted ? ' — تکمیل شد' : ' — خطا'}
                                    </span>
                                </div>
                                <span class="yt-history-time">${timeAgo}</span>
                                ${isCompleted && item.fileUrl ? `
                                    <a href="${Utils.escapeHtml(item.fileUrl)}" class="yt-history-download-btn" download>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        دانلود
                                    </a>
                                ` : isProcessing ? `
                                    <span class="yt-history-time" style="color: var(--color-accent-primary);">در حال پردازش</span>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;

    /**
     * Get relative time string (Persian)
     */
    const getRelativeTime = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 10) return 'لحظاتی پیش';
        if (seconds < 60) return `${seconds} ثانیه پیش`;
        if (minutes < 60) return `${minutes} دقیقه پیش`;
        if (hours < 24) return `${hours} ساعت پیش`;
        return `${days} روز پیش`;
    };

    // ============================================
    // Event Binding
    // ============================================

    /**
     * Bind all UI events
     */
    const bindEvents = () => {
        // URL input
        const urlInput = document.getElementById('yt-url-input');
        if (urlInput) {
            urlInput.addEventListener('input', Utils.debounce((e) => {
                state.url = e.target.value;
                state.error = null;
            }, 300));
        }

        // Quality select
        const qualitySelect = document.getElementById('yt-quality-select');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                state.quality = e.target.value;
            });
        }

        // Audio only checkbox
        const audioCheckbox = document.getElementById('yt-audio-checkbox');
        const audioGroup = document.getElementById('yt-audio-only');
        if (audioCheckbox && audioGroup) {
            audioCheckbox.addEventListener('change', (e) => {
                state.audioOnly = e.target.checked;
                audioGroup.classList.toggle('checked', state.audioOnly);
                renderView();
            });
            
            audioGroup.addEventListener('click', (e) => {
                if (e.target !== audioCheckbox) {
                    audioCheckbox.checked = !audioCheckbox.checked;
                    state.audioOnly = audioCheckbox.checked;
                    audioGroup.classList.toggle('checked', state.audioOnly);
                    renderView();
                }
            });
        }

        // Submit button
        const submitBtn = document.getElementById('yt-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                submitRequest();
            });
        }

        // Submit on Enter in URL field
        if (urlInput) {
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && state.limits.canRequest && !state.isLoading) {
                    submitRequest();
                }
            });
        }
    };

    // ============================================
    // Plugin Lifecycle
    // ============================================

    /**
     * Initialize plugin
     */
    const init = async (container) => {
        state.history = loadHistory();
        state.url = '';
        state.quality = '1080p';
        state.audioOnly = false;
        state.error = null;
        state.isLoading = false;
        calculateLimits();
        renderView();
        EventBus.emit('tool:mounted', { toolId: 'youtube-downloader' });
    };

    /**
     * Destroy plugin
     */
    const destroy = () => {
        if (state.cooldownTimer) {
            clearInterval(state.cooldownTimer);
            state.cooldownTimer = null;
        }
        EventBus.emit('tool:destroyed', { toolId: 'youtube-downloader' });
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
window.YouTubeDownloaderPlugin = YouTubeDownloaderPlugin;

// Freeze for immutability
Object.freeze(YouTubeDownloaderPlugin);
