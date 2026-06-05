#!/usr/bin/env python3

import os
import re
import json
import time
import socket
import base64
import hashlib
import threading

from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

# =========================================================
# CONFIG
# =========================================================

PROXY_DIR = "data/proxy-finder"
SYSTEM_DIR = "data/system"
CACHE_DIR = "data/cache"

MESSAGES_PER_CHANNEL = 25
DB_MAX_LIMIT = 1000

FETCH_TIMEOUT = 10
PING_TIMEOUT = 2

MAX_WORKERS = 20

CHANNELS = [
    "https://t.me/s/Spotify_Porteghali",
    "https://t.me/s/lightning6",
    "https://t.me/s/shaxhabb",
    "https://t.me/s/meliproxyy",
    "https://t.me/s/ProxyMTProto",
    "https://t.me/s/LonUp_M",
    "https://t.me/s/sorenab2",
    "https://t.me/s/ProxyDaemi",
    "https://t.me/s/iMTProto",
    "https://t.me/s/v2rayngvpn",
    "https://t.me/s/ConfigX2ray",
    "https://t.me/s/IraneAzad_Net",
]

PROXY_PATTERNS = [
    r"(tg://proxy\?[^\s<>'\"]+)",
    r"(https?://t\.me/proxy\?[^\s<>'\"]+)",
    r"(vless://[^\s<>'\"]+)",
    r"(vmess://[^\s<>'\"]+)",
    r"(trojan://[^\s<>'\"]+)",
    r"(ss://[^\s<>'\"]+)"
]

session = requests.Session()

_lock = threading.Lock()

engine_stats = {
    "channels_checked": 0,
    "channels_failed": 0,
    "total_messages_scraped": 0,
    "proxies_new": 0,
    "proxies_duplicate": 0,
    "proxies_alive": 0,
    "proxies_dead": 0,
}

# =========================================================
# FILE HELPERS
# =========================================================

def ensure_dirs():
    os.makedirs(PROXY_DIR, exist_ok=True)
    os.makedirs(SYSTEM_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)


def load_json(path, default):
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# =========================================================
# PROTOCOL
# =========================================================

def detect_type(url):
    u = url.lower()

    if u.startswith("vless://"):
        return "vless"

    if u.startswith("vmess://"):
        return "vmess"

    if u.startswith("trojan://"):
        return "trojan"

    if u.startswith("ss://"):
        return "shadowsocks"

    if u.startswith("tg://") or "t.me/proxy" in u:
        return "mtproto"

    return "unknown"


def extract_links(text):
    found = set()

    for pattern in PROXY_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)

        for item in matches:
            clean = item.strip().rstrip(".,;:!?)")
            if len(clean) > 12:
                found.add(clean)

    return list(found)


# =========================================================
# ENDPOINT PARSER
# =========================================================

def parse_endpoint(url):

    try:

        if url.startswith("vmess://"):

            encoded = url[8:]
            encoded += "=" * ((4 - len(encoded) % 4) % 4)

            data = json.loads(
                base64.b64decode(encoded).decode(
                    "utf-8",
                    errors="ignore"
                )
            )

            return (
                data.get("add"),
                int(data.get("port", 443))
            )

        if url.startswith("tg://") or "t.me/proxy" in url:

            server = re.search(r"server=([^&]+)", url)
            port = re.search(r"port=(\d+)", url)

            if server and port:
                return server.group(1), int(port.group(1))

        m = re.search(r"@([^:/]+):(\d+)", url)

        if m:
            return m.group(1), int(m.group(2))

    except Exception:
        pass

    return None, None


# =========================================================
# HEALTH ENGINE
# =========================================================

def tcp_ping(host, port):

    if not host or not port:
        return False, 0

    try:

        start = time.time()

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(PING_TIMEOUT)

        result = sock.connect_ex((host, port))

        sock.close()

        latency = int((time.time() - start) * 1000)

        return result == 0, latency

    except Exception:
        return False, 0


# =========================================================
# TRUST ENGINE
# =========================================================

def trust_score(proxy):

    score = 50

    latency = proxy.get("latency_ms")

    if latency:

        if latency < 100:
            score += 30

        elif latency < 250:
            score += 20

        elif latency < 500:
            score += 10

    score += min(proxy.get("seen_count", 0), 10)

    if proxy.get("status") == "active":
        score += 10

    score = max(0, min(100, score))

    return score


def trust_grade(score):

    if score >= 85:
        return "A"

    if score >= 70:
        return "B"

    return "C"


# =========================================================
# SCRAPER
# =========================================================

def process_channel(channel_url, history):

    channel_name = channel_url.split("/")[-1]

    discovered = []

    try:

        res = session.get(
            channel_url,
            timeout=FETCH_TIMEOUT,
            headers={
                "User-Agent": "Mozilla/5.0"
            }
        )

        res.raise_for_status()

        soup = BeautifulSoup(
            res.text,
            "html.parser"
        )

        divs = soup.find_all(
            "div",
            class_="tgme_widget_message_text"
        )

        messages = [
            d.get_text(
                separator=" ",
                strip=True
            )
            for d in divs[:MESSAGES_PER_CHANNEL]
        ]

        with _lock:
            engine_stats["channels_checked"] += 1
            engine_stats["total_messages_scraped"] += len(messages)

        links = []

        for msg in messages:
            links.extend(extract_links(msg))

        for url in set(links):

            pid = hashlib.sha256(
                url.encode()
            ).hexdigest()[:12]

            item = history.get(pid, {})

            host, port = parse_endpoint(url)

            alive, latency = tcp_ping(
                host,
                port
            )

            seen = item.get(
                "seen_count",
                0
            ) + 1

            proxy = {
                "id": pid,
                "url": url,
                "type": detect_type(url),
                "source": channel_name,
                "status": "active" if alive else "dead",
                "latency_ms": latency if alive else None,
                "first_seen": item.get(
                    "first_seen",
                    utc_now()
                ),
                "last_seen": utc_now(),
                "seen_count": seen,
            }

            score = trust_score(proxy)

            proxy["trust_score"] = score
            proxy["trust_grade"] = trust_grade(score)

            discovered.append(proxy)

            with _lock:

                if alive:
                    engine_stats["proxies_alive"] += 1
                else:
                    engine_stats["proxies_dead"] += 1

    except Exception:

        with _lock:
            engine_stats["channels_failed"] += 1

    return discovered


# =========================================================
# BUILD
# =========================================================

def main():

    ensure_dirs()

    old_db = load_json(
        f"{PROXY_DIR}/proxy.json",
        []
    )

    history = {
        p["id"]: p
        for p in old_db
    }

    proxies = []

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        futures = [
            executor.submit(
                process_channel,
                url,
                history
            )
            for url in CHANNELS
        ]

        for future in as_completed(futures):
            proxies.extend(future.result())

    unique = {}

    for p in proxies:
        unique[p["id"]] = p

    db = list(unique.values())

    active = [
        x for x in db
        if x["status"] == "active"
    ]

    active.sort(
        key=lambda x: (
            -x["trust_score"],
            x.get("latency_ms", 9999)
        )
    )

    final_db = active[:DB_MAX_LIMIT]

    save_json(
        f"{PROXY_DIR}/proxy.json",
        final_db
    )

    save_json(
        f"{PROXY_DIR}/fastest.json",
        sorted(
            active,
            key=lambda x: x.get(
                "latency_ms",
                9999
            )
        )[:50]
    )

    save_json(
        f"{PROXY_DIR}/recommendations.json",
        [
            x for x in active
            if x["trust_grade"] == "A"
        ][:50]
    )

    source_stats = {}

    for p in final_db:

        source = p["source"]

        if source not in source_stats:
            source_stats[source] = {
                "source": source,
                "configs": 0,
                "trust": 0
            }

        source_stats[source]["configs"] += 1
        source_stats[source]["trust"] += p["trust_score"]

    leaderboard = sorted(
        source_stats.values(),
        key=lambda x: x["trust"],
        reverse=True
    )

    save_json(
        f"{PROXY_DIR}/leaderboard.json",
        leaderboard[:30]
    )

    save_json(
        f"{PROXY_DIR}/stats.json",
        {
            **engine_stats,
            "total_configs": len(final_db),
            "generated_at": utc_now()
        }
    )

    save_json(
        f"{SYSTEM_DIR}/stats.json",
        {
            "configs": len(final_db),
            "sources": len(CHANNELS),
            "last_update": utc_now()
        }
    )

    save_json(
        f"{SYSTEM_DIR}/health.json",
        {
            "status": "healthy",
            "active_configs": len(final_db),
            "channels_checked":
                engine_stats["channels_checked"],
            "generated_at": utc_now()
        }
    )

    save_json(
        f"{SYSTEM_DIR}/feed.json",
        [
            {
                "type": "sync",
                "title": "Database Updated",
                "description":
                    f"{len(final_db)} active configs available",
                "timestamp": utc_now()
            },
            {
                "type": "leaderboard",
                "title": "Top Source Updated",
                "description":
                    leaderboard[0]["source"]
                    if leaderboard else "N/A",
                "timestamp": utc_now()
            }
        ]
    )

    print(
        f"Done. Active configs: {len(final_db)}"
    )


if __name__ == "__main__":
    main()
