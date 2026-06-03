/**
 * Application Main Entry Point (home.js)
 * مدیریت لود و ارکستراسیون کامپوننت‌های فرانت‌اند
 */

import { Navbar } from './components/navbar.js';
import { Ribbon } from './components/ribbon.js';

// اضافه کردن کامپوننت‌های بعدی در گام‌های آینده در اینجا ایمپورت خواهند شد.

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚡ KHASHAYAR.ONE Core Engine V2 Initializing...');

    // ۱. راه‌اندازی بخش‌های ثابت سربرگ (Header Fixed Parts)
    Navbar.init();
    Ribbon.init();

    // ۲. کامپوننت‌های بعدی (داشبرد، بنتو گرید، تایم‌لاین و...) در گام‌های بعد فعال می‌شوند.
    
    console.log('✅ Core Layout Components Loaded Successfully.');
});
