#!/usr/bin/env python3
"""
Proxy Finder — Telegram Channel Scraper (Optimized)
Extracts proxy links from public Telegram channels,
deduplicates, validates, and maintains a clean proxy.json database.

Optimizations:
  - Parallel fetching (10 workers)
  - Reduced delays
  - Smarter caching
  - Faster ping (2s timeout)

Part of Vanilla Micro-SPA Tool Platform
"""

import json
import os
import re
import hashlib
import time
import socket
import random
import sys
import threading
from datetime import datetime, timezone
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

# ============================================
# Configuration — Optimized
# ============================================

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
    "https://t.me/s/prrofile_purple",
    "https://t.me/s/V2WRAY",
    "https://t.me/s/TelMTProto",
    "https://t.me/s/v2ryNG01",
    "https://t.me/s/V2ray_official",
    "https://t.me/s/TheAnilad",
    "https://t.me/s/ProxyDotNet",
    "https://t.me/s/NPROXY",
    "https://t.me/s/mrsoulb",
    "https://t.me/s/ConfigsHUB",
    "https://t.me/s/orange_vpns",
    "https://t.me/s/BugFreeNet",
    "https://t.me/s/TeleProxyTele",
    "https://t.me/s/iproxy_Meli",
    "https://t.me/s/SimChin_ir",
    "https://t.me/s/V2rayEnglish",
    "https://t.me/s/v2nova8",
    "https://t.me/s/NetAccount",
    "https://t.me/s/qpshow",
    "https://t.me/s/DarkHub_VPN",
    "https://t.me/s/configmax",
    "https://t.me/s/nufilter",
    "https://t.me/s/V2RAY_SPATIAL",
    "https://t.me/s/shankamil",
    "https://t.me/s/PulseStore_ir",
    "https://t.me/s/NETMelliAnti",
    "https://t.me/s/Blue_star_Vip",
    "https://t.me/s/Maznet",
    "https://t.me/s/cpy_teeL",
    "https://t.me/s/beshcan",
    "https://t.me/s/Parsashonam",
    "https://t.me/s/ProxySnipe",
    "https://t.me/s/Merlin_ViP",
    "https://t.me/s/ghalagyann",
    "https://t.me/s/Free_Nettm",
    "https://t.me/s/EzAccess1",
    "https://t.me/s/ChinaPortGFW",
    "https://t.me/s/filshekan_vip",
    "https://t.me/s/ProxyPJ",
    "https://t.me/s/AzadNet",
    "https://t.me/s/ShabrangVPN",
    "https://t.me/s/V2Ray_Tz",
    "https://t.me/s/acccrd",
    "https://t.me/s/DSR_TM",
    "https://t.me/s/BestProxyTel1",
    "https://t.me/s/configraygan",
    "https://t.me/s/configshere",
    "https://t.me/s/VpnQavi",
    "https://t.me/s/v2ray_dalghak",
    "https://t.me/s/v2rayng_fars",
    "https://t.me/s/saka_net",
    "https://t.me/s/config_npv",
    "https://t.me/s/Outline_vpn",
    "https://t.me/s/freakconfig",
    "https://t.me/s/flyv2ray",
    "https://t.me/s/proxyxix",
    "https://t.me/s/duckvp_n",
    "https://t.me/s/proxy_kafee",
    "https://t.me/s/WizProxy",
    "https://t.me/s/ShadowProxy66",
    "https://t.me/s/FlexEtesal",
    "https://t.me/s/VoidVerge",
    "https://t.me/s/byiroh",
]

OUTPUT_DIR = "data/proxy-finder"
PROXY_FILE = f"{OUTPUT_DIR}/proxy.json"
STATS_FILE = f"{OUTPUT_DIR}/stats.json"

MESSAGES_PER_CHANNEL = 20
MAX_PROXIES = 100
FETCH_TIMEOUT = 8
PING_TIMEOUT = 2
MAX_WORKERS = 10
RETRY_COUNT = 1

PROXY_PATTERNS = [
    r'(tg://proxy\?[^\s<>"\']+)',
    r'(https?://t\.me/proxy\?[^\s<>"\']+)',
    r'(socks5://[^\s<>"\']+)',
    r'(https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5})',
    r'(vless://[^\s<>"\']+)',
    r'(vmess://[^\s<>"\']+)',
    r'(trojan://[^\s<>"\']+)',
    r'(ss://[^\s<>"\']+)',
    r'(ssr://[^\s<>"\']+)',
    r'(wg://[^\s<>"\']+)',
    r'(wireguard://[^\s<>"\']+)',
    r'(hysteria2?://[^\s<>"\']+)',
    r'(hy2://[^\s<>"\']+)',
    r'(tuic://[^\s<>"\']+)',
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
]

# Thread-safe lock
_lock = threading.Lock()
stats = {}

# ============================================
# Helper Functions
# ============================================

def generate_proxy_id(url):
    return hashlib.sha256(url.encode()).hexdigest()[:12]


def detect_proxy_type(url):
    url_lower = url.lower()
    if url_lower.startswith('tg://') or 't.me/proxy' in url_lower:
        return 'mtproto'
    elif url_lower.startswith('vless://'):
        return 'vless'
    elif url_lower.startswith('vmess://'):
        return 'vmess'
    elif url_lower.startswith('trojan://'):
        return 'trojan'
    elif url_lower.startswith('ss://'):
        return 'shadowsocks'
    elif url_lower.startswith('ssr://'):
        return 'shadowsocksr'
    elif url_lower.startswith('socks5://'):
        return 'socks5'
    elif url_lower.startswith('http://') or url_lower.startswith('https://'):
        return 'http'
    elif 'hysteria' in url_lower or url_lower.startswith('hy2://'):
        return 'hysteria'
    elif url_lower.startswith('tuic://'):
        return 'tuic'
    elif url_lower.startswith('wg://') or url_lower.startswith('wireguard://'):
        return 'wireguard'
    return 'unknown'


def extract_proxies_from_text(text):
    proxies = set()
    for pattern in PROXY_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            url = match.strip().rstrip('.,;:!?)"\'')
            if len(url) > 15:
                proxies.add(url)
    return list(proxies)


def ping_proxy(url, proxy_type, timeout=PING_TIMEOUT):
    try:
        if proxy_type == 'mtproto':
            match = re.search(r'server=([^&]+)', url)
            server = match.group(1) if match else None
            match = re.search(r'port=(\d+)', url)
            port = int(match.group(1)) if match else 443
            if server:
                start = time.time()
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((server, port))
                sock.close()
                latency = int((time.time() - start) * 1000)
                return result == 0, latency
        else:
            parsed = urlparse(url)
            host = parsed.hostname
            port = parsed.port or 443
            if host:
                start = time.time()
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                sock.close()
                latency = int((time.time() - start) * 1000)
                return result == 0, latency
        return False, 0
    except Exception:
        return False, 0


def fetch_channel_messages(channel_url):
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
    }
    
    for attempt in range(RETRY_COUNT + 1):
        try:
            response = requests.get(channel_url, headers=headers, timeout=FETCH_TIMEOUT)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            message_divs = soup.find_all('div', class_='tgme_widget_message_text')
            return [div.get_text(separator=' ', strip=True) for div in message_divs[:MESSAGES_PER_CHANNEL]]
        except requests.RequestException:
            if attempt < RETRY_COUNT:
                time.sleep(2)
    return []


def load_existing_proxies():
    if os.path.exists(PROXY_FILE):
        try:
            with open(PROXY_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except (json.JSONDecodeError, IOError):
            pass
    return []


def save_proxies(proxies):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(PROXY_FILE, 'w', encoding='utf-8') as f:
        json.dump(proxies, f, ensure_ascii=False, indent=2)


def save_stats(stats_data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    stats_data['last_run'] = datetime.now(timezone.utc).isoformat()
    existing = {}
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    existing.update(stats_data)
    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)


# ============================================
# Channel Processing (Parallel)
# ============================================

def process_channel(channel_url, existing_ids, existing_urls):
    channel_name = channel_url.split('/')[-1]
    new_proxies = []
    
    try:
        messages = fetch_channel_messages(channel_url)
        
        if not messages:
            with _lock:
                stats['channels_failed'] += 1
            return new_proxies
        
        with _lock:
            stats['channels_checked'] += 1
            stats['total_messages_scraped'] += len(messages)
        
        channel_proxies = []
        for msg in messages:
            extracted = extract_proxies_from_text(msg)
            channel_proxies.extend(extracted)
        
        if not channel_proxies:
            return new_proxies
        
        unique_proxies = list(set(channel_proxies))
        
        for url in unique_proxies:
            proxy_id = generate_proxy_id(url)
            
            with _lock:
                if proxy_id in existing_ids or url in existing_urls:
                    stats['proxies_duplicate'] += 1
                    continue
                existing_ids.add(proxy_id)
                existing_urls.add(url)
            
            proxy_type = detect_proxy_type(url)
            is_alive, latency = ping_proxy(url, proxy_type)
            
            with _lock:
                if is_alive:
                    stats['proxies_alive'] += 1
                else:
                    stats['proxies_dead'] += 1
                stats['proxies_new'] += 1
            
            proxy_entry = {
                "id": proxy_id,
                "url": url,
                "type": proxy_type,
                "source": channel_name,
                "added_at": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                "last_check": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                "status": "active" if is_alive else "dead",
                "latency_ms": latency if is_alive else None
            }
            
            new_proxies.append(proxy_entry)
        
        if new_proxies:
            alive_count = sum(1 for p in new_proxies if p['status'] == 'active')
            print(f"   ✅ @{channel_name}: {len(new_proxies)} new ({alive_count} alive)")
        
    except Exception as e:
        with _lock:
            stats['channels_failed'] += 1
        print(f"   ❌ @{channel_name}: {str(e)[:80]}")
    
    return new_proxies


# ============================================
# Main
# ============================================

def main():
    global stats
    
    print("=" * 60)
    print("🔍 Proxy Finder — Telegram Channel Scraper")
    print(f"   Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   Channels: {len(CHANNELS)} | Workers: {MAX_WORKERS}")
    print("=" * 60)
    
    existing_proxies = load_existing_proxies()
    existing_ids = {p['id'] for p in existing_proxies}
    existing_urls = {p['url'] for p in existing_proxies}
    
    print(f"📦 Existing proxies: {len(existing_proxies)}")
    
    stats = {
        'channels_checked': 0,
        'channels_failed': 0,
        'total_messages_scraped': 0,
        'proxies_new': 0,
        'proxies_duplicate': 0,
        'proxies_alive': 0,
        'proxies_dead': 0,
        'runs': 0
    }
    
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, 'r', encoding='utf-8') as f:
                old_stats = json.load(f)
                stats['runs'] = old_stats.get('runs', 0) + 1
        except:
            stats['runs'] = 1
    else:
        stats['runs'] = 1
    
    all_new_proxies = []
    start_time = time.time()
    
    # Parallel processing
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_channel, url, existing_ids, existing_urls): url
            for url in CHANNELS
        }
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            try:
                result = future.result()
                if result:
                    all_new_proxies.extend(result)
            except Exception as e:
                pass
            
            if completed % 20 == 0:
                elapsed = time.time() - start_time
                print(f"\n📊 Progress: {completed}/{len(CHANNELS)} — {len(all_new_proxies)} new — {elapsed:.0f}s\n")
    
    elapsed = time.time() - start_time
    
    print(f"\n{'=' * 60}")
    print("📊 Final Processing")
    print(f"{'=' * 60}")
    print(f"   Time: {elapsed:.1f}s")
    print(f"   New proxies: {len(all_new_proxies)}")
    print(f"   Duplicates: {stats['proxies_duplicate']}")
    print(f"   Alive: {stats['proxies_alive']} | Dead: {stats['proxies_dead']}")
    
    final_proxies = all_new_proxies + existing_proxies
    
    if len(final_proxies) > MAX_PROXIES:
        removed = len(final_proxies) - MAX_PROXIES
        final_proxies = final_proxies[:MAX_PROXIES]
        print(f"   Trimmed: {removed} old proxies (limit: {MAX_PROXIES})")
    
    final_proxies.sort(
        key=lambda x: (0 if x['status'] == 'active' else 1, x.get('added_at', '')),
        reverse=False
    )
    
    save_proxies(final_proxies)
    save_stats(stats)
    
    print(f"\n✅ Saved: {len(final_proxies)} proxies to {PROXY_FILE}")
    print(f"   Active: {sum(1 for p in final_proxies if p['status'] == 'active')}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
