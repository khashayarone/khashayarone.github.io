/**
 * Telegram Downloader Plugin — Khashayar One
 * Downloads files from Telegram channels/groups via GitHub Action
 * Rate limited: 10 requests/hour, 5 min cooldown
 * Part of Khashayar One Tool Platform
 */

const TelegramDownloaderPlugin = (() => {
    'use strict';

    const MAX_REQUESTS_PER_HOUR = 10;
    const COOLDOWN_MINUTES = 5;
    const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
    const POLL_INTERVAL = 15000;
    const POLL_MAX_ATTEMPTS = 120;

    const GITHUB_REPO_OWNER = 'khashayarone';
    const GITHUB_REPO_NAME = 'khashayarone.github.io';
    const GITHUB_WORKFLOW_ID = 'telegram-downloader.yml';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;

    const STORAGE_KEY = 'telegram-dl';
    const HISTORY_KEY = 'telegram-dl:history';

    let state = {
        url: '',
        fileType: 'any',
        history: [],
        limits: { remaining: MAX_REQUESTS_PER_HOUR, cooldownRemaining: 0, todayTotal: 0, canRequest: true },
        isLoading: false,
        error: null,
        cooldownTimer: null,
        activePolls: {}
    };

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

    const dispatchWorkflow = async (requestId, url, fileType) => {
        const bale = getBaleConnection();
        const body = {
            ref: 'main',
            inputs: {
                request_id: requestId,
                telegram_urls: url,
                file_type: fileType,
                bale_code: bale ? bale.code : '',
                bale_chat_id: bale ? String(bale.chat_id) : ''
            }
        };

        try {
            const response = await fetch(GITHUB_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
                body: JSON.stringify(body)
            });
            return response.ok ? true : (response.status === 401 || response.status === 403 ? 'needs_token' : false);
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
                const resultUrl = `data/telegram-downloader/downloads/req_${requestId}/result.json`;
                const response = await fetch(resultUrl);
                if (!response.ok) return;
                const result = await response.json();
                if (result.status === 'completed' || result.status === 'partial' || result.status === 'error') {
                    if (state.activePolls[requestId]) { clearInterval(state.activePolls[requestId]); delete state.activePolls[requestId]; }
                    processResult(requestId, result);
                }
            } catch (e) { /* continue polling */ }
        };
        state.activePolls[requestId] = setInterval(poll, POLL_INTERVAL);
        poll();
    };

    const processResult = (requestId, result) => {
        const idx = state.history.findIndex(h => h.id === requestId);
        if (idx === -1) return;
        const entry = state.history[idx];

        if (result.results && result.results.length > 0) {
            const r = result.results[0];
            entry.status = r.status === 'completed' ? 'completed' : 'error';
            entry.title = r.title || r.file_name || entry.title;
            entry.fileName = r.file_name || null;
            entry.fileSize = r.file_size || null;
            entry.completedAt = Date.now();
            if (entry.fileName) entry.fileUrl = `data/telegram-downloader/downloads/req_${requestId}/${entry.fileName}`;
        }

        if (result.errors && result.errors.length > 0) {
            entry.status = 'error';
            entry.errorMessage = result.errors[0].error || 'خطای نامشخص';
        }

        if ((!result.results || result.results.length === 0) && result.status === 'error') {
            entry.status = 'error';
            entry.errorMessage = 'خطا در پردازش درخواست';
        }

        if (entry.status === 'completed') {
            const bale = getBaleConnection();
            if (bale) console.log(`📬 Bale notification ready for ${bale.first_name || 'user'}`);
        }

        saveHistory(state.history);
        render();
    };

    const updateHistoryItem = (requestId, updates) => {
        const idx = state.history.findIndex(h => h.id === requestId);
        if (idx !== -1) { Object.assign(state.history[idx], updates); saveHistory(state.history); render(); }
    };

    const isValidTelegramUrl = (url) => {
        return /^(https?:\/\/)?(t\.me|telegram\.me)\/.+/.test(url);
    };

    const submitRequest = async () => {
        if (!state.limits.canRequest || !state.url.trim()) return;
        if (!isValidTelegramUrl(state.url)) {
            state.error = 'لینک تلگرام نامعتبر است (باید با t.me شروع شود)';
            render();
            return;
        }

        state.isLoading = true;
        state.error = null;
        render();
        recordRequest();

        const requestId = Utils.generateId('tg');
        const entry = {
            id: requestId, url: state.url, fileType: state.fileType,
            title: state.url.split('/').pop() || 'فایل تلگرام',
            status: 'processing', fileUrl: null, fileName: null, fileSize: null,
            errorMessage: null, timestamp: Date.now(), completedAt: null
        };

        state.history.unshift(entry);
        saveHistory(state.history);

        const submittedUrl = state.url;
        const submittedType = state.fileType;
        state.url = '';
        state.error = null;
        render();

        const dispatched = await dispatchWorkflow(requestId, submittedUrl, submittedType);
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

    const render = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;
        container.innerHTML = renderFullView();
        bindEvents();
    };

    const updateCooldownDisplay = () => {
        const el = document.getElementById('tg-cooldown-value');
        if (el) el.textContent = state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده';
        const btn = document.getElementById('tg-submit-btn');
        if (btn) btn.disabled = !state.limits.canRequest || state.isLoading;
    };

    const renderFullView = () => `
        <div class="tg-downloader">
            <div class="tg-header">
                <h2 class="tg-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.441-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.123.034.335.02.56z"/></svg>
                    دانلودر تلگرام
                </h2>
            </div>
            ${renderLimitsBar()}
            ${renderDownloadBox()}
            ${renderHistory()}
        </div>
    `;

    const renderLimitsBar = () => `
        <div class="tg-limits-bar">
            <div class="tg-limit-card"><div class="tg-limit-icon remaining"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div class="tg-limit-info"><span class="tg-limit-value">${state.limits.remaining.toLocaleString('fa-IR')} / ${MAX_REQUESTS_PER_HOUR}</span><span class="tg-limit-label">درخواست باقی‌مانده</span></div></div>
            <div class="tg-limit-card"><div class="tg-limit-icon cooldown"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="tg-limit-info"><span class="tg-limit-value" id="tg-cooldown-value">${state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده'}</span><span class="tg-limit-label">${state.limits.cooldownRemaining > 0 ? 'زمان تا بعدی' : 'وضعیت'}</span></div></div>
            <div class="tg-limit-card"><div class="tg-limit-icon today"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="tg-limit-info"><span class="tg-limit-value">${state.limits.todayTotal.toLocaleString('fa-IR')}</span><span class="tg-limit-label">درخواست این ساعت</span></div></div>
            <div class="tg-limit-card"><div class="tg-limit-icon status"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div class="tg-limit-info"><span class="tg-limit-value" style="font-size:var(--font-size-base);color:${state.limits.canRequest ? '#2dd4bf' : '#f59e0b'};">${state.limits.canRequest ? 'مجاز' : 'محدود'}</span><span class="tg-limit-label">وضعیت</span></div></div>
        </div>
    `;

    const renderDownloadBox = () => `
        <div class="tg-download-box">
            <div class="tg-input-group">
                <label class="tg-input-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> لینک تلگرام</label>
                <input type="text" class="tg-url-input" id="tg-url-input" placeholder="https://t.me/..." value="${Utils.escapeHtml(state.url)}" autocomplete="off" dir="ltr">
            </div>
            <div class="tg-options-row">
                <div class="tg-input-group">
                    <label class="tg-input-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> نوع فایل</label>
                    <select class="tg-select" id="tg-file-type">
                        <option value="any" ${state.fileType === 'any' ? 'selected' : ''}>همه فایل‌ها</option>
                        <option value="video" ${state.fileType === 'video' ? 'selected' : ''}>🎬 ویدیو</option>
                        <option value="audio" ${state.fileType === 'audio' ? 'selected' : ''}>🎵 صوت</option>
                        <option value="document" ${state.fileType === 'document' ? 'selected' : ''}>📄 سند</option>
                        <option value="photo" ${state.fileType === 'photo' ? 'selected' : ''}>🖼 تصویر</option>
                    </select>
                </div>
            </div>
            ${state.error ? `<div class="tg-limit-warning"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${Utils.escapeHtml(state.error)}</div>` : ''}
            ${!state.limits.canRequest && !state.error ? `<div class="tg-limit-warning"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${state.limits.cooldownRemaining > 0 ? `${formatCooldown(state.limits.cooldownRemaining)} تا درخواست بعدی` : 'محدودیت ساعتی (۱۰ درخواست)'}</div>` : ''}
            <div class="tg-submit-row">
                <button class="tg-submit-btn" id="tg-submit-btn" ${(!state.limits.canRequest || state.isLoading) ? 'disabled' : ''}>
                    ${state.isLoading ? '<div class="tg-history-spinner" style="width:20px;height:20px;border-color:rgba(255,255,255,0.2);border-top-color:white;"></div> در حال ارسال...' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> شروع دانلود'}
                </button>
            </div>
        </div>
    `;

    const renderHistory = () => `
        <div class="tg-history-section">
            <h3 class="tg-history-title"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> درخواست‌های اخیر</h3>
            ${state.history.length === 0 ? '<div class="tg-history-empty">هنوز درخواستی ثبت نشده</div>' : `
                <div class="tg-history-list">
                    ${state.history.slice(0, 20).map(item => {
                        const timeAgo = getRelativeTime(item.timestamp);
                        const isProcessing = item.status === 'processing';
                        const isAwaitingToken = item.status === 'awaiting_token';
                        const isCompleted = item.status === 'completed';
                        const isError = item.status === 'error';
                        return `
                            <div class="tg-history-item">
                                <div class="tg-history-icon ${isProcessing || isAwaitingToken ? 'processing' : isCompleted ? 'completed' : 'error'}">
                                    ${isProcessing ? '<div class="tg-history-spinner"></div>' : isCompleted ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'}
                                </div>
                                <div class="tg-history-content">
                                    <span class="tg-history-item-title">${Utils.escapeHtml(item.title)}</span>
                                    <span class="tg-history-item-meta">${item.fileType !== 'any' ? '📁 ' + item.fileType + ' — ' : ''}${isAwaitingToken ? 'نیاز به توکن' : isProcessing ? 'در حال پردازش...' : isCompleted ? (item.fileSize ? formatFileSize(item.fileSize) : 'تکمیل شد') : Utils.escapeHtml(item.errorMessage || 'خطا')}</span>
                                </div>
                                <span class="tg-history-time">${timeAgo}</span>
                                ${isAwaitingToken ? `<button class="tg-history-download-btn" style="background:#f59e0b;">تنظیم توکن</button>` : ''}
                                ${isError && item.errorMessage && !isAwaitingToken ? `<button class="tg-history-download-btn" style="background:#f87171;" onclick="this.nextElementSibling.style.display='block';this.nextElementSibling.nextElementSibling.style.display='flex';">علت خطا</button><div class="tg-error-popup-overlay" style="display:none;" onclick="this.style.display='none';this.nextElementSibling.style.display='none';"></div><div class="tg-error-popup" style="display:none;"><div class="tg-error-popup-title">❌ خطا در دانلود</div><div class="tg-error-popup-message">${Utils.escapeHtml(item.errorMessage)}</div><button class="tg-error-popup-close" onclick="this.parentElement.style.display='none';this.parentElement.previousElementSibling.style.display='none';">متوجه شدم</button></div>` : ''}
                                ${isCompleted && item.fileUrl ? `<a href="${item.fileUrl}" class="tg-history-download-btn" download><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> دانلود</a>` : isProcessing ? '<span style="color:var(--color-accent-primary);font-size:var(--font-size-xs);">در حال پردازش</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;

    const bindEvents = () => {
        document.getElementById('tg-url-input')?.addEventListener('input', Utils.debounce((e) => { state.url = e.target.value; state.error = null; }, 300));
        document.getElementById('tg-file-type')?.addEventListener('change', (e) => { state.fileType = e.target.value; });
        document.getElementById('tg-url-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && state.limits.canRequest && !state.isLoading) submitRequest(); });
        document.getElementById('tg-submit-btn')?.addEventListener('click', submitRequest);
    };

    const init = async (container) => {
        state.history = loadHistory();
        state.url = '';
        state.fileType = 'any';
        state.error = null;
        state.isLoading = false;
        state.activePolls = {};
        state.history.forEach(item => { if (item.status === 'processing') startPolling(item.id); });
        calculateLimits();
        render();
        EventBus.emit('tool:mounted', { toolId: 'telegram-downloader' });
    };

    const destroy = () => {
        if (state.cooldownTimer) { clearInterval(state.cooldownTimer); state.cooldownTimer = null; }
        Object.values(state.activePolls).forEach(id => clearInterval(id));
        state.activePolls = {};
        EventBus.emit('tool:destroyed', { toolId: 'telegram-downloader' });
    };

    return { init, destroy };
})();

window.TelegramDownloaderPlugin = TelegramDownloaderPlugin;
Object.freeze(TelegramDownloaderPlugin);
