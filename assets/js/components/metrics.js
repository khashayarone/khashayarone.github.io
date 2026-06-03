/**
 * Metrics Component (Upgrade 01 / Bento 2.0 Card C)
 * نمایش کارت‌های متریک و آماری بالای صفحه به صورت کاملاً Data-Driven
 */

import { DataLoader } from '../data-loader.js';

export const Metrics = {
    renderSkeleton() {
        let skeletonHtml = '';
        // ساخت ۴ کارت اسکلتون برای حالت لودینگ اولیه
        for (let i = 0; i < 4; i++) {
            skeletonHtml += `
            <div class="bg-[#0f0f10] border border-[#151517] p-[24px] rounded-[20px] flex flex-col gap-[12px] text-right">
                <div class="w-16 h-3 skeleton rounded"></div>
                <div class="w-24 h-8 skeleton rounded mt-1"></div>
            </div>
            `;
        }
        return `<div class="grid grid-cols-2 md:grid-cols-4 gap-[16px]">${skeletonHtml}</div>`;
    },

    renderData(stats) {
        if (!stats) {
            return `
            <div class="w-full p-[24px] bg-red-950/10 border border-red-900/40 rounded-[20px] text-right text-red-400 text-[14px]">
                خطا در دریافت اطلاعات آماری داشبورد مرکز فرماندهی. لطفاً اتصال شبکه را بررسی کنید.
            </div>
            `;
        }

        const isOnline = stats.status === 'online';
        const statusText = isOnline ? 'Active' : 'Offline';
        const statusClass = isOnline ? 'text-emerald-500' : 'text-amber-500';

        return `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
            <div class="bg-[#0f0f10] border border-[#151517] p-[24px] rounded-[20px] flex flex-col gap-[8px] text-right group transition-colors duration-300 hover:border-neutral-800">
                <span class="text-[#7d8290] text-[12px] font-medium uppercase tracking-wider">Tools</span>
                <span class="text-white text-[32px] sm:text-[40px] font-bold leading-none tracking-tight font-mono">${stats.tools}</span>
            </div>
            
            <div class="bg-[#0f0f10] border border-[#151517] p-[24px] rounded-[20px] flex flex-col gap-[8px] text-right group transition-colors duration-300 hover:border-neutral-800">
                <span class="text-[#7d8290] text-[12px] font-medium uppercase tracking-wider">Sources</span>
                <span class="text-white text-[32px] sm:text-[40px] font-bold leading-none tracking-tight font-mono">${stats.sources}</span>
            </div>
            
            <div class="bg-[#0f0f10] border border-[#151517] p-[24px] rounded-[20px] flex flex-col gap-[8px] text-right group transition-colors duration-300 hover:border-neutral-800">
                <span class="text-[#7d8290] text-[12px] font-medium uppercase tracking-wider">Configs</span>
                <span class="text-white text-[32px] sm:text-[40px] font-bold leading-none tracking-tight font-mono">${Number(stats.configs).toLocaleString()}</span>
            </div>
            
            <div class="bg-[#0f0f10] border border-[#151517] p-[24px] rounded-[20px] flex flex-col gap-[8px] text-right group transition-colors duration-300 hover:border-neutral-800">
                <span class="text-[#7d8290] text-[12px] font-medium uppercase tracking-wider">Status</span>
                <div class="${statusClass} text-[32px] sm:text-[40px] font-bold leading-none tracking-tight flex items-center gap-3">
                    <span class="font-mono">${statusText}</span>
                    ${isOnline ? '<span class="w-3 h-3 rounded-full bg-emerald-500 inline-block animate-pulse-soft"></span>' : ''}
                </div>
            </div>
        </div>
        `;
    },

    async init() {
        const root = document.getElementById('metrics-root');
        if (!root) return;

        // ۱. رندر اسکلتون متحرک برای حالت انتظار لود
        root.innerHTML = this.renderSkeleton();

        // ۲. واکشی اطلاعات واقعی از دیتالودر مرکز داده
        const stats = await DataLoader.getStats();

        // ۳. لود داده‌های زنده نهایی درون المان روت داشبورد
        root.innerHTML = this.renderData(stats);
    }
};
