import os
import json
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    DateRange,
    Metric,
    Dimension,
)

# هماهنگی با ساختار روت فرانت‌اَند برای جلوگیری از خطای ۴۰۴
OUTPUT_DIR = "data/analytics"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID")
CREDENTIALS_JSON = os.environ.get("GA4_CREDENTIALS")

def init_client():
    if not PROPERTY_ID or not CREDENTIALS_JSON:
        print("❌ Error: Missing GA4_PROPERTY_ID or GA4_CREDENTIALS environment variables.")
        return None
    
    # ساخت موقت فایل کرنشال برای احراز هویت در گیت‌هاب اکشن
    with open("ga4_creds.json", "w", encoding="utf-8") as f:
        f.write(CREDENTIALS_JSON)
        
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "ga4_creds.json"
    return BetaAnalyticsDataClient()

def get_visits_summary(client):
    """استخراج آمار بازدید روزانه، پيج‌ویوها و یونیک‌ویزیتورها در ۳۰ روز گذشته"""
    request = RunReportRequest(
        property=f"properties/{PROPERTY_ID}",
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="screenPageViews"), Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    )
    response = client.run_report(request)
    
    history = []
    total_pageviews = 0
    total_users = 0
    
    for row in response.rows:
        date_str = row.dimension_values[0].value  # فرمت خروجی گوگل: YYYYMMDD
        pvs = int(row.metric_values[0].value)
        users = int(row.metric_values[1].value)
        
        total_pageviews += pvs
        total_users += users
        
        history.append({
            "date": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}", # تبدیل به YYYY-MM-DD
            "pageviews": pvs,
            "users": users
        })
        
    # مرتب‌سازی تاریخ‌ها از قدیم به جدید برای نمودارهای فرانت‌اَند
    history.sort(key=lambda x: x['date'])
    
    data = {
        "summary": {
            "total_pageviews_30d": total_pageviews,
            "total_users_30d": total_users,
            "last_updated": os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
        },
        "history": history
    }
    
    with open(f"{OUTPUT_DIR}/visits.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def get_popular_pages(client):
    """استخراج صفحات پربازدید سایت به همراه میزان واچ‌تایم یا ویو"""
    request = RunReportRequest(
        property=f"properties/{PROPERTY_ID}",
        dimensions=[Dimension(name="pagePath")],
        metrics=[Metric(name="screenPageViews")],
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        limit=15 # دریافت ۱۵ صفحه برتر
    )
    response = client.run_report(request)
    
    pages = []
    for row in response.rows:
        pages.append({
            "path": row.dimension_values[0].value,
            "views": int(row.metric_values[0].value)
        })
        
    with open(f"{OUTPUT_DIR}/popularity.json", "w", encoding="utf-8") as f:
        json.dump({"top_pages": pages}, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    client = init_client()
    if client:
        try:
            get_visits_summary(client)
            print("✅ Data successfully synced to data/analytics/visits.json")
            get_popular_pages(client)
            print("✅ Data successfully synced to data/analytics/popularity.json")
        except Exception as e:
            print(f"❌ API Execution Error: {e}")
        finally:
            # پاک کردن فایل حساس کرنشال از روی رانر گیت‌هاب پس از اتمام کار
            if os.path.exists("ga4_creds.json"):
                os.remove("ga4_creds.json")
