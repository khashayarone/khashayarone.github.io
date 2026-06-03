/**
 * Activity Timeline Component (Upgrade 05 & 09)
 * تبدیل فید زنده سیستم به یک تایم‌لاین عمودی فنی و مدرن با تفکیک آیکون و رنگ رویدادها
 */

import { DataLoader } from '../data-loader.js';

export const Timeline = {
    // ماتریس آیکون‌های لاین مپ بر اساس نوع رویداد (Consistent Stroke Width 1.5)
    icons: {
        sync: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>`,
        update: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-10.5 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l-3 3m3-3l3 3"/></svg>`,
        success: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        warning: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`,
        error: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    },

    // ماتریس رنگ‌بندی مرزها و متن‌ها بر اساس نقش فنی رویداد
    colors: {
        sync: { border: "border-[#ff8a1f]/30", text: "text-[#ff8a1f]", bg: "bg-[#ff8a1f]/10" },
        update: { border: "border-blue-500/30", text: "text-blue-400", bg: "bg-blue-500/10" },
        success: { border: "border-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500/10" },
        warning: { border: "border-amber-500/30", text: "text-amber-400", bg: "bg-amber-500/10" },
        error: { border: "border-red-500/30", text: "text-red-400", bg: "bg-red-500/10" }
    },

    renderSkeleton() {
        let skeletonRows = '';
        for (let i = 0; i < 3; i++) {
            skeletonRows += `
            <div class="relative pr-[40px] mb-6">
                <div class="absolute right-[5px] top-1.5 w-3 h-3 bg-[#151517] rounded-full skeleton"></div>
                <div class="w-32 h-3 skeleton rounded mb-2"></div>
                <div class="w-48 h-4 skeleton rounded"></div>
            </div>
            `;
        }
        return `
        <div class="bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] text-right">
            <div class="w-36 h-5 skeleton rounded mb-6"></div>
            <div class="relative border-r border-[#151517] pr-2">${skeletonRows}</div>
        </div>
        `;
    },

    renderData(feed) {
        if (!feed || feed.length === 0) {
            return `
            <div class="bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] text-right text-[#7d8290] text-[14px]">
                هیچ سیگنال یا فید فعالی در مرکز پردازش داده دریافت نشده است.
            </div>
            `;
        }

        return `
        <div class="bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] text-right relative overflow-hidden">
            
            <div class="mb-[32px] flex justify-between items-center">
                <div>
                    <span class="text-[#7d8290] text-[11px] font-bold tracking-wide uppercase font-mono">Card D // Live Activity Telemetry</span>
                    <h3 class="text-white text-[20px] font-extrabold mt-1">فید زنده عملیات هسته پلتفرم</h3>
                </div>
                <div class="text-[11px] font-mono bg-[#151517] text-[#b9bcc7] px-3 py-1 rounded-[8px] flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Stream Engine Live
                </div>
            </div>

            <div class="relative pr-[12px]">
                
                <div class="absolute right-[23px] top-[8px] bottom-[28px] w-[1px] bg-[#151517]"></div>

                ${feed.map((item, index) => {
                    const config = this.colors[item.type] || this.colors.sync;
                    const iconSvg = this.icons[item.type] || this.icons.sync;
                    
                    return `
                    <div class="relative pr-[44px] pb-[28px] last:pb-0 flex flex-col gap-1 group">
                        
                        <div class="absolute right-[12px] top-[2px] w-6 h-6 rounded-full bg-[#0f0f10] border ${config.border} flex items-center justify-center ${config.text} z-10 transition-colors duration-300 group-hover:bg-[#151517]">
                            ${iconSvg}
                        </div>

                        <span class="text-[11px] font-mono text-[#7d8290] tracking-wider">${item.time}</span>
                        
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mt-0.5">
                            <span class="text-white text-[14px] font-semibold tracking-wide">${item.title}</span>
                            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[6px] w-max font-bold ${config.text} ${config.bg}">
                                ${item.type}
                            </span>
                        </div>
                    </div>
                    `;
                }).join('')}
                
            </div>
        </div>
        `;
    },

    async init() {
        const root = document.getElementById('timeline-root');
        if (!root) return;

        // ۱. تزریق ساختار لودینگ اسکلتون عمودی
        root.innerHTML = this.renderSkeleton();

        // ۲. واکشی اطلاعات آرایه زنده از فایل feed.json
        const feed = await DataLoader.getFeed();

        // ۳. لود رویدادهای رندر شده داینامیک درون المان روت لایوت
        root.innerHTML = this.renderData(feed);
    }
};
