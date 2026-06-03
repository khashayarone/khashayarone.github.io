/**
 * Settings View Component (Production V1)
 * مدیریت تنظیمات فرانت‌پروژه، پاکسازی کش داخلی و متغیرهای محلی ذخیره‌سازی
 */

import { DataLoader } from '../data-loader.js';

export const SettingsView = {
    async render(container) {
        // خواندن ترجیحات جاری کاربر از حافظه محلی یا اعمال مقادیر پیش‌فرض پروداکشن
        const refreshInterval = localStorage.getItem('sys_refresh_interval') || '120';
        const defaultProtocol = localStorage.getItem('sys_default_protocol') || 'all';

        container.innerHTML = `
        <div class="max-w-3xl mx-auto bg-[#0f0f10] border border-[#151517] rounded-[28px] p-6 sm:p-10 text-right">
            
            <div class="border-b border-[#151517] pb-6 mb-8">
                <span class="text-[#ff8a1f] text-[11px] font-bold font-mono uppercase tracking-wider">Platform Core Preferences</span>
                <h2 class="text-white text-[22px] font-black mt-1">تنظیمات زیرساخت لوکال پلتفرم</h2>
                <p class="text-[#7d8290] text-[13px] mt-1.5 leading-relaxed">P2P Configuration Environment — پیکربندی رفتار فرانت‌پروژه و مدیریت کش کلاینت بر روی حافظه مرورگر شما.</p>
            </div>

            <div class="flex flex-col gap-6">
                
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 bg-[#080808] border border-[#151517] rounded-[20px]">
                    <div class="flex flex-col gap-1 max-w-[70%]">
                        <label class="text-white text-[14px] font-bold">بازه زمانی رفرش خودکار داده‌ها</label>
                        <span class="text-[#7d8290] text-[11px] leading-relaxed">تعیین زمانبندی همگام‌سازی ناهمگام لایه فرانت با فایل‌های خروجی گیت‌هاب جهت واکشی اطلاعات جدید کانفیگ‌ها.</span>
                    </div>
                    <select id="setting-polling" class="bg-[#0f0f10] border border-[#151517] text-[13px] text-white px-4 py-2.5 rounded-[12px] outline-none cursor-pointer focus:border-[#ff8a1f]/60 font-mono text-left" dir="ltr">
                        <option value="30" ${refreshInterval === '30' ? 'selected' : ''}>30 Seconds</option>
                        <option value="60" ${refreshInterval === '60' ? 'selected' : ''}>60 Seconds</option>
                        <option value="120" ${refreshInterval === '120' ? 'selected' : ''}>2 Minutes</option>
                        <option value="0" ${refreshInterval === '0' ? 'selected' : ''}>Manual Only</option>
                    </select>
                </div>

                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 bg-[#080808] border border-[#151517] rounded-[20px]">
                    <div class="flex flex-col gap-1 max-w-[70%]">
                        <label class="text-white text-[14px] font-bold">پروتکل پیش‌فرض هسته شبکه</label>
                        <span class="text-[#7d8290] text-[11px] leading-relaxed">تنظیم فیلتر اولیه موتور Proxy Intelligence در هنگام لود مستقیم یا باز شدن پلتفرم.</span>
                    </div>
                    <select id="setting-protocol" class="bg-[#0f0f10] border border-[#151517] text-[13px] text-white px-4 py-2.5 rounded-[12px] outline-none cursor-pointer focus:border-[#ff8a1f]/60 font-mono text-left" dir="ltr">
                        <option value="all" ${defaultProtocol === 'all' ? 'selected' : ''}>All Matrix Protocols</option>
                        <option value="vless" ${defaultProtocol === 'vless' ? 'selected' : ''}>VLESS Subsystem</option>
                        <option value="vmess" ${defaultProtocol === 'vmess' ? 'selected' : ''}>VMESS Nodes</option>
                        <option value="trojan" ${defaultProtocol === 'trojan' ? 'selected' : ''}>Trojan Protocol</option>
                    </select>
                </div>

                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 bg-[#080808] border border-[#151517] rounded-[20px]">
                    <div class="flex flex-col gap-1 max-w-[70%]">
                        <label class="text-white text-[14px] font-bold">حافظه کش موقت سیستم داده‌ها</label>
                        <span class="text-[#7d8290] text-[11px] leading-relaxed">پاکسازی فوری نقشه کش حافظه رم (DataLoader Map Cache) جهت اجبار سیستم به فچ در لحظه دیتای خام گیت‌هاب.</span>
                    </div>
                    <button id="btn-clear-cache" class="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[12px] font-mono font-bold px-5 py-2.5 rounded-[12px] transition-colors duration-200">
                        FLUSH CACHE MEMORY
                    </button>
                </div>

            </div>

            <div id="settings-feedback" class="mt-8 text-center text-[12px] font-mono font-bold opacity-0 transition-opacity duration-300"></div>

        </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const pollingSelect = document.getElementById('setting-polling');
        const protocolSelect = document.getElementById('setting-protocol');
        const clearCacheBtn = document.getElementById('btn-clear-cache');
        const feedback = document.getElementById('settings-feedback');

        const showFeedback = (msg, isSuccess = true) => {
            feedback.textContent = msg;
            feedback.className = `mt-8 text-center text-[12px] font-bold font-mono transition-opacity duration-300 ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`;
            feedback.style.opacity = '1';
            setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
        };

        // ذخیره تغییر بازه زمانی رفرش خودکار
        pollingSelect?.addEventListener('change', (e) => {
            localStorage.setItem('sys_refresh_interval', e.target.value);
            showFeedback('✓ Polling interval update stored in LocalStorage Node.');
        });

        // ذخیره ترجیح پروتکل هسته
        protocolSelect?.addEventListener('change', (e) => {
            localStorage.setItem('sys_default_protocol', e.target.value);
            showFeedback('✓ Default runtime node cluster strategy updated.');
        });

        // مدیریت عملیات فلاش کش
        clearCacheBtn?.addEventListener('click', () => {
            DataLoader.clearCache();
            showFeedback('⚡ Core Map Cache allocation flushed and cleared safely from volatile memory.');
        });
    }
};
