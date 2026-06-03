/**
 * Advanced Data Infrastructure Layer (Production V1)
 * مدیریت ارتباطات ناهمگام با انبارهای داده استاتیک و بدون دیتای دمو
 */

export const DataLoader = {
    cache: new Map(),

    async fetchFile(path) {
        if (this.cache.has(path)) return this.cache.get(path);
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP Error Code: ${response.status} on ${path}`);
            const data = await response.json();
            this.cache.set(path, data);
            return data;
        } catch (error) {
            console.error(`| Data Infra Alert | Failed to fetch target data file [${path}]:`, error);
            return null;
        }
    },

    // --- PROXY FINDER DATA SUBSYSTEM ---
    async getProxyRawData() { return await this.fetchFile('/data/proxy-finder/proxy.json'); },
    async getProxyStats() { return await this.fetchFile('/data/proxy-finder/stats.json'); },

    // --- SYSTEM CORE TELEMETRY SUBSYSTEM ---
    async getSystemStats() { return await this.fetchFile('/data/system/stats.json'); },
    async getSystemFeed() { return await this.fetchFile('/data/system/feed.json'); },
    async getSystemTelemetry() { return await this.fetchFile('/data/system/telemetry.json'); },
    async getSystemSources() { return await this.fetchFile('/data/system/sources.json'); },
    async getSystemProtocols() { return await this.fetchFile('/data/system/protocols.json'); },

    // --- SNAPSHOT USER ANALYTICS SUBSYSTEM ---
    async getAnalyticsVisits() { return await this.fetchFile('/data/analytics/visits.json'); },
    async getAnalyticsPopularity() { return await this.fetchFile('/data/analytics/popularity.json'); },
    async getAnalyticsEvents() { return await this.fetchFile('/data/analytics/events.json'); },

    // --- COMPONENT SYSTEM CONFIGS ---
    async getToolsRegistry() { return await this.fetchFile('/data/system/tools.json'); },
    
    // پاکسازی کش جهت پیاده‌سازی پولینگ لایو یا رفرش‌های دستی پلتفرم
    clearCache() { this.cache.clear(); }
};
