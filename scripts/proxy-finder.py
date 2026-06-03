#!/usr/bin/env python3
"""
Advanced Proxy Intelligence & Telemetry Aggregation Engine (Production V1 - Fixed)
Core backend component for KHASHAYAR.ONE Platform.
Handles: Base64 Decodes, Protocols Extraction, Parallel Socket Ping,
and Front-end Data Contract Synthesizing.
"""

import json
import os
import re
import hashlib
import time
import socket
import base64
import random
import sys
import threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

# ============================================
# Core Engine Configuration
# ============================================

CHANNELS = [
    "https://t.me/s/Spotify_Porteghali", "https://t.me/s/lightning6", "https://t.me/s/shaxhabb",
    "https://t.me/s/meliproxyy", "https://t.me/s/ProxyMTProto", "https://t.me/s/LonUp_M",
    "https://t.me/s/sorenab2", "https://t.me/s/ProxyDaemi", "https://t.me/s/iMTProto",
    "https://t.me/s/v2rayngvpn", "https://t.me/s/ConfigX2ray", "https://t.me/s/IraneAzad_Net",
    "https://t.me/s/prrofile_purple", "https://t.me/s/V2WRAY", "https://t.me/s/TelMTProto",
    "https://t.me/s/v2ryNG01", "https://t.me/s/V2ray_official", "https://t.me/s/TheAnilad",
    "https://t.me/s/ProxyDotNet", "https://t.me/s/NPROXY", "https://t.me/s/mrsoulb",
    "https://t.me/s/ConfigsHUB", "https://t.me/s/orange_vpns", "https://t.me/s/BugFreeNet",
    "https://t.me/s/TeleProxyTele", "https://t.me/s/iproxy_Meli", "https://t.me/s/SimChin_ir",
    "https://t.me/s/V2rayEnglish", "https://t.me/s/v2nova8", "https://t.me/s/NetAccount",
    "https://t.me/s/qpshow", "https://t.me/s/DarkHub_VPN", "https://t.me/s/configmax",
    "https://t.me/s/nufilter", "https://t.me/s/V2RAY_SPATIAL", "https://t.me/s/shankamil",
    "https://t.me/s/PulseStore_ir", "https://t.me/s/NETMelliAnti", "https://t.me/s/Blue_star_Vip",
    "https://t.me/s/Maznet", "https://t.me/s/cpy_teeL", "https://t.me/s/beshcan",
    "https://t.me/s/Parsashonam", "https://t.me/s/ProxySnipe", "https://t.me/s/Merlin_ViP",
    "https://t.me/s/ghalagyann", "https://t.me/s/Free_Nettm", "https://t.me/s/EzAccess1",
    "https://t.me/s/ChinaPortGFW", "https://t.me/s/filshekan_vip", "https://t.me/s/ProxyPJ",
    "https://t.me/s/AzadNet", "https://t.me/s/ShabrangVPN", "https://t.me/s/V2Ray_Tz",
    "https://t.me/s/acccrd", "https://t.me/s/DSR_TM", "https://t.me/s/BestProxyTel1",
    "https://t.me/s/configraygan", "https://t.me/s/configshere", "https://t.me/s/VpnQavi",
    "https://t.me/s/v2ray_dalghak", "https://t.me/s/v2rayng_fars", "https://t.me/s/saka_net",
    "https://t.me/s/config_npv", "https://t.me/s/Outline_vpn", "https://t.me/s/freakconfig",
    "https://t.me/s/flyv2ray", "https://t.me/s/proxyxix", "https://t.me/s/duckvp_n",
    "https://t.me/s/proxy_kafee", "https://t.me/s/WizProxy", "https://t.me/s/ShadowProxy66",
    "https://t.me/s/FlexEtesal", "https://t.me/s/VoidVerge", "https://t.me/s/byiroh"
]

PROXY_DIR = "data/proxy-finder"
SYSTEM_DIR = "data/system"

MESSAGES_PER_CHANNEL = 25
DB_MAX_LIMIT = 300
FETCH_TIMEOUT = 10
PING_TIMEOUT = 2
MAX_WORKERS = 15

PROXY_PATTERNS = [
    r'(tg://proxy\?[^\s<>"\']+)',
    r'(https?://t\.me/proxy\?[^\s<>"\']+)',
    r'(vless://[^\s<>"\']+)',
    r'(vmess://[^\s<>"\']+)',
    r'(trojan://[^\s<>"\']+)',
    r'(ss://[^\s<>"\']+)'
]

_lock = threading.Lock()
engine_stats = {
    'channels_checked': 0, 'channels_failed': 0, 'total_messages_scraped': 0,
    'proxies_new': 0, 'proxies_duplicate': 0, 'proxies_alive': 0, 'proxies_dead': 0
}

# ============================================
# Advanced Networking Utilities
# ============================================

def parse_proxy_endpoint(url):
    """
    موتور دکودر پیشرفته فرکانس لینک‌ها جهت استخراج فیزیکی آی‌پی و پورت شبکه
    """
    try:
        url_lower = url.lower()
        if url_lower.startswith("vmess://"):
            b64_str = url[8:].strip()
            b64_str += "=" * ((4 - len(b64_str) % 4) % 4)
            decoded = base64.b64decode(b64_str).decode('utf-8', errors='ignore')
            config = json.loads(decoded)
            return config.get("add"), int(config.get("port", 443))
        
        elif url_lower.startswith("tg://") or "t.me/proxy" in url_lower:
            server_match = re.search(r'server=([^&]+)', url)
            port_match = re.search(r'port=(\d+)', url)
            if server_match and port_match:
                return server_match.group(1), int(port_match.group(1))
            
        else:
            match = re.search(r'@([^:/]+):(\d+)', url)
            if match:
                return match.group(1), int(match.group(2))
    except Exception:
        pass
    return None, None

def ping_endpoint(host, port, timeout=PING_TIMEOUT):
    """
    تست دسترسی آنی با استاندارد دست‌تکانی سوکت TCP در لایه ترانسپورت
    """
    if not host or not port:
        return False, 0
    try:
        start = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        latency = int((time.time() - start) * 1000)
        return result == 0, latency
    except Exception:
        return False, 0

def detect_proxy_type(url):
    url_lower = url.lower()
    if 'vless://' in url_lower: return 'vless'
    if 'vmess://' in url_lower: return 'vmess'
    if 'trojan://' in url_lower: return 'trojan'
    if 'ss://' in url_lower: return 'shadowsocks'
    if 'tg://' in url_lower or 't.me/proxy' in url_lower: return 'mtproto'
    return 'unknown'

def extract_proxies_from_text(text):
    found = set()
    for pattern in PROXY_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            clean_url = m.strip().rstrip('.,;:!?)"\'')
            if len(clean_url) > 12:
                found.add(clean_url)
    return list(found)

# ============================================
# Distributed Pipeline Workers
# ============================================

def process_channel_stream(channel_url, cached_ids, cached_urls):
    channel_name = channel_url.split('/')[-1]
    discovered = []
    headers = {'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    try:
        res = requests.get(channel_url, headers=headers, timeout=FETCH_TIMEOUT)
        if res.status_code != 200: # رفع خطای تایپی (status_with به status_code اصلاح شد)
            res.raise_for_status()
            
        soup = BeautifulSoup(res.text, 'html.parser')
        divs = soup.find_all('div', class_='tgme_widget_message_text')
        messages = [d.get_text(separator=' ', strip=True) for d in divs[:MESSAGES_PER_CHANNEL]]
        
        if not messages:
            with _lock: engine_stats['channels_failed'] += 1
            return discovered

        with _lock:
            engine_stats['channels_checked'] += 1
            engine_stats['total_messages_scraped'] += len(messages)

        raw_links = []
        for msg in messages:
            raw_links.extend(extract_proxies_from_text(msg))

        for url in list(set(raw_links)):
            proxy_id = hashlib.sha256(url.encode()).hexdigest()[:12]
            
            with _lock:
                if proxy_id in cached_ids or url in cached_urls:
                    engine_stats['proxies_duplicate'] += 1
                    continue
                cached_ids.add(proxy_id)
                cached_urls.add(url)

            host, port = parse_proxy_endpoint(url)
            is_alive, latency = ping_endpoint(host, port)
            p_type = detect_proxy_type(url)

            with _lock:
                if is_alive: engine_stats['proxies_alive'] += 1
                else: engine_stats['proxies_dead'] += 1
                engine_stats['proxies_new'] += 1

            discovered.append({
                "id": proxy_id,
                "url": url,
                "type": p_type,
                "source": channel_name,
                "added_at": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                "last_check": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                "status": "active" if is_alive else "dead",
                "latency_ms": latency if is_alive else None
            })
    except Exception as e:
        with _lock: 
            engine_stats['channels_failed'] += 1
        print(f"⚠️ Error checking channel @{channel_name}: {str(e)}")
    return discovered

# ============================================
# Database Synthesizer & Writer
# ============================================

def main():
    print("⚡ Starting Production Automation Core Pipeline V1...")
    os.makedirs(PROXY_DIR, exist_ok=True)
    os.makedirs(SYSTEM_DIR, exist_ok=True)

    old_proxies = []
    proxy_file_path = f"{PROXY_DIR}/proxy.json"
    if os.path.exists(proxy_file_path):
        try:
            with open(proxy_file_path, 'r', encoding='utf-8') as f:
                old_proxies = json.load(f)
        except Exception: pass

    cached_ids = {p['id'] for p in old_proxies}
    cached_urls = {p['url'] for p in old_proxies}

    newly_discovered = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(process_channel_stream, url, cached_ids, cached_urls) for url in CHANNELS]
        for fut in as_completed(futures):
            newly_discovered.extend(fut.result())

    combined_matrix = newly_discovered + old_proxies
    
    actives = [p for p in combined_matrix if p['status'] == 'active']
    deads = [p for p in combined_matrix if p['status'] != 'active']
    
    actives.sort(key=lambda x: x.get('latency_ms', 9999))
    final_database = (actives + deads)[:DB_MAX_LIMIT]

    with open(proxy_file_path, 'w', encoding='utf-8') as f:
        json.dump(final_database, f, ensure_ascii=False, indent=2)

    with open(f"{PROXY_DIR}/stats.json", 'w', encoding='utf-8') as f:
        runtime_stats = {**engine_stats, "last_run": datetime.now(timezone.utc).isoformat()}
        json.dump(runtime_stats, f, ensure_ascii=False, indent=2)

    system_stats_path = f"{SYSTEM_DIR}/stats.json"
    with open(system_stats_path, 'w', encoding='utf-8') as f:
        json.dump({
            "configs": len(actives),
            "sources": engine_stats['channels_checked'],
            "last_update": datetime.now(timezone.utc).strftime('%H:%M UTC')
        }, f, ensure_ascii=False, indent=2)

    system_feed_path = f"{SYSTEM_DIR}/feed.json"
    current_time_str = datetime.now(timezone.utc).strftime('%H:%M')
    live_feeds = [
        {
            "id": hashlib.md5(f"sync-{time.time()}".encode()).hexdigest()[:8],
            "title": "همگام‌سازی هسته پراکسی‌ها",
            "description": f"تعداد {len(actives)} کانال ارتباطی فعال و کم‌تاخیر با موفقیت به بانک اطلاعاتی تزریق شد.",
            "timestamp": current_time_str,
            "type": "sync"
        },
        {
            "id": hashlib.md5(f"telemetry-{time.time()}".encode()).hexdigest()[:8],
            "title": "پایش سیستم تلمتری",
            "description": f"تعداد {engine_stats['channels_checked']} منبع تلگرامی اسکن شده و نرخ تکثیر بررسی گردید.",
            "timestamp": current_time_str,
            "type": "system"
        }
    ]
    with open(system_feed_path, 'w', encoding='utf-8') as f:
        json.dump(live_feeds, f, ensure_ascii=False, indent=2)

    print(f"📊 Process Complete. Active Configs Synchronized: {len(actives)}")

if __name__ == '__main__':
    main()
