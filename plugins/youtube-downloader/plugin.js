/**
 * YouTube Downloader Plugin — Khashayar One
 * Downloads YouTube videos via GitHub Action workflow dispatch
 * Rate limited: 10 requests/hour, 5 min cooldown
 * Inline Bale connection prompt — no wizard, no page leave
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
    const DISPATCH_URL = 'https://khashayar.one/bale-bot/dispatch-workflow.php';

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
        activePolls: {},
        showConnectionPrompt: false,
        connectionCode: '',
        isPollingConnection: false,
        baleConnected: false
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

    const isBaleConnected = () => {
        return !!getBaleConnection();
    };

    const getBaleBotUsername = () => {
        try { return Bale.getBotUsername(); } catch (e) { return 'khashayarbot'; }
    };

    // ============================================
    // Connection Code Generation (Inline)
    // ============================================

    const generateConnectionCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    };

    const handleConnectClick = () => {
        // Generate code and save pending state
        const code = generateConnectionCode();
        state.connectionCode = code;
        state.showConnectionPrompt = true;
        state.isPollingConnection = true;

        // Save to localStorage
        try {
            localStorage.setItem('bale-connection', JSON.stringify({
                code: code,
                status: 'pending',
                chat_id: null,
                username: '',
                first_name: '',
                created_at: Date.now()
            }));
        } catch (e) { /* ignore */ }

        render();

        // Start polling for connection confirmation
        pollForConnection(code);
    };

    const pollForConnection = (code) => {
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes

        const poll = async () => {
            attempts++;

            if (attempts > maxAttempts || !state.isPollingConnection) {
                state.isPollingConnection = false;
                return;
            }

            try {
                const url = `https://fozogame.com/bale-bot/get-connection.php?code=${code}`;
                const response = await fetch(url, { cache: 'no-store' });

                if (response.ok) {
                    const data = await response.json();

                    if (data.status === 'connected') {
                        // Connection confirmed!
                        state.isPollingConnection = false;
                        state.baleConnected = true;

                        // Save connected state
                        try {
                            localStorage.setItem('bale-connection', JSON.stringify({
                                code: code,
                                status: 'connected',
                                chat_id: data.chat_id,
                                username: data.username || '',
                                first_name: data.first_name || '',
                                output_preference: data.output_preference || 'file',
                                connected_at: data.connected_at || new Date().toISOString()
                            }));
                        } catch (e) { /* ignore */ }

                        // Update UI badge
                        if (typeof UI !== 'undefined') {
                            UI.updateConnectionBadge('connected', 'متصل');
                        }

                        render();
                        return;
                    }
                }
            } catch (e) { /* continue polling */ }

            // Fast polling: every 1 second for first 10 seconds, then every 3 seconds
            const interval = attempts <= 10 ? 1000 : 3000;
            setTimeout(poll, interval);
        };

        poll();
    };

    // ============================================
    // Dispatch & Polling
    // ============================================

    const dispatchWorkflow = async (requestId, url, quality, audioOnly) => {
        const bale = getBaleConnection();
        
        // Send to CPanel dispatcher instead of GitHub API directly
        const body = {
            workflow_id: 'youtube-downloader.yml',
            inputs: {
                request_id: requestId,
                youtube_urls: url,
                quality: quality,
                audio_only: audioOnly ? 'true' : 'false',
                bale_code: bale ? bale.code : '',
                bale_chat_id: bale ? String(bale.chat_id) : ''
            }
        };

        try {
            const response = await fetch(DISPATCH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.ok === true) return true;
                console.error('Dispatch failed:', result);
                return false;
            }
            
            return false;
        } catch (e) {
            console.error('Dispatch error:', e.message);
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
        if (dispatched) {
            startPolling(requestId);
        } else {
            updateHistoryItem(requestId, { status: 'error', errorMessage: 'خطا در ارسال درخواست — لطفاً دوباره تلاش کنید' });
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

    const renderSubmitButton = () => {
        const isConnected = state.baleConnected || isBaleConnected();
        const canSubmit = state.limits.canRequest && !state.isLoading;

        if (isConnected) {
            // Connected — show normal download button
            return `
                <button class="yt-submit-btn" id="yt-submit-btn" ${!canSubmit ? 'disabled' : ''}>
                    ${state.isLoading ? '<div class="yt-history-spinner" style="width:20px;height:20px;border-color:rgba(255,255,255,0.2);border-top-color:white;"></div> در حال ارسال...' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> شروع دانلود'}
                </button>
                <div class="yt-connection-notice" style="font-size:var(--font-size-xs);color:var(--color-success);margin-top:var(--space-sm);display:flex;align-items:center;gap:4px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:var(--color-success);"></span>
                    فایل‌ها به ربات بله ارسال می‌شوند
                </div>
            `;
        }

        if (state.showConnectionPrompt && state.connectionCode) {
            // Show inline connection code
            const botUsername = getBaleBotUsername();
            return `
                <div class="yt-connection-prompt">
                    <div class="yt-connection-code-row">
                        <div class="yt-connection-code-box" id="yt-connection-code-box" title="کلیک کن تا کپی بشه">
                            <span class="yt-connection-code-text" id="yt-connection-code-text">${state.connectionCode}</span>
                        </div>
                        <button class="btn btn-primary" id="yt-copy-code-btn" style="white-space:nowrap;padding:var(--space-sm) var(--space-lg);">
                            <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                            </svg>
                            کپی
                        </button>
                    </div>
                    <a href="https://ble.ir/${botUsername}" target="_blank" rel="noopener" class="yt-connect-bot-btn" id="yt-go-to-bot-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.441-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.123.034.335.02.56z"/>
                        </svg>
                        رفتن به ربات @${botUsername}
                    </a>
                    ${state.isPollingConnection ? `
                        <div style="display:flex;align-items:center;gap:8px;font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-sm);">
                            <div class="yt-history-spinner"></div>
                            <span>منتظر تأیید اتصال...</span>
                        </div>
                    ` : ''}
                    <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-sm);">
                        📌 کد رو کپی کن، ربات رو استارت کن و کد رو بفرست. بعد از اتصال، دکمه دانلود فعال میشه.
                    </p>
                </div>
            `;
        }

        // Not connected — show connect button
        return `
            <button class="yt-submit-btn yt-submit-btn-disabled" id="yt-connect-btn" style="background:#f59e0b;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                🔴 نیاز به اتصال ربات
            </button>
            <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-sm);">
                برای دانلود، ابتدا باید به ربات بله متصل شوید. کلیک کنید تا کد اتصال دریافت کنید.
            </p>
        `;
    };

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
                ${renderSubmitButton()}
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
                        const isCompleted = item.status === 'completed';
                        const isError = item.status === 'error';
                        const hasParts = item.multipart && item.totalParts > 1 && item.parts;
                        return `
                            <div class="yt-history-item">
                                <div class="yt-history-icon ${isProcessing ? 'processing' : isCompleted ? 'completed' : 'error'}">
                                    ${isProcessing ? '<div class="yt-history-spinner"></div>' : isCompleted ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'}
                                </div>
                                <div class="yt-history-content">
                                    <span class="yt-history-item-title">${Utils.escapeHtml(item.title)}</span>
                                    <span class="yt-history-item-meta">${item.audioOnly ? '🎵 صوت' : '🎬 ' + item.quality} — ${isProcessing ? 'در حال پردازش...' : isCompleted ? (item.fileSize ? formatFileSize(item.fileSize) : 'تکمیل شد') : Utils.escapeHtml(item.errorMessage || 'خطا')}</span>
                                </div>
                                <span class="yt-history-time">${timeAgo}</span>
                                ${isError && item.errorMessage ? `<button class="yt-history-download-btn" style="background:#f87171;" onclick="this.nextElementSibling.style.display='block';this.nextElementSibling.nextElementSibling.style.display='flex';">علت خطا</button><div class="yt-error-popup-overlay" style="display:none;" onclick="this.style.display='none';this.nextElementSibling.style.display='none';"></div><div class="yt-error-popup" style="display:none;"><div class="yt-error-popup-title">❌ خطا در دانلود</div><div class="yt-error-popup-message">${Utils.escapeHtml(item.errorMessage)}</div><button class="yt-error-popup-close" onclick="this.parentElement.style.display='none';this.parentElement.previousElementSibling.style.display='none';">متوجه شدم</button></div>` : ''}
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
        // URL input
        document.getElementById('yt-url-input')?.addEventListener('input', Utils.debounce((e) => { state.url = e.target.value; state.error = null; }, 300));
        document.getElementById('yt-quality-select')?.addEventListener('change', (e) => { state.quality = e.target.value; });
        document.getElementById('yt-url-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && state.limits.canRequest && !state.isLoading) submitRequest(); });

        // Audio checkbox
        const audioCheck = document.getElementById('yt-audio-checkbox');
        const audioGroup = document.getElementById('yt-audio-only');
        if (audioCheck && audioGroup) {
            audioCheck.addEventListener('change', (e) => { state.audioOnly = e.target.checked; audioGroup.classList.toggle('checked', state.audioOnly); render(); });
            audioGroup.addEventListener('click', (e) => { if (e.target !== audioCheck) { audioCheck.checked = !audioCheck.checked; state.audioOnly = audioCheck.checked; audioGroup.classList.toggle('checked', state.audioOnly); render(); } });
        }

        // Submit button (for connected users)
        document.getElementById('yt-submit-btn')?.addEventListener('click', submitRequest);

        // Connect button (for unconnected users)
        document.getElementById('yt-connect-btn')?.addEventListener('click', handleConnectClick);

        // Copy code button
        const copyBtn = document.getElementById('yt-copy-code-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeText = document.getElementById('yt-connection-code-text');
                if (codeText) {
                    const code = codeText.textContent;
                    navigator.clipboard.writeText(code).then(() => {
                        copyBtn.innerHTML = '✅ کپی شد';
                        copyBtn.classList.add('btn-success');
                        setTimeout(() => {
                            copyBtn.innerHTML = '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> کپی';
                            copyBtn.classList.remove('btn-success');
                        }, 2000);
                    }).catch(() => { /* fallback */ });
                }
            });
        }

        // Code box click to copy
        const codeBox = document.getElementById('yt-connection-code-box');
        if (codeBox) {
            codeBox.addEventListener('click', () => {
                if (copyBtn) copyBtn.click();
            });
        }
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
        state.showConnectionPrompt = false;
        state.connectionCode = '';
        state.isPollingConnection = false;
        state.baleConnected = isBaleConnected();

        // Check if pending connection exists and resume polling
        const baleData = getBaleConnection();
        if (baleData && baleData.status === 'pending') {
            state.connectionCode = baleData.code;
            state.showConnectionPrompt = true;
            state.isPollingConnection = true;
            pollForConnection(baleData.code);
        }

        state.history.forEach(item => { if (item.status === 'processing') startPolling(item.id); });
        calculateLimits();
        render();
        EventBus.emit('tool:mounted', { toolId: 'youtube-downloader' });
    };

    const destroy = () => {
        if (state.cooldownTimer) { clearInterval(state.cooldownTimer); state.cooldownTimer = null; }
        Object.values(state.activePolls).forEach(id => clearInterval(id));
        state.activePolls = {};
        state.isPollingConnection = false;
        EventBus.emit('tool:destroyed', { toolId: 'youtube-downloader' });
    };

    return { init, destroy };
})();

window.YouTubeDownloaderPlugin = YouTubeDownloaderPlugin;
Object.freeze(YouTubeDownloaderPlugin);
