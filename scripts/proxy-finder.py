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
    "https://t.me/s/iroproxy",
    "https://t.me/s/imtproto",
    "https://t.me/s/darkproxy",
    "https://t.me/s/myporoxy",
    "https://t.me/s/iProxyChannel",
    "https://t.me/s/V2RAY_SPATIAL",
    "https://t.me/s/Raiv2mmr",
    "https://t.me/s/ProxyMTProto",
    "https://t.me/s/best_mtproto_proxies",
    "https://t.me/s/kingproxy_ir",
    "https://t.me/s/ParsProxyIr",
    "https://t.me/s/YellowProxy",
    "https://t.me/s/proxydaemi",
    "https://t.me/s/MTPProtoProxies",
    "https://t.me/s/proxy_qavi",
    "https://t.me/s/proxymtprotoir",
    "https://t.me/s/nproxy",
    "https://t.me/s/mtproxystar",
    "https://t.me/s/mtp_roto",
    "https://t.me/s/pinkproxy",
    "https://t.me/s/proxiteiegram",
    "https://t.me/s/irproxy",
    "https://t.me/s/proxymtproto_tel",
    "https://t.me/s/filtereshekan",
    "https://t.me/s/forall_proxy",
    "https://t.me/s/V2RayRootFree",
    "https://t.me/s/TelMTProto",
    "https://t.me/s/v2rayman",
    "https://t.me/s/v2raycollector",
    "https://t.me/s/v2rayconfigs",
    "https://t.me/s/mtprotoproxy",
    "https://t.me/s/v2ray_free",
    "https://t.me/s/proxymtproto_ir",
    "https://t.me/s/v2ray_team",
    "https://t.me/s/shadowsocks_proxy",
    "https://t.me/s/trojan_proxy",
    "https://t.me/s/vless_proxy",
    "https://t.me/s/hysteria_proxy",
    "https://t.me/s/tuic_proxy",
    "https://t.me/s/wireguard_proxy",
    "https://t.me/s/outline_vpn",
    "https://t.me/s/reality_configs",
    "https://t.me/s/ssr_configs",
    "https://t.me/s/v2rayng_channel",
    "https://t.me/s/v2ray_android",
    "https://t.me/s/nekobox_configs",
    "https://t.me/s/marzban_node",
    "https://t.me/s/xray_configs",
    "https://t.me/s/3xui_panel",
    "https://t.me/s/v2ray_pool",
    "https://t.me/s/v2ray_configs_pool",
    "https://t.me/s/V2ConfigGB",
    "https://t.me/s/FilterShekanChannel",
    "https://t.me/s/v2rayvpnchannel",
    "https://t.me/s/freeproxymaker",
    "https://t.me/s/proxyforiranians",
    "https://t.me/s/v2ray3",
    "https://t.me/s/e_v2ray",
    "https://t.me/s/v2ray_channel",
    "https://t.me/s/caa_family",
    "https://t.me/s/tvproxy",
    "https://t.me/s/Best_MTProx",
    "https://t.me/s/abolfazlgame4",
    "https://t.me/s/proxymtproto",
    "https://t.me/s/VPN_CLUB",
    "https://t.me/s/proxystore11",
    "https://t.me/s/iranazadi_channel",
    "https://t.me/s/vpnbaz",
    "https://t.me/s/iMTProxy_ir",
    "https://t.me/s/feriproxy",
    "https://t.me/s/Raimmrprox",
    "https://t.me/s/iSafenet",
    "https://t.me/s/amnezia_vpn",
    "https://t.me/s/protocol_vpn",
    "https://t.me/s/vpn_1_1_1_1_warp",
    "https://t.me/s/kvas_pro",
    "https://t.me/s/ru_tech_talk",
    "https://t.me/s/zatelecom",
    "https://t.me/s/nekoray_group",
    "https://t.me/s/projectVless",
    "https://t.me/s/FreenetChan",
    "https://t.me/s/legiz_trashbag",
    "https://t.me/s/happ_chat",
    "https://t.me/s/incvpn_posts",
    "https://t.me/s/na_svyazi_helpdesk",
    "https://t.me/s/crazy_day_admin",
    "https://t.me/s/opensafer",
    "https://t.me/s/kubernetes_ru",
    "https://t.me/s/uRouterPublic",
    "https://t.me/s/itdogchat",
    "https://t.me/s/gozargah_marzban",
    "https://t.me/s/panel3xui",
    "https://t.me/s/zee4r",
    "https://t.me/s/amnezia_vpn_dev",
    "https://t.me/s/generatewarpplusbot",
    "https://t.me/s/SingBox_Configs",
    "https://t.me/s/TUIC_Configs",
    "https://t.me/s/Hysteria2_Configs",
    "https://t.me/s/VLESS_Proxies",
    "https://t.me/s/Trojan_Configs",
    "https://t.me/s/v2ray_configs_pool_2",
    "https://t.me/s/mtproto_proxy_ir",
    "https://t.me/s/shadowsocks_ir",
    "https://t.me/s/trojan_iran",
    "https://t.me/s/vless_ir",
    "https://t.me/s/hysteria_ir",
    "https://t.me/s/tuic_iran",
    "https://t.me/s/wireguard_ir",
    "https://t.me/s/outline_iran",
    "https://t.me/s/reality_iran",
    "https://t.me/s/ssr_iran",
    "https://t.me/s/v2rayng_ir",
    "https://t.me/s/nekobox_iran",
    "https://t.me/s/singbox_ir",
    "https://t.me/s/marzban_iran",
    "https://t.me/s/3xui_iran",
    "https://t.me/s/xray_iran",
    "https://t.me/s/v2fly_iran",
    "https://t.me/s/projectx_ir",
    "https://t.me/s/xray_official_ir",
    "https://t.me/s/v2ray_official_ir",
    "https://t.me/s/v2ray_community_ir",
    "https://t.me/s/proxy_community_ir",
    "https://t.me/s/free_proxy_iran",
    "https://t.me/s/daily_proxy_ir",
    "https://t.me/s/proxy_list_iran",
    "https://t.me/s/configs_daily_ir",
    "https://t.me/s/vpn_configs_ir",
    "https://t.me/s/free_vpn_iran",
    "https://t.me/s/best_proxy_iran",
    "https://t.me/s/super_proxy_ir",
    "https://t.me/s/mega_proxy_ir",
    "https://t.me/s/ultra_proxy_ir",
    "https://t.me/s/max_proxy_ir",
    "https://t.me/s/top_proxy_iran",
    "https://t.me/s/gold_proxy_ir",
    "https://t.me/s/platinum_proxy_ir",
    "https://t.me/s/diamond_proxy_ir",
    "https://t.me/s/royal_proxy_ir",
    "https://t.me/s/queen_proxy",
    "https://t.me/s/prince_proxy_ir",
    "https://t.me/s/princess_proxy_ir",
    "https://t.me/s/legend_proxy_ir",
    "https://t.me/s/master_proxy_ir",
    "https://t.me/s/expert_proxy_ir",
    "https://t.me/s/pro_proxy_iran",
    "https://t.me/s/elite_proxy_ir",
    "https://t.me/s/premium_proxy_ir",
    "https://t.me/s/vip_proxy_iran",
    "https://t.me/s/special_proxy_ir",
    "https://t.me/s/xray_panel_zone",
    "https://t.me/s/v2ray_farsi",
    "https://t.me/s/trojan_servers",
    "https://t.me/s/vless_configs_daily",
    "https://t.me/s/reality_protocol",
    "https://t.me/s/hy2_servers",
    "https://t.me/s/tuic_protocol",
    "https://t.me/s/wireguard_free",
    "https://t.me/s/outline_vpn_ir",
    "https://t.me/s/ssr_free_configs",
    "https://t.me/s/v2ray_ng_channel",
    "https://t.me/s/nekobox_ir",
    "https://t.me/s/singbox_configs",
    "https://t.me/s/marzban_ir",
    "https://t.me/s/xui_panel_ir",
    "https://t.me/s/xray_core_ir",
    "https://t.me/s/v2fly_ir",
    "https://t.me/s/project_xray",
    "https://t.me/s/xray_official",
    "https://t.me/s/v2ray_official",
    "https://t.me/s/v2ray_community",
    "https://t.me/s/proxy_community",
    "https://t.me/s/free_proxy_ir",
    "https://t.me/s/daily_proxy",
    "https://t.me/s/proxy_list_ir",
    "https://t.me/s/configs_daily",
    "https://t.me/s/vpn_configs",
    "https://t.me/s/free_vpn_ir",
    "https://t.me/s/best_proxy_ir",
    "https://t.me/s/super_proxy",
    "https://t.me/s/mega_proxy",
    "https://t.me/s/ultra_proxy",
    "https://t.me/s/max_proxy",
    "https://t.me/s/top_proxy_ir",
    "https://t.me/s/gold_proxy",
    "https://t.me/s/platinum_proxy",
    "https://t.me/s/diamond_proxy",
    "https://t.me/s/royal_proxy",
    "https://t.me/s/king_proxy",
    "https://t.me/s/prince_proxy",
    "https://t.me/s/princess_proxy",
    "https://t.me/s/legend_proxy",
    "https://t.me/s/master_proxy",
    "https://t.me/s/expert_proxy",
    "https://t.me/s/pro_proxy_ir",
    "https://t.me/s/elite_proxy",
    "https://t.me/s/premium_proxy",
    "https://t.me/s/vip_proxy_ir",
    "https://t.me/s/special_proxy",
    "https://t.me/s/unique_proxy",
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
