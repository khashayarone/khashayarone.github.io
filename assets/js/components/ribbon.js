/**
 * Ribbon Component (Production V1 Update)
 * نوار وضعیت فنی متحرک بالای پلتفرم - متصل به لایه داده تلمتری سیستم
 */

import { DataLoader } from '../data-loader.js';

export const Ribbon = {
    async init() {
        const root = document.getElementById('ribbon-root');
        if (!root) return;

        // واکشی دیتای تلمتری واقعی سیستم به جای متد قدیمی دمو
        const systemStats = await DataLoader.getSystemStats();
        
        // در صورت عدم دسترسی به لایه داده، یک نوار پیش‌فرض عملیاتی نمایش داده می‌شود تا ساختار نشکند
        const configsCount = systemStats ? Number(systemStats.configs || 0).toLocaleString() : '0';
        const sourcesCount = systemStats ? systemStats.sources || 0 : '0';
        const lastSync = systemStats ? systemStats.last_update || 'PENDING' : 'CONNECTING...';

        root.innerHTML = `
        <div class="w-full bg-[#080808] border-b border-[#151517] h-[36px] flex items-center overflow-hidden relative z-50">
            <div class="w-full flex justify-between items-center px-4 sm:px-6 lg:px-8 font-mono text-[10px] text-[#7d8290] tracking-wider select-none">
                
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span class="text-white font-bold">CORE SYSTEM: ONLINE</span>
                    </div>
                    <span class="hidden sm:inline">// TOTAL CONFIGS EVALUATED: <span class="text-white font-bold">${configsCount}</span></span>
                    <span class="hidden md:inline">// MONITORED NODES: <span class="text-white font-bold">${sourcesCount} CHANNELS</span></span>
                </div>

                <div class="flex items-center gap-2" dir="ltr">
                    <span>LAST TELEMETRY SNAPSHOT:</span>
                    <span class="text-white bg-[#151517] px-2 py-0.5 rounded-[4px] font-bold">${lastSync}</span>
                </div>

            </div>
        </div>
        `;
    }
};
