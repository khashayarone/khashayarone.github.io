/**
 * YouTube Downloader Plugin — Khashayar One
 * Downloads YouTube videos via GitHub Action workflow dispatch
 * Rate limited: 10 requests/hour, 5 min cooldown
 * Part of Khashayar One Tool Platform
 */

const YouTubeDownloaderPlugin = (() => {
    'use strict';

    // ============================================
    // Configuration
    // ============================================

    const MAX_REQUESTS_PER_HOUR = 10;
    const COOLDOWN_MINUTES = 5;
    const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
    const POLL_INTERVAL = 15000;
    const POLL_MAX_ATTEMPTS = 120;

    const GITHUB_REPO_OWNER = 'khashayarone';
    const GITHUB_REPO_NAME = 'khashayarone.github.io';
    const GITHUB_WORKFLOW_ID = 'youtube-downloader.yml';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;

    const QUALITY_OPTIONS = [
        { value: '2160p', label: '4K — 2160p' },
        { value: '1440p', label: '2K — 1440p' },
        { value: '1080p', label: 'Full HD — 1080p' },
        { value: '720p', label: 'HD — 720p' },
        { value: '480p', label: '480p' },
        { value: '360p', label: '360p' },
        { value: 'audio', label: '🎵 فقط صوت (MP3)' }
    ];

    const STORAGE_KEY = 'youtube-dl';
    const HISTORY_KEY = 'youtube-dl:history';

    // ============================================
    // State
    // ============================================

    let state = {
        url: '',
        quality: '1080p',
        audioOnly: false,
        history: [],
        limits: { remaining: MAX_REQUESTS_PER_HOUR, cooldownRemaining: 0, todayTotal: 0, canRequest: true },
        isLoading: false,
        error: null,
        cooldownTimer: null,
        activePolls: {}
    };

    // ============================================
    // Storage
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
                return data.hourKey === getHourKey() ? data : { hourKey: getHourKey(), count: 0, lastRequest: 0 };
            }
        } catch (e) { /* corrupted */ }
        return { hourKey: getHourKey(), count: 0, lastRequest: 0 };
    };

    const saveLimits = (data) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    };

    const loadHistory = () => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw).slice(0, 50) : [];
        } catch (e) { return []; }
    };

    const saveHistory = (h) => {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50))); } catch (e) { /* ignore */ }
    };

    // ============================================
    // Rate Limiting
    // ============================================

    const calculateLimits = () => {
        const limitData = loadLimits();
        const now = Date.now();
        const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - limitData.count);
        let cooldownRemaining = 0;
        if (limitData.lastRequest > 0) {
            const elapsed = now - limitData.lastRequest;
            if (elapsed < COOLDOWN_MS) cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        }
        state.limits = { remaining, cooldownRemaining, todayTotal: limitData.count, canRequest: remaining > 0 && cooldownRemaining === 0 };
        if (cooldownRemaining > 0 && !state.cooldownTimer) startCooldownTimer(cooldownRemaining);
    };

    const startCooldownTimer = (seconds) => {
        if (state.cooldownTimer) clearInterval(state.cooldownTimer);
        state.cooldownTimer = setInterval(() => {
            seconds--;
            state.limits.cooldownRemaining = seconds;
            if (seconds <= 0) {
                clearInterval(state.cooldownTimer);
                state.cooldownTimer = null;
                state.limits.cooldownRemaining = 0;
                calculateLimits();
                render();
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
        const d = loadLimits();
        d.count++;
        d.lastRequest = Date.now();
        saveLimits(d);
        calculateLimits();
    };

    // ============================================
    // Bale Connection
    // ============================================

    const getBaleConnection = () => {
        try {
            const raw = localStorage.getItem('bale-connection');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.status === 'connected' && data.chat_id) return data;
            }
        } catch (e) { /* ignore */ }
        return null;
    };

    // ============================================
    // Dispatch & Polling
    // ============================================

    const dispatchWorkflow = async (requestId, url, quality, audioOnly) => {
        const bale = getBaleConnection();
        const body = {
            ref: 'main',
            inputs: {
                request_id: requestId,
                youtube_urls: url,
                quality: quality,
                audio_only: audioOnly ? 'true' : 'false',
                bale_code: bale ? bale.code : '',
                bale_chat_id: bale ? String(bale.chat_id) : ''
            }
        };

        const headers = { 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' };

        try {
            const response = await fetch(GITHUB_API_URL, {
                method: 'POST', headers, body: JSON.stringify(body)
            });
            if (response.ok) return true;
            return response.status === 401 || response.status === 403 ? 'needs_token' : false;
        } catch (e) {
            return false;
        }
    };

    const startPolling = (requestId) => {
        let attempts = 0;
        const poll = async () => {
            attempts++;
            if (attempts > POLL_MAX_ATTEMPTS) {
                updateHistoryItem(requestId, { status: 'error', errorMessage: 'زمان اجرا به پایان رسید' });
                if (state.activePolls[requestId]) { clearInterval(state.activePolls[requestId]); delete state.activePolls[requestId]; }
                return;
            }
            try {
                const resultUrl = `data/youtube-downloader/downloads/req_${requestId}/result.json`;
                const response = await fetch(resultUrl);
                if (!response.ok) return;
                const result = await response.json();
                if (result.status === 'completed' || result.status === 'partial' || result.status === 'error') {
                    if (state.activePolls[requestId]) { clearInterval(state.activePolls[requestId]); delete state.activePolls[requestId]; }
                    processResult(requestId, result);
                }
            } catch (e) { /* continue polling */ }
        };
        const intervalId = setInterval(poll, POLL_INTERVAL);
        state.activePolls[requestId] = intervalId;
        poll();
    };

    const processResult = (requestId, result) => {
        const idx = state.history.findIndex(h => h.id === requestId);
        if (idx === -1) return;
        const entry = state.history[idx];

        if (result.results && result.results.length > 0) {
            const r = result.results[0];
            entry.status = r.status === 'completed' ? 'completed' : 'error';
            entry.title = r.title || entry.title;
            entry.fileName = r.file_name || null;
            entry.fileSize = r.file_size || null;
            entry.multipart = r.multipart || false;
            entry.totalParts = r.total_parts || 1;
            entry.quality = r.quality || entry.quality;
            entry.completedAt = Date.now();

            const basePath = `data/youtube-downloader/downloads/req_${requestId}`;
            if (entry.multipart && entry.totalParts > 1) {
                entry.parts = [];
                const baseFileName = r.file_name.replace(/\.[^.]+$/, '');
                for (let p = 1; p <= entry.totalParts; p++) {
                    entry.parts.push({ part: p, fileName: `${baseFileName}.part${p}.rar`, downloadUrl: `${basePath}/${baseFileName}.part${p}.rar` });
                }
            } else if (entry.fileName) {
                entry.fileUrl = `${basePath}/${entry.fileName}`;
            }
        }

        if (result.errors && result.errors.length > 0) {
            entry.status = 'error';
            entry.errorMessage = result.errors[0].error || 'خطای نامشخص';
        }

        if ((!result.results || result.results.length === 0) && result.status === 'error') {
            entry.status = 'error';
            entry.errorMessage = 'خطا در پردازش درخواست';
        }

        // Log Bale notification
        if (entry.status === 'completed') {
            const bale = getBaleConnection();
            if (bale) console.log(`📬 Bale notification ready for ${bale.first_name || 'user'}`);
        }

        saveHistory(state.history);
        render();
    };

    const updateHistoryItem = (requestId, updates) => {
        const idx = state.history.findIndex(h => h.id === requestId);
        if (idx !== -1) {
            Object.assign(state.history[idx], updates);
            saveHistory(state.history);
            render();
        }
    };

    // ============================================
    // Submit
    // ============================================

    const submitRequest = async () => {
        if (!state.limits.canRequest || !state.url.trim()) return;
        if (!isValidYouTubeUrl(state.url)) {
            state.error = 'لینک یوتوب نامعتبر است';
            render();
            return;
        }

        state.isLoading = true;
        state.error = null;
        render();
        recordRequest();

        const requestId = Utils.generateId('yt');
        const entry = {
            id: requestId, url: state.url, quality: state.audioOnly ? 'audio' : state.quality,
            audioOnly: state.audioOnly, title: extractVideoId(state.url) || 'در حال دریافت...',
            status: 'processing', fileUrl: null, fileName: null, fileSize: null,
            multipart: false, totalParts: 1, parts: null, errorMessage: null,
            timestamp: Date.now(), completedAt: null
        };

        state.history.unshift(entry);
        saveHistory(state.history);

        const submittedUrl = state.url;
        const submittedQuality = state.quality;
        const submittedAudioOnly = state.audioOnly;
        state.url = '';
        state.error = null;
        render();

        const dispatched = await dispatchWorkflow(requestId, submittedUrl, submittedQuality, submittedAudioOnly);
        if (dispatched === true) {
            startPolling(requestId);
        } else if (dispatched === 'needs_token') {
            updateHistoryItem(requestId, { status: 'awaiting_token', errorMessage: 'نیاز به توکن GitHub' });
        } else {
            updateHistoryItem(requestId, { status: 'error', errorMessage: 'خطا در ارسال درخواست' });
        }

        state.isLoading = false;
        render();
    };

    // ============================================
    // URL Validation
    // ============================================

    const isValidYouTubeUrl = (url) => {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url) ||
               /^(https?:\/\/)?(www\.)?(m\.)?youtube\.com\/watch\?v=[\w-]+/.test(url) ||
               /^(https?:\/\/)?youtu\.be\/[\w-]+/.test(url);
    };

    const extractVideoId = (url) => {
        const patterns = [/(?:v=|\/)([\w-]{11})(?:[&?]|$)/, /youtu\.be\/([\w-]{11})/];
        for (const p of patterns) {
            const match = url.match(p);
            if (match) return match[1];
        }
        return null;
    };

    // ============================================
    // Helpers
    // ============================================

    const getRelativeTime = (timestamp) => {
        const diff = Date.now() - timestamp;
        const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
        if (s < 10) return 'لحظاتی پیش';
        if (s < 60) return `${s} ثانیه پیش`;
        if (m < 60) return `${m} دقیقه پیش`;
        if (h < 24) return `${h} ساعت پیش`;
        return `${d} روز پیش`;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'نامشخص';
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    // ============================================
    // Render
    // ============================================

    const render = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;
        container.innerHTML = renderFullView();
        bindEvents();
    };

    const updateCooldownDisplay = () => {
        const el = document.getElementById('yt-cooldown-value');
        if (el) el.textContent = state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده';
        const btn = document.getElementById('yt-submit-btn');
        if (btn) btn.disabled = !state.limits.canRequest || state.isLoading;
    };

    const renderFullView = () => `
        <div class="yt-downloader">
            <div class="yt-header">
                <h2 class="yt-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                    دانلودر یوتوب
                </h2>
            </div>
            ${renderLimitsBar()}
            ${renderDownloadBox()}
            ${renderHistory()}
        </div>
    `;

    const renderLimitsBar = () => `
        <div class="yt-limits-bar">
            <div class="yt-limit-card"><div class="yt-limit-icon remaining"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div class="yt-limit-info"><span class="yt-limit-value">${state.limits.remaining.toLocaleString('fa-IR')} / ${MAX_REQUESTS_PER_HOUR}</span><span class="yt-limit-label">درخواست باقی‌مانده</span></div></div>
            <div class="yt-limit-card"><div class="yt-limit-icon cooldown"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="yt-limit-info"><span class="yt-limit-value" id="yt-cooldown-value">${state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده'}</span><span class="yt-limit-label">${state.limits.cooldownRemaining > 0 ? 'زمان تا بعدی' : 'وضعیت'}</span></div></div>
            <div class="yt-limit-card"><div class="yt-limit-icon today"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="yt-limit-info"><span class="yt-limit-value">${state.limits.todayTotal.toLocaleString('fa-IR')}</span><span class="yt-limit-label">درخواست این ساعت</span></div></div>
            <div class="yt-limit-card"><div class="yt-limit-icon status"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div class="yt-limit-info"><span class="yt-limit-value" style="font-size:var(--font-size-base);color:${state.limits.canRequest ? '#2dd4bf' : '#f59e0b'};">${state.limits.canRequest ? 'مجاز' : 'محدود'}</span><span class="yt-limit-label">وضعیت</span></div></div>
        </div>
    `;

    const renderDownloadBox = () => `
        <div class="yt-download-box">
            <div class="yt-input-group">
                <label class="yt-input-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> لینک ویدیو</label>
                <input type="text" class="yt-url-input" id="yt-url-input" placeholder="https://www.youtube.com/watch?v=..." value="${Utils.escapeHtml(state.url)}" autocomplete="off" dir="ltr">
            </div>
            <div class="yt-options-row">
                <div class="yt-input-group">
                    <label class="yt-input-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> کیفیت</label>
                    <select class="yt-select" id="yt-quality-select" ${state.audioOnly ? 'disabled' : ''}>
                        ${QUALITY_OPTIONS.filter(q => q.value !== 'audio').map(q => `<option value="${q.value}" ${state.quality === q.value ? 'selected' : ''}>${q.label}</option>`).join('')}
                    </select>
                </div>
                <div class="yt-checkbox-group ${state.audioOnly ? 'checked' : ''}" id="yt-audio-only">
                    <input type="checkbox" class="yt-checkbox" id="yt-audio-checkbox" ${state.audioOnly ? 'checked' : ''}>
                    <span class="yt-checkbox-label">فقط صوت (MP3)</span>
                </div>
            </div>
            ${state.error ? `<div class="yt-limit-warning"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${Utils.escapeHtml(state.error)}</div>` : ''}
            ${!state.limits.canRequest && !state.error ? `<div class="yt-limit-warning"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${state.limits.cooldownRemaining > 0 ? `${formatCooldown(state.limits.cooldownRemaining)} تا درخواست بعدی` : 'محدودیت ساعتی (۱۰ درخواست)'}</div>` : ''}
            <div class="yt-submit-row">
                <button class="yt-submit-btn" id="yt-submit-btn" ${(!state.limits.canRequest || state.isLoading) ? 'disabled' : ''}>
                    ${state.isLoading ? '<div class="yt-history-spinner" style="width:20px;height:20px;border-color:rgba(255,255,255,0.2);border-top-color:white;"></div> در حال ارسال...' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> شروع دانلود'}
                </button>
            </div>
        </div>
    `;

    const renderHistory = () => `
        <div class="yt-history-section">
            <h3 class="yt-history-title"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> درخواست‌های اخیر</h3>
            ${state.history.length === 0 ? '<div class="yt-history-empty">هنوز درخواستی ثبت نشده</div>' : `
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
                                    ${isProcessing ? '<div class="yt-history-spinner"></div>' : isCompleted ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'}
                                </div>
                                <div class="yt-history-content">
                                    <span class="yt-history-item-title">${Utils.escapeHtml(item.title)}</span>
                                    <span class="yt-history-item-meta">${item.audioOnly ? '🎵 صوت' : '🎬 ' + item.quality} — ${isAwaitingToken ? 'نیاز به توکن' : isProcessing ? 'در حال پردازش...' : isCompleted ? (item.fileSize ? formatFileSize(item.fileSize) : 'تکمیل شد') : Utils.escapeHtml(item.errorMessage || 'خطا')}</span>
                                </div>
                                <span class="yt-history-time">${timeAgo}</span>
                                ${isAwaitingToken ? `<button class="yt-history-download-btn" style="background:#f59e0b;">تنظیم توکن</button>` : ''}
                                ${isError && item.errorMessage && !isAwaitingToken ? `<button class="yt-history-download-btn" style="background:#f87171;" onclick="this.nextElementSibling.style.display='block';this.nextElementSibling.nextElementSibling.style.display='flex';">علت خطا</button><div class="yt-error-popup-overlay" style="display:none;" onclick="this.style.display='none';this.nextElementSibling.style.display='none';"></div><div class="yt-error-popup" style="display:none;"><div class="yt-error-popup-title">❌ خطا در دانلود</div><div class="yt-error-popup-message">${Utils.escapeHtml(item.errorMessage)}</div><button class="yt-error-popup-close" onclick="this.parentElement.style.display='none';this.parentElement.previousElementSibling.style.display='none';">متوجه شدم</button></div>` : ''}
                                ${isCompleted && hasParts ? `<div class="yt-parts-container">${item.parts.map(p => `<a href="${p.downloadUrl}" class="yt-part-btn" download>📥 پارت ${p.part}</a>`).join('')}</div>` : isCompleted && item.fileUrl ? `<a href="${item.fileUrl}" class="yt-history-download-btn" download><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> دانلود</a>` : isProcessing ? '<span style="color:var(--color-accent-primary);font-size:var(--font-size-xs);">در حال پردازش</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;

    // ============================================
    // Events
    // ============================================

    const bindEvents = () => {
        document.getElementById('yt-url-input')?.addEventListener('input', Utils.debounce((e) => { state.url = e.target.value; state.error = null; }, 300));
        document.getElementById('yt-quality-select')?.addEventListener('change', (e) => { state.quality = e.target.value; });
        document.getElementById('yt-url-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && state.limits.canRequest && !state.isLoading) submitRequest(); });

        const audioCheck = document.getElementById('yt-audio-checkbox');
        const audioGroup = document.getElementById('yt-audio-only');
        if (audioCheck && audioGroup) {
            audioCheck.addEventListener('change', (e) => { state.audioOnly = e.target.checked; audioGroup.classList.toggle('checked', state.audioOnly); render(); });
            audioGroup.addEventListener('click', (e) => { if (e.target !== audioCheck) { audioCheck.checked = !audioCheck.checked; state.audioOnly = audioCheck.checked; audioGroup.classList.toggle('checked', state.audioOnly); render(); } });
        }

        document.getElementById('yt-submit-btn')?.addEventListener('click', submitRequest);
    };

    // ============================================
    // Lifecycle
    // ============================================

    const init = async (container) => {
        state.history = loadHistory();
        state.url = '';
        state.quality = '1080p';
        state.audioOnly = false;
        state.error = null;
        state.isLoading = false;
        state.activePolls = {};
        state.history.forEach(item => { if (item.status === 'processing') startPolling(item.id); });
        calculateLimits();
        render();
        EventBus.emit('tool:mounted', { toolId: 'youtube-downloader' });
    };

    const destroy = () => {
        if (state.cooldownTimer) { clearInterval(state.cooldownTimer); state.cooldownTimer = null; }
        Object.values(state.activePolls).forEach(id => clearInterval(id));
        state.activePolls = {};
        EventBus.emit('tool:destroyed', { toolId: 'youtube-downloader' });
    };

    return { init, destroy };
})();

window.YouTubeDownloaderPlugin = YouTubeDownloaderPlugin;
Object.freeze(YouTubeDownloaderPlugin);
