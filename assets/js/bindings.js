/**
 * bindings.js — State-to-DOM Reactive Bindings
 * Connects AppState changes to UI updates
 * Part of Vanilla Micro-SPA Tool Platform — Phase 3 Data Layer
 */

const DOMBindings = (() => {
    'use strict';

    /**
     * Format milliseconds to human-readable duration
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted duration
     */
    const formatDuration = (ms) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    };

    /**
     * Format relative time
     * @param {number} timestamp - Timestamp in ms
     * @returns {string} Relative time string
     */
    const formatRelativeTime = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'لحظاتی پیش';
        if (minutes < 60) return `${minutes} دقیقه پیش`;
        if (hours < 24) return `${hours} ساعت پیش`;
        return `${days} روز پیش`;
    };

    /**
     * Update stat cards with real data
     */
    const updateStatCards = () => {
        const stats = ActionRegistry.getStats();
        
        // Active operations
        const activeEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
        if (activeEl) activeEl.textContent = stats.active.toLocaleString('fa-IR');

        // Successful operations
        const successEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
        if (successEl) successEl.textContent = stats.successful.toLocaleString('fa-IR');

        // Update success trend
        const successTrendEl = document.querySelector('.stat-card:nth-child(2) .stat-trend span');
        if (successTrendEl && stats.successful > 0) {
            successTrendEl.textContent = `${stats.successRate}٪`;
        }

        // Average duration
        const durationEl = document.querySelector('.stat-card:nth-child(3) .stat-value');
        if (durationEl) durationEl.textContent = formatDuration(stats.avgDuration);

        // Update duration trend
        const durationTrendEl = document.querySelector('.stat-card:nth-child(3) .stat-trend');
        if (durationTrendEl && stats.avgDuration < 3000) {
            durationTrendEl.className = 'stat-trend stat-trend-down';
            const icon = durationTrendEl.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', 'trending-down');
            const span = durationTrendEl.querySelector('span');
            if (span) span.textContent = 'بهینه';
        }

        // Health status
        const healthEl = document.querySelector('.stat-card:nth-child(4) .stat-value');
        if (healthEl) healthEl.textContent = `${stats.successRate}٪`;

        const healthLabelEl = document.querySelector('.stat-card:nth-child(4) .stat-label');
        const healthTrendEl = document.querySelector('.stat-card:nth-child(4) .stat-trend');
        const healthTrendSpan = healthTrendEl?.querySelector('span');

        if (healthLabelEl) {
            const statusMap = {
                'healthy': 'سلامت سیستم',
                'degraded': 'نیاز به بررسی',
                'critical': 'وضعیت بحرانی'
            };
            healthLabelEl.textContent = statusMap[stats.healthStatus] || 'سلامت سیستم';
        }

        if (healthTrendEl && healthTrendSpan) {
            if (stats.healthStatus === 'healthy') {
                healthTrendEl.className = 'stat-trend stat-trend-up';
                const icon = healthTrendEl.querySelector('i');
                if (icon) icon.setAttribute('data-lucide', 'trending-up');
                healthTrendSpan.textContent = 'پایدار';
            } else if (stats.healthStatus === 'degraded') {
                healthTrendEl.className = 'stat-trend stat-trend-stable';
                const icon = healthTrendEl.querySelector('i');
                if (icon) icon.setAttribute('data-lucide', 'minus');
                healthTrendSpan.textContent = 'متوسط';
            } else {
                healthTrendEl.className = 'stat-trend stat-trend-down';
                const icon = healthTrendEl.querySelector('i');
                if (icon) icon.setAttribute('data-lucide', 'trending-down');
                healthTrendSpan.textContent = 'هشدار';
            }
        }

        // Refresh Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    /**
     * Update activity list from history
     */
    const updateActivityList = () => {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        const history = ActionRegistry.getHistory(5);

        if (history.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item glass-base" style="justify-content: center; padding: var(--space-xl);">
                    <span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                        هنوز فعالیتی ثبت نشده است
                    </span>
                </div>
            `;
            return;
        }

        activityList.innerHTML = history.map(entry => {
            const statusIcon = entry.status === 'success' 
                ? `<div class="activity-icon activity-success"><i data-lucide="check" class="activity-check"></i></div>`
                : entry.status === 'error'
                ? `<div class="activity-icon activity-error"><i data-lucide="x" class="activity-check"></i></div>`
                : `<div class="activity-icon activity-running"><div class="activity-spinner"></div></div>`;

            const statusDesc = entry.status === 'success'
                ? `اجرا با موفقیت completed — ${formatDuration(entry.duration || 0)}`
                : entry.status === 'error'
                ? `خطا: ${entry.error || 'نامشخص'}`
                : `در حال اجرا — ${entry.progress || 0}%`;

            const relativeTime = formatRelativeTime(entry.startTime);

            return `
                <div class="activity-item glass-base">
                    ${statusIcon}
                    <div class="activity-content">
                        <span class="activity-title">${entry.title}</span>
                        <span class="activity-desc">${statusDesc}</span>
                    </div>
                    <span class="activity-time">${relativeTime}</span>
                </div>
            `;
        }).join('');

        // Refresh Lucide icons for new elements
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };

    /**
     * Update tool card stats with real data
     */
    const updateToolCardStats = () => {
        const cardStatsMap = {
            'ai-text-generator': { runs: '۲.۳k', time: '۲.۱s' },
            'image-optimizer': { runs: '۸۹۰', time: '۳.۲s' },
            'json-formatter': { runs: '۱.۵k', time: '۰.۸s' },
            'github-actions': { runs: '۴۵۶', active: '۳' }
        };

        // This will be enhanced in Phase 4 with real per-tool stats
        // For now, keeps existing static data but structure is ready for real data
    };

    /**
     * Update execution progress indicator
     */
    const updateExecutionProgress = () => {
        const execState = AppState.getState('execution');
        
        if (execState.isRunning && execState.progress > 0) {
            // Could show a global progress bar or indicator here
            // Placeholder for future enhancement
        }
    };

    /**
     * Initialize all DOM bindings
     */
    const init = () => {
        // Subscribe to state changes
        AppState.subscribe(({ path }) => {
            if (path.startsWith('execution')) {
                updateStatCards();
                updateActivityList();
                updateExecutionProgress();
            }
        });

        // Subscribe to history updates
        EventBus.on('history:updated', () => {
            updateActivityList();
            updateStatCards();
        });

        // Subscribe to action events
        EventBus.on(EventBus.Events.ACTION_COMPLETE, () => {
            updateActivityList();
            updateStatCards();
        });

        EventBus.on(EventBus.Events.ACTION_ERROR, () => {
            updateActivityList();
            updateStatCards();
        });

        // Initial render
        updateStatCards();
        updateActivityList();

        console.log('✅ DOM Bindings — Active');
    };

    // Public API
    return {
        init,
        updateStatCards,
        updateActivityList,
        updateToolCardStats,
        formatDuration,
        formatRelativeTime
    };
})();

Object.freeze(DOMBindings);
