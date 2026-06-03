/**
 * System Status Ribbon Component (Upgrade 02)
 * نمایش وضعیت آنلاین زنده کانفیگ‌ها و منابع داده با سیستم فچ داینامیک
 */

import { DataLoader } from '../data-loader.js';

export const Ribbon = {
    // رندر اولیه در حالت لودینگ (Skeleton Mode)
    renderSkeleton() {
        return `
        <div class="h-[36px] bg-[#0f0f10]/40 border-b border-[#151517] flex items-center px-[24px] lg:px-[48px]">
            <div class="container-custom flex items-center justify-between text-[11px]">
                <div class="w-24 h-3 skeleton rounded"></div>
                <div class="w-32 h-3 skeleton rounded hidden sm:block"></div>
            </div>
        </div>
        `;
    },

    // رندر نهایی پس از دریافت اطلاعات کامپوننت از سورس داده‌ها
    renderData(stats) {
        if (!stats) {
            return `
            <div class="h-[36px] bg-red-950/20 border-b border-red-900/50 flex items-center px-[24px] lg:px-[48px] text-[11px] text-red-400">
                <div class="container-custom flex items-center gap-2">
                    <span>●</span> Error loading system real-time core stats.
                </div>
            </div>
            `;
        }

        const isOnline = stats.status === 'online';
        const statusColor = isOnline ? 'text-emerald-500' : 'text-amber-500';
        const dotPulse = isOnline ? 'animate-pulse-soft bg-emerald-500' : 'bg-amber-500';

        return `
        <div class="h-[36px] bg-[#0f0f10]/60 backdrop-blur-md border-b border-[#151517] flex items-center px-[24px] lg:px-[48px]">
            <div class="container-custom flex items-center justify-between text-[11px] text-[#7d8290] font-mono">
                
                <div class="flex items-center gap-[16px]">
                    <div class="flex items-center gap-1.5 ${statusColor} font-medium">
                        <span class="w-1.5 h-1.5 rounded-full ${dotPulse}"></span>
                        <span>System ${stats.status.toUpperCase()}</span>
                    </div>
                    <div class="hidden xs:block text-[#151517]">|</div>
                    <div class="hidden xs:block text-[#b9bcc7]">
                        <span class="text-white font-bold">${stats.sources}</span> Sources
                    </div>
                    <div class="text-[#151517]">|</div>
                    <div class="text-[#b9bcc7]">
                        <span class="text-white font-bold">${Number(stats.configs).toLocaleString()}</span> Configs
                    </div>
                </div>

                <div class="text-right text-[#7d8290]">
                    Last Update: <span class="text-[#b9bcc7]">${stats.lastUpdate}</span>
                </div>
                
            </div>
        </div>
        `;
    },

    async init() {
        const root = document.getElementById('ribbon-root');
        if (!root) return;

        // گام اول: تزریق کدهای لودینگ اسکلتون
        root.innerHTML = this.renderSkeleton();

        // گام دوم: واکشی داده‌های زنده از ماژول دیتالودر
        const stats = await DataLoader.getStats();

        // گام سوم: رندر و جایگذاری دیتای نهایی زنده سیستم
        root.innerHTML = this.renderData(stats);
    }
};
