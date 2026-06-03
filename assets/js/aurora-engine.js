/**
 * Aurora Engine V2 (Upgrade 07)
 * سیستم ایجاد نورهای نرم پس‌زمینه با قابلیت واکنش فوق‌العاده نرم به حرکت موس
 * عملکرد بحرانی: ۶۰ فریم بر ثانیه بدون جابجایی لایوت (No Layout Shift)
 */

export const AuroraEngine = {
    // متغیرهای داخلی برای نگه‌داری موقعیت موس و موقعیت فعلی لایه‌ها
    mouse: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    maxOffset: 20, // حداکثر میزان جابجایی مجاز طبق اسپک (20px)
    ease: 0.05,    // ضریب نرمی حرکت (Interpolation)

    render() {
        return `
            <div id="aurora-tr" class="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] pointer-events-none transition-opacity duration-1000 will-change-transform"
                 style="background: radial-gradient(circle, rgba(255,138,31,0.04) 0%, transparent 70%);"></div>
            
            <div id="aurora-lc" class="absolute top-[45%] right-[-5%] w-[45vw] h-[45vw] pointer-events-none transition-opacity duration-1000 will-change-transform"
                 style="background: radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%);"></div>
            
            <div id="aurora-br" class="absolute bottom-[-5%] left-[-5%] w-[40vw] h-[40vw] pointer-events-none transition-opacity duration-1000 will-change-transform"
                 style="background: radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%);"></div>
        `;
    },

    init() {
        const root = document.getElementById('aurora-root');
        if (!root) return;

        root.innerHTML = this.render();
        
        this.layers = {
            tr: document.getElementById('aurora-tr'),
            lc: document.getElementById('aurora-lc'),
            br: document.getElementById('aurora-br')
        };

        this.bindEvents();
        this.tick(); // شروع حلقه انیمیشن
    },

    bindEvents() {
        window.addEventListener('mousemove', (e) => {
            // محاسبه موقعیت موس به صورت نرمالایز شده بین -1 و 1
            const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
            const ndcY = (e.clientY / window.innerHeight) * 2 - 1;

            // تعیین هدف نهایی برای اعمال آفست
            this.target.x = ndcX * this.maxOffset;
            this.target.y = ndcY * this.maxOffset;
        }, { passive: true });
    },

    tick() {
        // اعمال محاسبات نرم‌کننده (Linear Interpolation) برای حرکت روان
        this.mouse.x += (this.target.x - this.mouse.x) * this.ease;
        this.mouse.y += (this.target.y - this.mouse.y) * this.ease;

        // تغییر موقعیت لایه‌ها با استفاده از translate3d جهت فعال‌سازی شتاب‌دهنده گرافیکی کارت گرافیک
        if (this.layers.tr && this.layers.lc && this.layers.br) {
            // جهت جابجایی لایه‌ها با هم متفاوت اعمال شده تا حس عمق چند لایه (Parallax ملایم) القا شود
            this.layers.tr.style.transform = `translate3d(${-this.mouse.x}px, ${-this.mouse.y}px, 0)`;
            this.layers.lc.style.transform = `translate3d(${this.mouse.x * 0.8}px, ${this.mouse.y * 1.2}px, 0)`;
            this.layers.br.style.transform = `translate3d(${-this.mouse.x * 1.5}px, ${this.mouse.y * 0.5}px, 0)`;
        }

        // درخواست فریم بعدی برای اجرای در فرکانس 60Hz/120Hz نمایشگر
        requestAnimationFrame(() => this.tick());
    }
};
