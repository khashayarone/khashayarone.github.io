/**
 * Application Core Bootloader (home.js)
 * هماهنگ‌سازی معماری Production V1 و ثبت روت‌های ماژولار برنامه
 */

import { AuroraEngine } from './aurora-engine.js';
import { CommandPalette } from './command-palette.js';
import { Navbar } from './components/navbar.js';
import { Ribbon } from './components/ribbon.js';
import { Footer } from './components/footer.js';
import { Router } from './router.js';

// ایمپورت نماها (در گام‌های بعدی کدهای داخل این دو فایل را توسعه می‌دهیم)
// import { HomeView } from './views/home-view.js';
// import { ProxyView } from './views/proxy-view.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚡ KHASHAYAR.ONE Command Center — Production V1 Initializing...');

    // ۱. استارت لایه‌های زیرساختی و ثابت بستر فرانت‌پروژه
    AuroraEngine.init();
    CommandPalette.init();
    Navbar.init();
    Ribbon.init();
    Footer.init();

    // ۲. ثبت مسیرهای هدایت پلتفرم در لایه مسیریاب (SPA Engine Routing Matrix)
    Router.register('/', async (container) => {
        container.innerHTML = `<div class="text-neutral-500 font-mono text-[13px]">Loading Dashboard Core Module...</div>`;
        const { HomeView } = await import('./views/home-view.js');
        await HomeView.render(container);
    });

    Router.register('/proxy', async (container) => {
        container.innerHTML = `<div class="text-neutral-500 font-mono text-[13px]">Loading Proxy Intelligence System...</div>`;
        const { ProxyView } = await import('./views/proxy-view.js');
        await ProxyView.render(container);
    });

    Router.register('/settings', async (container) => {
        container.innerHTML = `
            <div class="bg-[#0f0f10] border border-[#151517] p-[32px] rounded-[28px] text-right font-mono">
                <h2 class="text-white text-[20px] font-bold mb-2">System Core Configuration</h2>
                <p class="text-[#7d8290] text-[14px]">تنظیمات هسته پلتفرم به صورت محلی در لایه LocalStorage در این بخش ذخیره خواهد شد.</p>
            </div>
        `;
    });

    // ۳. شتاب‌دهی و راه‌اندازی نهایی موتور آدرس‌دهی
    Router.init();

    console.log('✅ Underlaying Infrastructure Is Fully Operational.');
});
