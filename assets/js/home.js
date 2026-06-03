/**
 * Application Main Entry Point (home.js)
 * مدیریت لود، هماهنگ‌سازی و ارکستراسیون کامل معماری پلتفرم
 */

import { AuroraEngine } from './aurora-engine.js';
import { CommandPalette } from './command-palette.js'; // ایمپورت سیستم پلت فرمان هوشمند
import { Navbar } from './components/navbar.js';
import { Ribbon } from './components/ribbon.js';
import { Metrics } from './components/metrics.js';
import { Bento } from './components/bento.js';
import { Timeline } from './components/timeline.js';
import { Footer } from './components/footer.js'; // ایمپورت پاورقی پلتفرم

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚡ KHASHAYAR.ONE Core Engine V2 Initializing...');

    // ۱. راه‌اندازی موتور بک‌گراند واکنش‌گرا به حرکت موس
    AuroraEngine.init();

    // ۲. راه‌اندازی شورتکات‌ها و کش سیستم پلت فرمان (Command Palette)
    CommandPalette.init();

    // ۳. راه‌اندازی بخش‌های ثابت سربرگ سیستم (Header Navigation)
    Navbar.init();
    Ribbon.init();

    // ۴. راه‌اندازی بخش شاخص‌های آماری و ریاضی داشبورد متریک
    Metrics.init();

    // ۵. راه‌اندازی ساختار بنتو گرید ۲.۰ ابزارها و انیمیشن لایو کانواس
    Bento.init();

    // ۶. راه‌اندازی ریل تایم‌لاین رویدادهای زنده هسته پلتفرم
    Timeline.init();

    // ۷. راه‌اندازی پاورقی پایانی سیستم
    Footer.init();
    
    console.log('🏁 [10/10] KHASHAYAR.ONE Command Center V2 Deployment Complete.');
});
