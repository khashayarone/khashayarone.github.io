/**
 * Dynamic Navbar Component (Production V1)
 * منوی ناوبری داینامیک پلتفرم - ۱۰۰٪ متصل به رجیستری ابزارها و هماهنگ با SPA Router
 */

import { DataLoader } from '../data-loader.js';

export const Navbar = {
    async init() {
        const root = document.getElementById('navbar-root');
        if (!root) return;

        // واکشی ابزارهای فعال سیستم از Single Source of Truth
        const tools = await DataLoader.getToolsRegistry() || [];

        // فیلتر کردن ابزارهای فعال برای نمایش در منو
        const activeTools = tools.filter(tool => tool.status === 'active');

        root.innerHTML = `
        <nav class="w-full bg-[#0f0f10]/80 backdrop-blur-md border-b border-[#151517] sticky top-[36px] z-40 transition-all duration-300">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
                
                <a href="#/" class="flex items-center gap-2.5 group">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#ff8a1f] to-[#ffb366] flex items-center justify-center shadow-lg shadow-[#ff8a1f]/10 group-hover:scale-105 transition-transform">
                        <span class="text-[#080808] font-black font-mono text-[14px]">K</span>
                    </div>
                    <span class="text-white font-mono font-black text-[15px] tracking-wider group-hover:text-[#ff8a1f] transition-colors">KHASHAYAR.ONE</span>
                </a>

                <div class="flex items-center gap-1 sm:gap-2" id="nav-links-container">
                    ${activeTools.map(tool => {
                        // استخراج نام انگلیسی برای شناسه یا آیکون‌سازی ساده
                        const isHome = tool.route === '/';
                        const displayName = isHome ? 'داشبورد' : tool.name.replace(' System', '');
                        
                        return `
                        <a href="#${tool.route}" 
                           class="nav-link-item text-[#7d8290] hover:text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-all duration-200 hover:bg-[#151517]/50"
                           data-route="${tool.route}">
                            ${displayName}
                        </a>
                        `;
                    }).join('')}
                </div>

                <div class="hidden sm:flex items-center gap-3">
                    <div class="text-[10px] font-mono text-[#7d8290] bg-[#080808] border border-[#151517] px-2.5 py-1 rounded-lg select-none">
                        Press <kbd class="text-white font-bold bg-[#151517] px-1 rounded">Ctrl + K</kbd>
                    </div>
                </div>

            </div>
        </nav>
        `;

        this.listenToRouteChanges();
    },

    listenToRouteChanges() {
        // متد هایلایت کردن لینک فعال بر اساس هش جاری مرورگر
        const updateActiveState = () => {
            let hash = window.location.hash || '#/';
            let currentPath = hash.replace('#', '');
            if (!currentPath.startsWith('/')) currentPath = '/' + currentPath;

            document.querySelectorAll('.nav-link-item').forEach(link => {
                const linkRoute = link.getAttribute('data-route');
                if (linkRoute === currentPath) {
                    link.classList.remove('text-[#7d8290]', 'hover:bg-[#151517]/50');
                    link.classList.add('text-[#ff8a1f]', 'bg-[#ff8a1f]/5', 'font-bold');
                } else {
                    link.classList.remove('text-[#ff8a1f]', 'bg-[#ff8a1f]/5', 'font-bold');
                    link.classList.add('text-[#7d8290]', 'hover:bg-[#151517]/50');
                }
            });
        };

        // مانیتور تغییرات هش برای اصلاح هایلایت‌ها
        window.addEventListener('hashchange', updateActiveState);
        updateActiveState();
    }
};
