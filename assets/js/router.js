/**
 * Vanilla JS Single Page Application Router Engine
 * مدیریت سوییچ آنی صفحات، بهینه‌سازی پرفورمنس و جلوگیری از انباشت حافظه (Memory Leaks)
 */

export const Router = {
    routes: {},
    currentRoute: null,

    register(route, viewInitializer) {
        this.routes[route] = viewInitializer;
    },

    init() {
        // مانیتور کردن تغییرات در هش آدرس مرورگر
        window.addEventListener('hashchange', () => this.handleRoute());
        // اجرای روت در اولین بارگذاری صفحه
        this.handleRoute();
    },

    async handleRoute() {
        // نرمالایز کردن هش آدرس (به طور پیش‌فرض مسیر خانه /)
        let hash = window.location.hash || '#/';
        
        // حذف کاراکتر # برای استخراج روت خالص
        let path = hash.replace('#', '');
        if (!path.startsWith('/')) path = '/' + path;

        // پاکسازی رندرهای قبلی و انیمیشن‌های در حال اجرا (مثل کانواس بنتو) جهت آزادسازی رم
        this.cleanupCurrentView();

        const viewInitializer = this.routes[path];
        const appRoot = document.getElementById('app-root');

        if (viewInitializer && appRoot) {
            this.currentRoute = path;
            appRoot.style.opacity = '0'; // انیمیشن فید-اوت نرم لایه تغییر صفحه
            
            setTimeout(async () => {
                // صدا زدن کامپوننت صفحه مقصد برای رندر ساختار جدید
                await viewInitializer(appRoot);
                appRoot.style.opacity = '1'; // انیمیشن فید-این لایه جدید
                window.scrollTo({ top: 0, behavior: 'instant' });
            }, 150);

        } else {
            console.warn(`| Router Alert | Target Route [${path}] is not registered. Redirecting to Core Home...`);
            window.location.hash = '#/';
        }
    },

    cleanupCurrentView() {
        // بررسی و توقف حلقه‌های انیمیشن کانواس فعال در پس‌زمینه صفحات قبل
        const activeCanvas = document.getElementById('proxy-activity-canvas');
        if (activeCanvas && activeCanvas._animationId) {
            cancelAnimationFrame(activeCanvas._animationId);
            console.log('⚡ [Memory Guard] Active Canvas Animation Loop Cleared.');
        }
    }
};
