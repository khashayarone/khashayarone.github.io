/**
 * YouTube Downloader Plugin — tool.js
 * Downloads YouTube videos via GitHub Action workflow dispatch
 * Rate limited: 10 requests/hour, 5 min cooldown between requests
 * Anti-collision: per-request folder isolation
 * Supports: single video, multipart RAR downloads, Persian error messages
 * Token management: localStorage + prompt for missing token
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

    // GitHub Action dispatch config
    const GITHUB_REPO_OWNER = 'khashayarone';
    const GITHUB_REPO_NAME = 'khashayarone.github.io';
    const GITHUB_WORKFLOW_ID = 'youtube-downloader.yml';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;

    // Polling config
    const POLL_INTERVAL = 15000;  // Check every 15 seconds
    const POLL_MAX_ATTEMPTS = 120; // Max 30 minutes (120 × 15s)

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
    const TOKEN_STORAGE_KEY = 'yt-downloader:gh-token';

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
        cooldownTimer: null,
        activePolls: {},
        githubToken: null
    };

    // ============================================
    // Storage Management
    // ============================================

    const getHourKey = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    };

    const loadLimits = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                const currentHourKey = getHourKey();
                if (data.hourKey !== currentHourKey) {
                    return { hourKey: currentHourKey, count: 0, lastRequest: 0 };
                }
                return data;
            }
        } catch (e) {
            // Corrupted data — reset
        }
        return { hourKey: getHourKey(), count: 0, lastRequest: 0 };
    };

    const saveLimits = (data) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save limits to localStorage');
        }
    };

    const loadHistory = () => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data)) {
                    return data.slice(0, 50);
                }
            }
        } catch (e) {
            // Corrupted — reset
        }
        return [];
    };

    const saveHistory = (history) => {
        try {
            const trimmed = history.slice(0, 50);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Failed to save history to localStorage');
        }
    };

    const loadToken = () => {
        try {
            const token = localStorage.getItem(TOKEN_STORAGE_KEY);
            if (token && token.startsWith('ghp_')) {
                return token;
            }
        } catch (e) {
            // Corrupted — ignore
        }
        return null;
    };

    const saveToken = (token) => {
        try {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } catch (e) {
            console.warn('Failed to save token to localStorage');
        }
    };

    // ============================================
    // Rate Limiting Logic
    // ============================================

    const calculateLimits = () => {
        const limitData = loadLimits();
        const now = Date.now();

        const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - limitData.count);

        let cooldownRemaining = 0;
        if (limitData.lastRequest > 0) {
            const elapsed = now - limitData.lastRequest;
            if (elapsed < COOLDOWN_MS) {
                cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
            }
        }

        const canRequest = remaining > 0 && cooldownRemaining === 0;

        state.limits = {
            remaining,
            cooldownRemaining,
            todayTotal: limitData.count,
            canRequest
        };

        if (cooldownRemaining > 0 && !state.cooldownTimer) {
            startCooldownTimer(cooldownRemaining);
        }
    };

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
                updateCooldownDisplay();
            }
        }, 1000);
    };

    const formatCooldown = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const recordRequest = () => {
        const limitData = loadLimits();
        limitData.count++;
        limitData.lastRequest = Date.now();
        saveLimits(limitData);
        calculateLimits();
    };

    // ============================================
    // GitHub Action Dispatch
    // ============================================

    /**
     * Dispatch workflow to GitHub Actions
     * @param {string} requestId - Unique request identifier
     * @param {string} url - YouTube URL
     * @param {string} quality - Video quality
     * @param {boolean} audioOnly - Audio only mode
     * @returns {Promise<boolean|string>} true=success, false=failed, 'needs_token'=token required
     */
    const dispatchWorkflow = async (requestId, url, quality, audioOnly) => {
        const body = {
            ref: 'main',
            inputs: {
                request_id: requestId,
                youtube_urls: url,
                quality: quality,
                audio_only: audioOnly ? 'true' : 'false'
            }
        };

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        };

        // Use token from state (loaded from localStorage) or fallback
        const token = state.githubToken || loadToken();
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            state.githubToken = token;
        }

        try {
            const response = await fetch(GITHUB_API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log(`✅ Workflow dispatched for request: ${requestId}`);
                return true;
            } else if (response.status === 401 || response.status === 403) {
                console.error('❌ GitHub API authentication failed');
                return 'needs_token';
            } else if (response.status === 404) {
                console.error('❌ Workflow file not found — check workflow filename');
                return false;
            } else {
                console.error(`❌ Workflow dispatch failed: ${response.status} ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Workflow dispatch error:', error.message);
            return false;
        }
    };

    /**
     * Poll for workflow result
     * @param {string} requestId - Request identifier
     */
    const startPolling = (requestId) => {
        let attempts = 0;

        const poll = async () => {
            attempts++;

            if (attempts > POLL_MAX_ATTEMPTS) {
                const idx = state.history.findIndex(h => h.id === requestId);
                if (idx !== -1) {
                    state.history[idx].status = 'error';
                    state.history[idx].errorMessage = 'زمان اجرا به پایان رسید — لطفاً دوباره تلاش کنید';
                    saveHistory(state.history);
                    renderView();
                }
                if (state.activePolls[requestId]) {
                    clearInterval(state.activePolls[requestId]);
                    delete state.activePolls[requestId];
                }
                return;
            }

            try {
                const resultUrl = `data/youtube-downloader/downloads/req_${requestId}/result.json`;
                const response = await fetch(resultUrl);

                if (!response.ok) {
                    return;
                }

                const result = await response.json();

                if (result.status === 'completed' || result.status === 'partial' || result.status === 'error') {
                    if (state.activePolls[requestId]) {
                        clearInterval(state.activePolls[requestId]);
                        delete state.activePolls[requestId];
                    }

                    const idx = state.history.findIndex(h => h.id === requestId);
                    if (idx === -1) return;

                    const entry = state.history[idx];

                    if (result.results && result.results.length > 0) {
                        const firstResult = result.results[0];
                        entry.status = firstResult.status === 'completed' ? 'completed' : 'error';
                        entry.title = firstResult.title || entry.title;
                        entry.fileName = firstResult.file_name || null;
                        entry.fileSize = firstResult.file_size || null;
                        entry.multipart = firstResult.multipart || false;
                        entry.totalParts = firstResult.total_parts || 1;
                        entry.quality = firstResult.quality || entry.quality;
                        entry.completedAt = Date.now();

                        if (entry.multipart && entry.totalParts > 1) {
                            entry.parts = [];
                            const baseFileName = firstResult.file_name.replace(/\.[^.]+$/, '');
                            for (let p = 1; p <= entry.totalParts; p++) {
                                entry.parts.push({
                                    part: p,
                                    fileName: `${baseFileName}.part${p}.rar`,
                                    downloadUrl: `data/youtube-downloader/downloads/req_${requestId}/${baseFileName}.part${p}.rar`
                                });
                            }
                        } else if (entry.fileName) {
                            entry.fileUrl = `data/youtube-downloader/downloads/req_${requestId}/${entry.fileName}`;
                        }
                    }

                    if (result.errors && result.errors.length > 0) {
                        const firstError = result.errors[0];
                        entry.status = 'error';
                        entry.errorMessage = firstError.error || 'خطای نامشخص';
                        entry.errorTitle = firstError.title || '';
                    }

                    if ((!result.results || result.results.length === 0) && result.status === 'error') {
                        entry.status = 'error';
                        entry.errorMessage = 'خطا در پردازش درخواست — لطفاً دوباره تلاش کنید';
                    }

                    saveHistory(state.history);
                    renderView();
                }
            } catch (error) {
                if (attempts % 10 === 0) {
                    console.log(`Polling attempt ${attempts} for request ${requestId}...`);
                }
            }
        };

        const intervalId = setInterval(poll, POLL_INTERVAL);
        state.activePolls[requestId] = intervalId;
        poll();
    };

    // ============================================
    // Submit Request
    // ============================================

    /**
     * Submit download request to GitHub Action
     */
    const submitRequest = async () => {
        if (!state.limits.canRequest) return;
        if (!state.url.trim()) return;

        if (!isValidYouTubeUrl(state.url)) {
            state.error = 'لینک یوتوب نامعتبر است — لینک باید با https://www.youtube.com یا https://youtu.be شروع شود';
            renderView();
            return;
        }

        state.isLoading = true;
        state.error = null;
        renderView();

        recordRequest();

        const requestId = Utils.generateId('yt');

        const entry = {
            id: requestId,
            url: state.url,
            quality: state.audioOnly ? 'audio' : state.quality,
            audioOnly: state.audioOnly,
            title: extractVideoId(state.url) || 'در حال دریافت اطلاعات...',
            status: 'processing',
            fileUrl: null,
            fileName: null,
            fileSize: null,
            multipart: false,
            totalParts: 1,
            parts: null,
            errorMessage: null,
            errorTitle: null,
            timestamp: Date.now(),
            completedAt: null
        };

        state.history.unshift(entry);
        saveHistory(state.history);

        const submittedUrl = state.url;
        const submittedQuality = state.quality;
        const submittedAudioOnly = state.audioOnly;

        state.url = '';
        state.error = null;

        renderView();

        const dispatched = await dispatchWorkflow(requestId, submittedUrl, submittedQuality, submittedAudioOnly);

        if (dispatched === true) {
            startPolling(requestId);
        } else if (dispatched === 'needs_token') {
            const idx = state.history.findIndex(h => h.id === requestId);
            if (idx !== -1) {
                state.history[idx].status = 'awaiting_token';
                state.history[idx].errorMessage = 'نیاز به توکن GitHub — لطفاً توکن خود را وارد کنید';
                saveHistory(state.history);
            }
            state.error = null;
            renderView();
            showTokenPrompt(requestId);
        } else {
            const idx = state.history.findIndex(h => h.id === requestId);
            if (idx !== -1) {
                state.history[idx].status = 'error';
                state.history[idx].errorMessage = 'خطا در ارسال درخواست به سرور — لطفاً دوباره تلاش کنید یا توکن GitHub را تنظیم کنید';
                saveHistory(state.history);
            }
        }

        state.isLoading = false;
        renderView();
    };

    /**
     * Show token input prompt modal
     * @param {string} requestId - Pending request ID to retry after token is saved
     */
    const showTokenPrompt = (requestId) => {
        const container = document.getElementById('plugin-container');
        if (!container) return;

        const tokenHtml = `
            <div class="yt-token-overlay" id="yt-token-overlay">
                <div class="yt-token-box glass-base">
                    <h3 class="yt-token-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        تنظیم توکن GitHub
                    </h3>
                    <p class="yt-token-desc">
                        برای دانلود خودکار نیاز به یک GitHub Personal Access Token دارید.
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
                    <div class="yt-token-input-row">
                        <input type="password" class="yt-token-input" id="yt-token-input" 
                               placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off" dir="ltr">
                        <button class="btn btn-primary" id="yt-token-save" style="white-space:nowrap;">
                            ذخیره و ادامه
                        </button>
                    </div>
                    <button class="btn btn-ghost" id="yt-token-skip" style="width:100%;margin-top:var(--space-md);">
                        بی‌خیال — حذف درخواست
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', tokenHtml);

        const saveBtn = document.getElementById('yt-token-save');
        const skipBtn = document.getElementById('yt-token-skip');
        const tokenInput = document.getElementById('yt-token-input');

        const removeOverlay = () => {
            const overlay = document.getElementById('yt-token-overlay');
            if (overlay) overlay.remove();
        };

        if (saveBtn && tokenInput) {
            saveBtn.addEventListener('click', () => {
                const token = tokenInput.value.trim();
                if (token && token.startsWith('ghp_')) {
                    saveToken(token);
                    state.githubToken = token;
                    removeOverlay();

                    const idx = state.history.findIndex(h => h.id === requestId);
                    if (idx !== -1) {
                        const entry = state.history[idx];
                        entry.status = 'processing';
                        entry.errorMessage = null;
                        saveHistory(state.history);

                        dispatchWorkflow(requestId, entry.url, entry.quality, entry.audioOnly)
                            .then(result => {
                                if (result === true) {
                                    startPolling(requestId);
                                } else {
                                    entry.status = 'error';
                                    entry.errorMessage = 'خطا در ارسال درخواست — توکن را بررسی کنید';
                                    saveHistory(state.history);
                                    renderView();
                                }
                            });
                    }

                    renderView();
                }
            });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                removeOverlay();
                const idx = state.history.findIndex(h => h.id === requestId);
                if (idx !== -1) {
                    state.history.splice(idx, 1);
                    saveHistory(state.history);
                }
                renderView();
            });
        }

        if (tokenInput) {
            tokenInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && saveBtn) {
                    saveBtn.click();
                }
            });
            setTimeout(() => tokenInput.focus(), 100);
        }
    };

    // ============================================
    // URL Validation
    // ============================================

    const isValidYouTubeUrl = (url) => {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^(https?:\/\/)?(www\.)?(m\.)?youtube\.com\/watch\?v=[\w-]+/,
            /^(https?:\/\/)?youtu\.be\/[\w-]+/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/
        ];
        return patterns.some(p => p.test(url));
    };

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

    const renderView = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;

        container.innerHTML = renderFullView();
        bindEvents();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

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

        const submitBtn = document.getElementById('yt-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = !state.limits.canRequest || state.isLoading;
        }
    };

    const renderFullView = () => `
        <div class="yt-downloader">
            ${renderHeader()}
            ${renderLimitsBar()}
            ${renderDownloadBox()}
            ${renderHistory()}
        </div>
    `;

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
                        const isAwaitingToken = item.status === 'awaiting_token';
                        const isCompleted = item.status === 'completed';
                        const isError = item.status === 'error';
                        const hasParts = item.multipart && item.totalParts > 1 && item.parts;

                        return `
                            <div class="yt-history-item">
                                <div class="yt-history-icon ${isProcessing || isAwaitingToken ? 'processing' : isCompleted ? 'completed' : 'error'}">
                                    ${isProcessing ? `
                                        <div class="yt-history-spinner"></div>
                                    ` : isAwaitingToken ? `
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                                        </svg>
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
                                        ${isAwaitingToken ? ' — نیاز به توکن GitHub' :
                                          isProcessing ? ' — در حال پردازش توسط سرور...' : 
                                          isCompleted ? (item.fileSize ? ` — ${formatFileSize(item.fileSize)}` : ' — تکمیل شد') : 
                                          ` — ${Utils.escapeHtml(item.errorMessage || 'خطا')}`}
                                    </span>
                                </div>
                                <span class="yt-history-time">${timeAgo}</span>
                                
                                ${isAwaitingToken ? `
                                    <button class="yt-history-download-btn" id="yt-retry-token-${item.id}">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                                        </svg>
                                        تنظیم توکن
                                    </button>
                                ` : ''}
                                
                                ${isError && item.errorMessage && !isAwaitingToken ? `
                                    <button class="yt-history-error-btn" onclick="document.getElementById('yt-error-popup-${item.id}').style.display='flex';document.getElementById('yt-error-overlay-${item.id}').style.display='block';">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                        </svg>
                                        علت خطا
                                    </button>
                                    <div class="yt-error-popup-overlay" id="yt-error-overlay-${item.id}" style="display:none;" onclick="document.getElementById('yt-error-overlay-${item.id}').style.display='none';document.getElementById('yt-error-popup-${item.id}').style.display='none';"></div>
                                    <div class="yt-error-popup" id="yt-error-popup-${item.id}" style="display:none;">
                                        <div class="yt-error-popup-title">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" style="width:22px;height:22px;">
                                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                            </svg>
                                            خطا در دانلود
                                        </div>
                                        <div class="yt-error-popup-message">${Utils.escapeHtml(item.errorMessage)}</div>
                                        ${item.errorTitle ? `<div class="yt-error-popup-url">🎬 ${Utils.escapeHtml(item.errorTitle)}</div>` : ''}
                                        <button class="yt-error-popup-close" onclick="document.getElementById('yt-error-overlay-${item.id}').style.display='none';document.getElementById('yt-error-popup-${item.id}').style.display='none';">متوجه شدم</button>
                                    </div>
                                ` : ''}
                                
                                ${isCompleted && hasParts ? `
                                    <div class="yt-parts-container">
                                        ${item.parts.map(p => `
                                            <a href="${p.downloadUrl}" class="yt-part-btn" download>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                                پارت ${p.part}
                                            </a>
                                        `).join('')}
                                    </div>
                                ` : isCompleted && item.fileUrl ? `
                                    <a href="${item.fileUrl}" class="yt-history-download-btn" download>
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

    // ============================================
    // Helpers
    // ============================================

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

    const formatFileSize = (bytes) => {
        if (!bytes) return 'نامشخص';
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    // ============================================
    // Event Binding
    // ============================================

    const bindEvents = () => {
        const urlInput = document.getElementById('yt-url-input');
        if (urlInput) {
            urlInput.addEventListener('input', Utils.debounce((e) => {
                state.url = e.target.value;
                state.error = null;
            }, 300));
        }

        const qualitySelect = document.getElementById('yt-quality-select');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                state.quality = e.target.value;
            });
        }

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

        const submitBtn = document.getElementById('yt-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                submitRequest();
            });
        }

        if (urlInput) {
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && state.limits.canRequest && !state.isLoading) {
                    submitRequest();
                }
            });
        }

        // Token retry buttons (for awaiting_token items)
        state.history.forEach(item => {
            if (item.status === 'awaiting_token') {
                const retryBtn = document.getElementById(`yt-retry-token-${item.id}`);
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        showTokenPrompt(item.id);
                    });
                }
            }
        });
    };

    // ============================================
    // Plugin Lifecycle
    // ============================================

    const init = async (container) => {
        state.history = loadHistory();
        state.url = '';
        state.quality = '1080p';
        state.audioOnly = false;
        state.error = null;
        state.isLoading = false;
        state.activePolls = {};
        state.githubToken = loadToken();

        // Resume polling for any unfinished requests
        state.history.forEach(item => {
            if (item.status === 'processing') {
                startPolling(item.id);
            }
        });

        calculateLimits();
        renderView();
        EventBus.emit('tool:mounted', { toolId: 'youtube-downloader' });
    };

    const destroy = () => {
        if (state.cooldownTimer) {
            clearInterval(state.cooldownTimer);
            state.cooldownTimer = null;
        }

        Object.values(state.activePolls).forEach(intervalId => {
            clearInterval(intervalId);
        });
        state.activePolls = {};

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
