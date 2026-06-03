/**
 * Application Main Entry Point (home.js)
 * مدیریت لود و ارکستراسیون کامپوننت‌های فرانت‌اند
 */

import { AuroraEngine } from './aurora-engine.js';
import { Navbar } from './components/navbar.js';
import { Ribbon } from './components/ribbon.js';
import { Metrics } from './components/metrics.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚡ KHASHAYAR.ONE Core Engine V2 Initializing...');

    // ۱. راه‌اندازی موتور بک‌گراند واکنش‌گرا به حرکت موس (مستقل از کدهای لودینگ دیتابیس)
    AuroraEngine.init();

    // ۲. راه‌اندازی بخش‌های ثابت سربرگ (Header Fixed Parts)
    Navbar.init();
    Ribbon.init();

    // ۳. راه‌اندازی بخش شاخص‌های آماری و داشبورد متریک
    Metrics.init();

    // کامپوننت‌های بعدی (بنتو گرید، تایم‌لاین رویدادها، کامند پلت) در گام‌های بعد متصل می‌شوند.
    
    console.log('✅ Core Layout Components & Aurora V2 Loaded Successfully.');
});
