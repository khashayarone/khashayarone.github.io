import json
from datetime import datetime
from google.cloud import bigquery

OUTPUT_DIR = "data/analytics"

# 👉 مهم: این رو با پروژه واقعی خودت تنظیم کن
PROJECT_ID = "khashayar-analytics-sync"
DATASET = "analytics_567869788647"  # ← از BigQuery Linking گرفتی

TABLE_PATTERN = f"`{PROJECT_ID}.{DATASET}.events_*`"

client = bigquery.Client(project=PROJECT_ID)


# =========================
# 1. VISITS (Pageviews + Users)
# =========================
def fetch_visits():
    query = f"""
    SELECT
      PARSE_DATE('%Y%m%d', event_date) AS date,

      COUNTIF(event_name = 'page_view') AS pageviews,

      COUNT(DISTINCT user_pseudo_id) AS users

    FROM {TABLE_PATTERN}
    WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
                           AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())

    GROUP BY date
    ORDER BY date
    """

    rows = client.query(query).result()

    history = []
    total_pageviews = 0
    total_users = 0

    for r in rows:
        history.append({
            "date": str(r.date),
            "pageviews": r.pageviews,
            "users": r.users
        })
        total_pageviews += r.pageviews
        total_users += r.users

    output = {
        "summary": {
            "total_pageviews_30d": total_pageviews,
            "total_users_30d": total_users,
            "last_updated": datetime.utcnow().isoformat() + "Z"
        },
        "history": history
    }

    with open(f"{OUTPUT_DIR}/visits.json", "w") as f:
        json.dump(output, f, indent=2)

    print("✅ visits.json generated")


# =========================
# 2. TOP PAGES (Optimized)
# =========================
def fetch_popular_pages():
    query = f"""
    SELECT
      (SELECT value.string_value
       FROM UNNEST(event_params)
       WHERE key = 'page_location') AS page,

      COUNT(*) AS views

    FROM {TABLE_PATTERN}
    WHERE event_name = 'page_view'
      AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
                           AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())

    GROUP BY page
    ORDER BY views DESC
    LIMIT 15
    """

    rows = client.query(query).result()

    pages = []

    for r in rows:
        if r.page:
            pages.append({
                "path": r.page,
                "views": r.views
            })

    output = {
        "top_pages": pages,
        "last_updated": datetime.utcnow().isoformat() + "Z"
    }

    with open(f"{OUTPUT_DIR}/popularity.json", "w") as f:
        json.dump(output, f, indent=2)

    print("✅ popularity.json generated")


# =========================
# 3. EVENTS BREAKDOWN (Bonus but مهم)
# =========================
def fetch_events():
    query = f"""
    SELECT
      event_name,
      COUNT(*) AS count
    FROM {TABLE_PATTERN}
    WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
                           AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())

    GROUP BY event_name
    ORDER BY count DESC
    LIMIT 20
    """

    rows = client.query(query).result()

    events = []

    for r in rows:
        events.append({
            "event": r.event_name,
            "count": r.count
        })

    output = {
        "events": events,
        "last_updated": datetime.utcnow().isoformat() + "Z"
    }

    with open(f"{OUTPUT_DIR}/events.json", "w") as f:
        json.dump(output, f, indent=2)

    print("✅ events.json generated")


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    fetch_visits()
    fetch_popular_pages()
    fetch_events()

    print("🚀 BigQuery Analytics Pipeline Completed Successfully")
