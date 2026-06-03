/**
 * Application Main Entry Point (home.js)
 * مدیریت لود و ارکستراسیون کامپوننت‌های فرانت‌اند
 */

import { AuroraEngine } from './aurora-engine.js';
import { Navbar } from './components/navbar.js';
import { Ribbon } from './components/ribbon.js';
import { Metrics } from './components/metrics.js';
import { Bento } from './components/bento.js'; // لود ماژول جدید بنتو گرید ۲

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚡ KHASHAYAR.ONE Core Engine V2 Initializing...');

    // ۱. راه‌اندازی موتور بک‌گراند واکنش‌گرا به حرکت موس
    AuroraEngine.init();

    // ۲. راه‌اندازی بخش‌های ثابت سربرگ (Header)
    Navbar.init();
    Ribbon.init();

    // ۳. راه‌اندازی بخش شاخص‌های آماری داشبورد
    Metrics.init();

    // ۴. راه‌اندازی ساختار بنتو گرید ابزارها و کانواس اکتیویتی گراف
    Bento.init();

    // کامپوننت‌های نهایی (تایم‌لاین عمودی رویدادها، کامند پلت سیستم) در گام‌های بعد متصل می‌شوند.
    
    console.log('✅ Core Layout Components & Aurora V2 Loaded Successfully.');
});
