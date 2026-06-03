/**
 * Data Loader Module
 * مسئول دریافت داده‌ها از فایل‌های JSON برای تغذیه داشبورد
 */

const DATA_PATH = './data/system';

// متد کمکی برای Fetch با هندل کردن خطاها
async function fetchJSON(filename) {
    try {
        // برای شبیه‌سازی تاخیر شبکه و دیدن انیمیشن Loading (Skeleton) در لوکال
        // می‌توانید خط زیر را از کامنت در بیاورید:
        // await new Promise(resolve => setTimeout(resolve, 800));

        const response = await fetch(`${DATA_PATH}/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return null; // برگرداندن null برای مدیریت خطا در کامپوننت‌ها
    }
}

// اکسپورت آبجکت DataLoader برای استفاده در سایر کامپوننت‌ها
export const DataLoader = {
    getStats: async () => await fetchJSON('stats.json'),
    getFeed: async () => await fetchJSON('feed.json'),
    getTools: async () => await fetchJSON('tools.json'),
    getRoadmap: async () => await fetchJSON('roadmap.json')
};
