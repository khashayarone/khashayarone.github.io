/**
 * Instagram Downloader Plugin — Khashayar One
 * Downloads posts, reels, stories from Instagram via GitHub Action
 * Rate limited: 10 requests/hour, 5 min cooldown
 * Part of Khashayar One Tool Platform
 */

const InstagramDownloaderPlugin = (() => {
    'use strict';

    const MAX_REQUESTS_PER_HOUR = 10;
    const COOLDOWN_MINUTES = 5;
    const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
    const POLL_INTERVAL = 15000;
    const POLL_MAX_ATTEMPTS = 120;

    const GITHUB_REPO_OWNER = 'khashayarone';
    const GITHUB_REPO_NAME = 'khashayarone.github.io';
    const GITHUB_WORKFLOW_ID = 'instagram-downloader.yml';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;

    const CONTENT_OPTIONS = [
        { value: 'post', label: '📸 پست' },
        { value: 'reel', label: '🎬 ریلز' },
        { value: 'story', label: '📖 استوری' },
        { value: 'any', label: '🔍 خودکار (همه)' }
    ];

    const STORAGE_KEY = 'instagram-dl';
    const HISTORY_KEY = 'instagram-dl:history';

    let state = {
        url: '',
        contentType: 'any',
        history: [],
        limits: { remaining: MAX_REQUESTS_PER_HOUR, cooldownRemaining: 0, todayTotal: 0, canRequest: true },
        isLoading: false,
        error: null,
        cooldownTimer: null,
        activePolls: {}
    };

    const getHourKey = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}`;
    };

    const loadLimits = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                return data.hourKey === getHourKey() ? data : { hourKey: getHourKey(), count: 0, lastRequest: 0 };
            }
        } catch(e) {}
        return { hourKey: getHourKey(), count: 0, lastRequest: 0 };
    };

    const saveLimits = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch(e) {} };

    const loadHistory = () => {
        try { const r = localStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r).slice(0,50) : []; } catch(e) { return []; }
    };

    const saveHistory = (h) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0,50))); } catch(e) {} };

    const calculateLimits = () => {
        const d = loadLimits();
        const now = Date.now();
        const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - d.count);
        let cr = 0;
        if (d.lastRequest > 0) { const e = now - d.lastRequest; if (e < COOLDOWN_MS) cr = Math.ceil((COOLDOWN_MS - e) / 1000); }
        state.limits = { remaining, cooldownRemaining: cr, todayTotal: d.count, canRequest: remaining > 0 && cr === 0 };
        if (cr > 0 && !state.cooldownTimer) startCooldownTimer(cr);
    };

    const startCooldownTimer = (s) => {
        if (state.cooldownTimer) clearInterval(state.cooldownTimer);
        state.cooldownTimer = setInterval(() => {
            s--; state.limits.cooldownRemaining = s;
            if (s <= 0) { clearInterval(state.cooldownTimer); state.cooldownTimer = null; state.limits.cooldownRemaining = 0; calculateLimits(); render(); }
            else updateCooldownDisplay();
        }, 1000);
    };

    const formatCooldown = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const recordRequest = () => { const d = loadLimits(); d.count++; d.lastRequest = Date.now(); saveLimits(d); calculateLimits(); };

    const getBaleConnection = () => {
        try { const r = localStorage.getItem('bale-connection'); if (r) { const d = JSON.parse(r); if (d.status==='connected' && d.chat_id) return d; } } catch(e) {}
        return null;
    };

    const dispatchWorkflow = async (requestId, url, contentType) => {
        const bale = getBaleConnection();
        const body = { ref: 'main', inputs: { request_id: requestId, instagram_urls: url, content_type: contentType, bale_code: bale ? bale.code : '', bale_chat_id: bale ? String(bale.chat_id) : '' } };
        try {
            const r = await fetch(GITHUB_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' }, body: JSON.stringify(body) });
            return r.ok ? true : (r.status === 401 || r.status === 403 ? 'needs_token' : false);
        } catch(e) { return false; }
    };

    const startPolling = (requestId) => {
        let attempts = 0;
        const poll = async () => {
            attempts++;
            if (attempts > POLL_MAX_ATTEMPTS) { updateHistoryItem(requestId, { status: 'error', errorMessage: 'زمان اجرا به پایان رسید' }); if (state.activePolls[requestId]) { clearInterval(state.activePolls[requestId]); delete state.activePolls[requestId]; } return; }
            try {
                const r = await fetch(`data/instagram-downloader/downloads/req_${requestId}/result.json`);
                if (!r.ok) return;
                const d = await r.json();
                if (d.status === 'completed' || d.status === 'partial' || d.status === 'error') {
                    if (state.activePolls[requestId]) { clearInterval(state.activePolls[requestId]); delete state.activePolls[requestId]; }
                    processResult(requestId, d);
                }
            } catch(e) {}
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
            if (entry.fileName) entry.fileUrl = `data/instagram-downloader/downloads/req_${requestId}/${entry.fileName}`;
        }
        if (result.errors && result.errors.length > 0) { entry.status = 'error'; entry.errorMessage = result.errors[0].error || 'خطای نامشخص'; }
        if ((!result.results || result.results.length === 0) && result.status === 'error') { entry.status = 'error'; entry.errorMessage = 'خطا در پردازش درخواست'; }
        if (entry.status === 'completed') { const b = getBaleConnection(); if (b) console.log(`📬 Bale notification ready`); }
        saveHistory(state.history); render();
    };

    const updateHistoryItem = (id, u) => { const i = state.history.findIndex(h => h.id === id); if (i !== -1) { Object.assign(state.history[i], u); saveHistory(state.history); render(); } };

    const isValidInstagramUrl = (url) => /^(https?:\/\/)?(www\.)?instagram\.com\/.+/.test(url);

    const submitRequest = async () => {
        if (!state.limits.canRequest || !state.url.trim()) return;
        if (!isValidInstagramUrl(state.url)) { state.error = 'لینک اینستاگرام نامعتبر است'; render(); return; }
        state.isLoading = true; state.error = null; render(); recordRequest();
        const requestId = Utils.generateId('ig');
        const entry = { id: requestId, url: state.url, contentType: state.contentType, title: state.url.split('/').filter(Boolean).pop() || 'پست اینستاگرام', status: 'processing', fileUrl: null, fileName: null, fileSize: null, errorMessage: null, timestamp: Date.now(), completedAt: null };
        state.history.unshift(entry); saveHistory(state.history);
        const u = state.url, t = state.contentType; state.url = ''; state.error = null; render();
        const d = await dispatchWorkflow(requestId, u, t);
        if (d === true) startPolling(requestId);
        else if (d === 'needs_token') updateHistoryItem(requestId, { status: 'awaiting_token', errorMessage: 'نیاز به توکن GitHub' });
        else updateHistoryItem(requestId, { status: 'error', errorMessage: 'خطا در ارسال درخواست' });
        state.isLoading = false; render();
    };

    const getRelativeTime = (ts) => { const diff = Date.now() - ts, s = Math.floor(diff/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24); if (s < 10) return 'لحظاتی پیش'; if (s < 60) return `${s} ثانیه پیش`; if (m < 60) return `${m} دقیقه پیش`; if (h < 24) return `${h} ساعت پیش`; return `${d} روز پیش`; };
    const formatFileSize = (b) => { if (!b) return 'نامشخص'; if (b >= 1073741824) return `${(b/1073741824).toFixed(1)} GB`; if (b >= 1048576) return `${(b/1048576).toFixed(1)} MB`; return `${(b/1024).toFixed(1)} KB`; };

    const render = () => { const c = document.getElementById('plugin-container'); if (!c) return; c.innerHTML = renderFullView(); bindEvents(); };
    const updateCooldownDisplay = () => { const el = document.getElementById('ig-cooldown-value'); if (el) el.textContent = state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده'; const btn = document.getElementById('ig-submit-btn'); if (btn) btn.disabled = !state.limits.canRequest || state.isLoading; };

    const renderFullView = () => `
        <div class="ig-downloader">
            <div class="ig-header"><h2 class="ig-title"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> دانلودر اینستاگرام</h2></div>
            ${renderLimitsBar()}${renderDownloadBox()}${renderHistory()}
        </div>`;

    const renderLimitsBar = () => `
        <div class="ig-limits-bar">
            <div class="ig-limit-card"><div class="ig-limit-icon remaining"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div class="ig-limit-info"><span class="ig-limit-value">${state.limits.remaining.toLocaleString('fa-IR')} / ${MAX_REQUESTS_PER_HOUR}</span><span class="ig-limit-label">درخواست باقی‌مانده</span></div></div>
            <div class="ig-limit-card"><div class="ig-limit-icon cooldown"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="ig-limit-info"><span class="ig-limit-value" id="ig-cooldown-value">${state.limits.cooldownRemaining > 0 ? formatCooldown(state.limits.cooldownRemaining) : 'آماده'}</span><span class="ig-limit-label">${state.limits.cooldownRemaining > 0 ? 'زمان تا بعدی' : 'وضعیت'}</span></div></div>
            <div class="ig-limit-card"><div class="ig-limit-icon today"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="ig-limit-info"><span class="ig-limit-value">${state.limits.todayTotal.toLocaleString('fa-IR')}</span><span class="ig-limit-label">درخواست این ساعت</span></div></div>
            <div class="ig-limit-card"><div class="ig-limit-icon status"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div class="ig-limit-info"><span class="ig-limit-value" style="font-size:var(--font-size-base);color:${state.limits.canRequest ? '#2dd4bf' : '#f59e0b'};">${state.limits.canRequest ? 'مجاز' : 'محدود'}</span><span class="ig-limit-label">وضعیت</span></div></div>
        </div>`;

    const renderDownloadBox = () => `
        <div class="ig-download-box">
            <div class="ig-input-group"><label class="ig-input-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> لینک اینستاگرام</label><input type="text" class="ig-url-input" id="ig-url-input" placeholder="https://www.instagram.com/..." value="${Utils.escapeHtml(state.url)}" autocomplete="off" dir="ltr"></div>
            <div class="ig-options-row"><div class="ig-input-group"><label class="ig-input-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> نوع محتوا</label><select class="ig-select" id="ig-content-type">${CONTENT_OPTIONS.map(o => `<option value="${o.value}" ${state.contentType === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div></div>
            ${state.error ? `<div class="ig-limit-warning"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${Utils.escapeHtml(state.error)}</div>` : ''}
            ${!state.limits.canRequest && !state.error ? `<div class="ig-limit-warning"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${state.limits.cooldownRemaining > 0 ? `${formatCooldown(state.limits.cooldownRemaining)} تا درخواست بعدی` : 'محدودیت ساعتی (۱۰ درخواست)'}</div>` : ''}
            <div class="ig-submit-row"><button class="ig-submit-btn" id="ig-submit-btn" ${(!state.limits.canRequest || state.isLoading) ? 'disabled' : ''}>${state.isLoading ? '<div class="ig-history-spinner" style="width:20px;height:20px;border-color:rgba(255,255,255,0.2);border-top-color:white;"></div> در حال ارسال...' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> شروع دانلود'}</button></div>
        </div>`;

    const renderHistory = () => `
        <div class="ig-history-section">
            <h3 class="ig-history-title"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> درخواست‌های اخیر</h3>
            ${state.history.length === 0 ? '<div class="ig-history-empty">هنوز درخواستی ثبت نشده</div>' : `<div class="ig-history-list">${state.history.slice(0,20).map(item => {
                const timeAgo = getRelativeTime(item.timestamp);
                const isProcessing = item.status === 'processing';
                const isAwaitingToken = item.status === 'awaiting_token';
                const isCompleted = item.status === 'completed';
                const isError = item.status === 'error';
                return `<div class="ig-history-item">
                    <div class="ig-history-icon ${isProcessing||isAwaitingToken?'processing':isCompleted?'completed':'error'}">${isProcessing?'<div class="ig-history-spinner"></div>':isCompleted?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'}</div>
                    <div class="ig-history-content"><span class="ig-history-item-title">${Utils.escapeHtml(item.title)}</span><span class="ig-history-item-meta">${item.contentType&&item.contentType!=='any'?item.contentType+' — ':''}${isAwaitingToken?'نیاز به توکن':isProcessing?'در حال پردازش...':isCompleted?(item.fileSize?formatFileSize(item.fileSize):'تکمیل شد'):Utils.escapeHtml(item.errorMessage||'خطا')}</span></div>
                    <span class="ig-history-time">${timeAgo}</span>
                    ${isAwaitingToken?`<button class="ig-history-download-btn" style="background:#f59e0b;">تنظیم توکن</button>`:''}
                    ${isError&&item.errorMessage&&!isAwaitingToken?`<button class="ig-history-download-btn" style="background:#f87171;" onclick="this.nextElementSibling.style.display='block';this.nextElementSibling.nextElementSibling.style.display='flex';">علت خطا</button><div class="ig-error-popup-overlay" style="display:none;" onclick="this.style.display='none';this.nextElementSibling.style.display='none';"></div><div class="ig-error-popup" style="display:none;"><div class="ig-error-popup-title">❌ خطا</div><div class="ig-error-popup-message">${Utils.escapeHtml(item.errorMessage)}</div><button class="ig-error-popup-close" onclick="this.parentElement.style.display='none';this.parentElement.previousElementSibling.style.display='none';">متوجه شدم</button></div>`:''}
                    ${isCompleted&&item.fileUrl?`<a href="${item.fileUrl}" class="ig-history-download-btn" download><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> دانلود</a>`:isProcessing?'<span style="color:var(--color-accent-primary);font-size:var(--font-size-xs);">در حال پردازش</span>':''}
                </div>`;
            }).join('')}</div>`}
        </div>`;

    const bindEvents = () => {
        document.getElementById('ig-url-input')?.addEventListener('input', Utils.debounce((e) => { state.url = e.target.value; state.error = null; }, 300));
        document.getElementById('ig-content-type')?.addEventListener('change', (e) => { state.contentType = e.target.value; });
        document.getElementById('ig-url-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && state.limits.canRequest && !state.isLoading) submitRequest(); });
        document.getElementById('ig-submit-btn')?.addEventListener('click', submitRequest);
    };

    const init = async (container) => {
        state.history = loadHistory(); state.url = ''; state.contentType = 'any'; state.error = null; state.isLoading = false; state.activePolls = {};
        state.history.forEach(item => { if (item.status === 'processing') startPolling(item.id); });
        calculateLimits(); render();
        EventBus.emit('tool:mounted', { toolId: 'instagram-downloader' });
    };

    const destroy = () => {
        if (state.cooldownTimer) { clearInterval(state.cooldownTimer); state.cooldownTimer = null; }
        Object.values(state.activePolls).forEach(id => clearInterval(id));
        state.activePolls = {};
        EventBus.emit('tool:destroyed', { toolId: 'instagram-downloader' });
    };

    return { init, destroy };
})();

window.InstagramDownloaderPlugin = InstagramDownloaderPlugin;
Object.freeze(InstagramDownloaderPlugin);
