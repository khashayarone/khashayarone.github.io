/**
 * Navbar Component
 * ناوبری دسکتاپ + منوی بتم‌شیت موبایل + انیمیشن اسکرول شیشه‌ای
 */

export const Navbar = {
    render() {
        return `
        <nav id="nav-container" class="h-[64px] transition-all duration-300 bg-transparent flex items-center px-[24px] lg:px-[48px]">
            <div class="container-custom flex items-center justify-between">
                
                <div class="text-white font-bold tracking-wider text-[18px] cursor-pointer hover:opacity-80 transition-opacity">
                    KHASHAYAR.ONE
                </div>
                
                <div class="hidden md:flex items-center gap-[32px] text-[14px]">
                    <a href="#tools" class="text-[#b9bcc7] hover:text-white transition-colors duration-200 font-medium">Tools</a>
                    <a href="#updates" class="text-[#b9bcc7] hover:text-white transition-colors duration-200 font-medium">Updates</a>
                    <a href="https://github.com" target="_blank" class="text-[#b9bcc7] hover:text-white transition-colors duration-200 font-medium">GitHub</a>
                    <a href="#settings" class="text-[#b9bcc7] hover:text-white transition-colors duration-200 font-medium">Settings</a>
                </div>

                <button id="menu-toggle" class="md:hidden flex flex-col gap-1.5 justify-center items-center w-8 h-8 text-white focus:outline-none" aria-label="منو">
                    <span class="w-6 h-0.5 bg-white transition-all duration-200 rounded-full"></span>
                    <span class="w-6 h-0.5 bg-white transition-all duration-200 rounded-full"></span>
                </button>
            </div>
        </nav>

        <div id="mobile-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden opacity-0 transition-opacity duration-300"></div>
        <div id="mobile-sheet" class="fixed bottom-0 inset-x-0 z-50 p-[32px] md:hidden transform translate-y-full transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#0f0f10] border-t border-[#151517] rounded-t-[28px]">
            <div class="w-12 h-1 bg-[#151517] rounded-full mx-auto mb-[24px]"></div>
            <div class="flex flex-col gap-[20px] text-right text-[16px] font-medium">
                <a href="#tools" class="mobile-link text-[#b9bcc7] hover:text-white py-2 border-b border-[#151517]/50">Tools</a>
                <a href="#updates" class="mobile-link text-[#b9bcc7] hover:text-white py-2 border-b border-[#151517]/50">Updates</a>
                <a href="https://github.com" target="_blank" class="mobile-link text-[#b9bcc7] hover:text-white py-2 border-b border-[#151517]/50">GitHub</a>
                <a href="#settings" class="mobile-link text-[#b9bcc7] hover:text-white py-2">Settings</a>
            </div>
        </div>
        `;
    },

    init() {
        const root = document.getElementById('navbar-root');
        if (!root) return;
        
        root.innerHTML = this.render();
        this.bindEvents();
    },

    bindEvents() {
        const navContainer = document.getElementById('nav-container');
        const menuToggle = document.getElementById('menu-toggle');
        const mobileSheet = document.getElementById('mobile-sheet');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const mobileLinks = document.querySelectorAll('.mobile-link');

        // ۱. افکت Glassmorphic هوشمند مانیتورینگ اسکرول صفحه
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                navContainer.classList.add('glass-panel');
            } else {
                navContainer.classList.remove('glass-panel');
            }
        });

        // ۲. هندل کردن باز و بسته‌شدن بتم‌شیت موبایل
        function toggleMobileMenu() {
            const isOpen = mobileSheet.classList.contains('translate-y-0');
            if (isOpen) {
                mobileSheet.classList.remove('translate-y-0');
                mobileSheet.classList.add('translate-y-full');
                mobileOverlay.classList.remove('opacity-100');
                setTimeout(() => mobileOverlay.classList.add('hidden'), 300);
            } else {
                mobileOverlay.classList.remove('hidden');
                setTimeout(() => {
                    mobileSheet.classList.remove('translate-y-full');
                    mobileSheet.classList.add('translate-y-0');
                    mobileOverlay.classList.add('opacity-100');
                }, 10);
            }
        }

        if (menuToggle && mobileSheet && mobileOverlay) {
            menuToggle.addEventListener('click', toggleMobileMenu);
            mobileOverlay.addEventListener('click', toggleMobileMenu);
            mobileLinks.forEach(link => link.addEventListener('click', toggleMobileMenu));
        }
    }
};
