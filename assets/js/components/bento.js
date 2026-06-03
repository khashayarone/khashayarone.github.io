/**
 * Bento Grid 2.0 Component (Upgrade 04, 06, 08, 10)
 * سیستم چیدمان نامتقارن ابزارها + سیستم وضعیت‌ها + آیکون‌های اختصاصی SVG + لایو گراف کانواس
 */

import { DataLoader } from '../data-loader.js';

export const Bento = {
    // آیکون‌های لاین مپ خطی و پریمیوم (Minimal Outline SVGs)
    icons: {
        proxy: `<svg class="w-6 h-6 text-[#ff8a1f]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-.11-7.843-.418m15.686 0a8.959 8.959 0 015.814 8.418M4.157 10.082a8.959 8.959 0 00-5.814 8.418m17.442 0a11.953 11.953 0 01-11.643 3c-4.229 0-8.042-2.183-10.285-5.5a11.95 11.95 0 0110.285-3.5z"/></svg>`,
        telegram: `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>`,
        analytics: `<svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`,
        ai: `<svg class="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18.25 5.25L17.5 9l-.75-3.75L13 4.5l3.75-.75L17.5 1l.75 3.75L22 4.5l-3.75.75z"/></svg>`
    },

    renderSkeleton() {
        return `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-[24px]">
            <div class="md:col-span-7 h-[280px] bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] skeleton"></div>
            <div class="md:col-span-5 h-[280px] bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] skeleton"></div>
            <div class="md:col-span-6 h-[220px] bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] skeleton"></div>
            <div class="md:col-span-6 h-[220px] bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] skeleton"></div>
        </div>
        `;
    },

    renderData(tools, roadmap) {
        if (!tools) return `<div class="text-red-400">Error rendering Command Tools.</div>`;

        // پیدا کردن آبجکت ابزارها بر اساس ایدی برای تزریق در جایگاه گرید دشبورد
        const proxyTool = tools.find(t => t.id === 'proxy-intelligence') || {};
        const tgTool = tools.find(t => t.id === 'telegram-downloader') || {};
        const analyticsTool = tools.find(t => t.id === 'analytics') || {};
        const aiTool = tools.find(t => t.id === 'ai-utilities') || {};

        return `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-[24px]">
            
            <div class="md:col-span-7 tool-card glow-orange rounded-[28px] p-[32px] flex flex-col justify-between min-h-[300px] relative overflow-hidden">
                <canvas id="proxy-activity-canvas" class="absolute inset-0 z-0 pointer-events-none opacity-40"></canvas>
                
                <div class="flex flex-col gap-[12px] text-right relative z-10">
                    <div class="flex justify-between items-start">
                        <span class="text-[#ff8a1f] text-[12px] font-bold tracking-wide uppercase font-mono">Card A // Core Engine</span>
                        <div class="p-2 bg-[#080808]/60 border border-[#151517] rounded-[12px]">${this.icons.proxy}</div>
                    </div>
                    <h3 class="text-white text-[22px] font-extrabold">${proxyTool.name}</h3>
                    <p class="text-[#7d8290] text-[14px] leading-relaxed max-w-[420px]">${proxyTool.description}</p>
                </div>

                <div class="mt-[24px] grid grid-cols-3 gap-4 border-t border-[#151517]/80 pt-4 relative z-10 font-mono">
                    <div>
                        <div class="text-[10px] text-[#7d8290] uppercase">Sync Status</div>
                        <div class="text-emerald-400 text-[13px] font-bold flex items-center gap-1.5 mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Synchronized
                        </div>
                    </div>
                    <div>
                        <div class="text-[10px] text-[#7d8290] uppercase">Active Nodes</div>
                        <div class="text-white text-[13px] font-bold mt-0.5">84 / 142</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-[#7d8290] uppercase">Traffic Rate</div>
                        <div class="text-white text-[13px] font-bold mt-0.5">1.2 GB/s</div>
                    </div>
                </div>
            </div>

            <div class="md:col-span-5 tool-card glow-blue rounded-[28px] p-[32px] flex flex-col justify-between min-h-[300px]">
                <div class="flex flex-col gap-[12px] text-right">
                    <div class="flex justify-between items-start">
                        <span class="text-blue-400 text-[12px] font-bold tracking-wide uppercase font-mono">Card B // Extractor</span>
                        <div class="p-2 bg-[#080808]/60 border border-[#151517] rounded-[12px]">${this.icons.telegram}</div>
                    </div>
                    <h3 class="text-white text-[22px] font-extrabold">${tgTool.name}</h3>
                    <p class="text-[#7d8290] text-[14px] leading-relaxed">${tgTool.description}</p>
                </div>
                
                <div class="bg-[#080808] border border-[#151517] p-3 rounded-[16px] mt-4 font-mono">
                    <div class="flex justify-between text-[11px] mb-1.5">
                        <span class="text-[#7d8290]">Worker #4</span>
                        <span class="text-blue-400">67% Stream</span>
                    </div>
                    <div class="h-1 w-full bg-[#151517] rounded-full overflow-hidden">
                        <div class="w-2/3 h-full bg-blue-500 rounded-full"></div>
                    </div>
                </div>
            </div>

            <div class="md:col-span-6 tool-card glow-purple rounded-[28px] p-[32px] flex flex-col justify-between min-h-[220px]">
                <div class="flex flex-col gap-[12px] text-right">
                    <div class="flex justify-between items-start">
                        <span class="text-purple-400 text-[12px] font-bold tracking-wide uppercase font-mono">Card C // Telemetry</span>
                        <div class="p-2 bg-[#080808]/60 border border-[#151517] rounded-[12px]">${this.icons.analytics}</div>
                    </div>
                    <h3 class="text-white text-[20px] font-bold">${analyticsTool.name}</h3>
                    <p class="text-[#7d8290] text-[14px] leading-relaxed">${analyticsTool.description}</p>
                </div>
            </div>

            <div class="md:col-span-6 tool-card glow-teal rounded-[28px] p-[32px] flex flex-col justify-between min-h-[220px]">
                <div class="flex flex-col gap-[12px] text-right">
                    <div class="flex justify-between items-start">
                        <span class="text-teal-400 text-[12px] font-bold tracking-wide uppercase font-mono">Card D // Automation</span>
                        <div class="p-2 bg-[#080808]/60 border border-[#151517] rounded-[12px]">${this.icons.ai}</div>
                    </div>
                    <h3 class="text-white text-[20px] font-bold">${aiTool.name}</h3>
                    <p class="text-[#7d8290] text-[14px] leading-relaxed">${aiTool.description}</p>
                </div>
            </div>

            <div class="md:col-span-12 bg-[#0f0f10] border border-[#151517] rounded-[28px] p-[32px] text-right">
                <div class="mb-[24px]">
                    <span class="text-[#7d8290] text-[11px] font-bold tracking-wide uppercase font-mono">Card E // System Horizon Roadmap</span>
                    <h3 class="text-white text-[20px] font-extrabold mt-1">ابزارهای در حال توسعه و نقشه راه هسته پلتفرم</h3>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
                    ${roadmap ? roadmap.map(item => {
                        let statusColor = "text-[#7d8290] bg-[#151517]";
                        if (item.status === 'in-progress') statusColor = "text-[#ff8a1f] bg-[#ff8a1f]/10 border border-[#ff8a1f]/20";
                        if (item.status === 'planned') statusColor = "text-blue-400 bg-blue-500/10 border border-blue-500/20";
                        
                        return `
                        <div class="p-[16px] bg-[#080808] border border-neutral-900 rounded-[16px] flex items-center justify-between group hover:border-neutral-800 transition-colors duration-300">
                            <span class="text-white text-[14px] font-medium">${item.name}</span>
                            <span class="text-[10px] font-mono uppercase px-2.5 py-1 rounded-[8px] font-semibold tracking-wider ${statusColor}">
                                ${item.status.replace('-', ' ')}
                            </span>
                        </div>
                        `;
                    }).join('') : ''}
                </div>
            </div>

        </div>
        `;
    },

    // موتور اختصاصی رندر انیمیشن زنده فعالیت روی آبجکت کانواس کارت پروکسی با فرکانس 60FPS
    initGraph() {
        const canvas = document.getElementById('proxy-activity-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let animationFrameId;
        let offset = 0;

        const resizeCanvas = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resizeCanvas();
        // گوش دادن به ریسایز شدن صفحه برای فیت نگه داشتن ابعاد کانواس
        window.addEventListener('resize', resizeCanvas, { passive: true });

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.beginPath();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 138, 31, 0.25)'; // رنگ نارنجی برند با اوپاسیتی کنترل شده
            
            const amplitude = 25; // ارتفاع موج‌ها
            const frequency = 0.012; // فرکانس تناوب موج
            const yCenter = canvas.height * 0.65; // موقعیت قرارگیری خط عمودی

            // رسم خط نوسانی فعالیت زنده سیستم
            for (let x = 0; x < canvas.width; x++) {
                // ترکیب دو موج سینوسی مختلف برای شبیه‌سازی دقیق و طبیعی نوسان داتا نتورک
                const y = yCenter + 
                          Math.sin(x * frequency + offset) * amplitude + 
                          Math.cos(x * (frequency * 0.5) - offset * 0.7) * (amplitude * 0.3);
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // شتاب دادن افقی متغیر آفست موج به جلو در هر فریم رندر
            offset += 0.025;
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        // ذخیره شناسه انیمیشن روی آبجکت جهت جلوگیری از Memory Leak در توسعه‌های بعدی
        canvas._animationId = animationFrameId;
    },

    async init() {
        const root = document.getElementById('bento-root');
        if (!root) return;

        // ۱. تزریق ساختار لودینگ اسکلتون بنتو گرید
        root.innerHTML = this.renderSkeleton();

        // ۲. واکشی همزمان اطلاعات پلتفرم از فایل های JSON
        const [tools, roadmap] = await Promise.all([
            DataLoader.getTools(),
            DataLoader.getRoadmap()
        ]);

        // ۳. کامپایل و رندر اطلاعات نهایی درون دام
        root.innerHTML = this.renderData(tools, roadmap);

        // ۴. راه‌اندازی و تزریق موتور گرافیکی زنده کانواس روی المان‌ها
        this.initGraph();
    }
};
