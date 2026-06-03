/**
 * Command Palette Module (Upgrade 03)
 * سیستم جستجوی سراسری لایو (مشابه Raycast / Spotlight) با ناوبری کامل کیبورد
 */

import { DataLoader } from './data-loader.js';

export const CommandPalette = {
    isOpen: false,
    toolsData: [],
    filteredTools: [],
    selectedIndex: 0,

    async init() {
        // ۱. واکشی دیتای ابزارها برای آماده‌سازی کش پلت فرمان
        this.toolsData = await DataLoader.getTools() || [];
        
        // ۲. شنود کلیدهای ترکیبی هوشمند سیستم (CTRL+K / CMD+K)
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    toggle() {
        this.isOpen ? this.close() : this.open();
    },

    open() {
        this.isOpen = true;
        this.filteredTools = [...this.toolsData];
        this.selectedIndex = 0;

        const root = document.getElementById('command-palette-root');
        if (!root) return;

        // رندر کامل ساختار اوورلی و مدال مرکزی پلت فرمان
        root.innerHTML = `
        <div id="palette-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center pt-[15vh] px-4 transition-opacity duration-200 opacity-0">
            <div id="palette-modal" class="w-full max-w-[640px] bg-[#0f0f10] border border-[#151517] rounded-[20px] shadow-2xl overflow-hidden transform scale-95 transition-transform duration-200">
                
                <div class="flex items-center gap-3 px-5 py-4 border-b border-[#151517]">
                    <svg class="w-5 h-5 text-[#7d8290]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input type="text" id="palette-search" placeholder="Search tools..." class="w-full bg-transparent text-white placeholder-[#7d8290] border-none outline-none text-[15px] font-medium" autofocus autocomplete="off">
                </div>

                <div id="palette-results" class="max-h-[320px] overflow-y-auto p-2 flex flex-col gap-1">
                    </div>

                <div class="px-5 py-2.5 bg-[#080808] border-t border-[#151517] flex justify-between items-center text-[10px] text-[#7d8290] font-mono">
                    <div class="flex items-center gap-3">
                        <span>↑↓ Navigate</span>
                        <span>↵ Enter</span>
                    </div>
                    <span>ESC to close</span>
                </div>

            </div>
        </div>
        `;

        // انیمیشن نرم ورود
        setTimeout(() => {
            document.getElementById('palette-overlay').classList.remove('opacity-0');
            document.getElementById('palette-modal').classList.remove('scale-95');
        }, 10);

        this.renderResults();
        this.bindModalEvents();
    },

    close() {
        const overlay = document.getElementById('palette-overlay');
        const modal = document.getElementById('palette-modal');
        if (!overlay || !modal) return;

        overlay.classList.add('opacity-0');
        modal.classList.add('scale-95');

        setTimeout(() => {
            this.isOpen = false;
            document.getElementById('command-palette-root').innerHTML = '';
        }, 200);
    },

    renderResults() {
        const resultsContainer = document.getElementById('palette-results');
        if (!resultsContainer) return;

        if (this.filteredTools.length === 0) {
            resultsContainer.innerHTML = `
                <div class="p-8 text-center text-[#7d8290] text-[13px]">
                    No tools found matching your request.
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = this.filteredTools.map((tool, idx) => {
            const isSelected = idx === this.selectedIndex;
            const activeClasses = isSelected ? 'bg-[#151517] border-neutral-800 text-white' : 'border-transparent text-[#b9bcc7]';
            
            return `
            <div class="palette-item flex items-center justify-between px-4 py-3 rounded-[12px] border cursor-pointer transition-all duration-150 ${activeClasses}" data-index="${idx}">
                <div class="flex flex-col gap-0.5 text-right">
                    <span class="text-[14px] font-semibold">${tool.name}</span>
                    <span class="text-[11px] text-[#7d8290] truncate max-w-[450px]">${tool.description || ''}</span>
                </div>
                <div class="text-[10px] font-mono uppercase bg-[#080808] border border-[#151517] px-2 py-0.5 rounded-[6px] text-[#7d8290]">
                    ${tool.status}
                </div>
            </div>
            `;
        }).join('');
    },

    bindModalEvents() {
        const searchInput = document.getElementById('palette-search');
        if (searchInput) searchInput.focus();

        // فیلترینگ دیتای لایو هنگام تایپ در ورودی
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.filteredTools = this.toolsData.filter(tool => 
                tool.name.toLowerCase().includes(query) || 
                (tool.description && tool.description.toLowerCase().includes(query))
            );
            this.selectedIndex = 0; // ریست ایندکس انتخاب شده
            this.renderResults();
        });

        // شنود کلیدهای مکان‌نما جهت جابجایی روی لیست (Arrow Navigation)
        window.addEventListener('keydown', this.handleKeyDownBound = (e) => {
            if (!this.isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % this.filteredTools.length;
                this.renderResults();
                this.scrollToActive();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + this.filteredTools.length) % this.filteredTools.length;
                this.renderResults();
                this.scrollToActive();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.executeSelection();
            }
        });

        // رویداد کلیک ماوس روی آیتم‌های لیست
        document.getElementById('palette-results').addEventListener('click', (e) => {
            const item = e.target.closest('.palette-item');
            if (item) {
                this.selectedIndex = parseInt(item.dataset.index);
                this.executeSelection();
            }
        });
    },

    scrollToActive() {
        const activeItem = document.querySelector('.palette-item.bg-\\[\\#151517\\]');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    },

    executeSelection() {
        const selectedTool = this.filteredTools[this.selectedIndex];
        if (selectedTool) {
            console.log(`🚀 Executing Command Center Module: ${selectedTool.name}`);
            
            // هدایت به المان/ابزار مورد نظر بر روی بدنه اصلی بونتو گرید
            this.close();
            const targetId = selectedTool.id;
            const element = document.getElementById(targetId) || document.querySelector(`[class*="glow"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('border-neutral-500');
                setTimeout(() => element.classList.remove('border-neutral-500'), 1500);
            }
        }
    }
};
