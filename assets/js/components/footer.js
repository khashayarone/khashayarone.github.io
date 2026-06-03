/**
 * Footer Component
 * پاورقی مینیمال، فنی و تکنیکال انتهای مرکز عملیات داشبورد
 */

export const Footer = {
    render() {
        return `
        <footer class="border-t border-[#151517] bg-[#080808] py-[32px] px-[16px] sm:px-[24px] lg:px-[48px] mt-[120px] text-right">
            <div class="container-custom flex flex-col sm:flex-row justify-between items-center gap-4 text-[12px] font-mono text-[#7d8290]">
                
                <div class="flex items-center gap-2">
                    <span class="text-white font-bold tracking-wide">KHASHAYAR.ONE</span>
                    <span>© 2026 // Intelligence Platform Hub.</span>
                </div>

                <div class="flex items-center gap-4 text-left">
                    <span class="text-[#b9bcc7]">Core Architecture V2 // Vanilla JS</span>
                    <span class="text-emerald-500">Node Secure</span>
                </div>

            </div>
        </footer>
        `;
    },

    init() {
        const root = document.getElementById('footer-root');
        if (!root) return;
        root.innerHTML = this.render();
    }
};
