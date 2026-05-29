#!/usr/bin/env python3
"""
Proxy Finder — Telegram Channel Scraper
Extracts proxy links from public Telegram channels,
deduplicates, validates, and maintains a clean proxy.json database.

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
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

# ============================================
# Configuration
# ============================================

# Telegram public channel preview URLs
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
    "https://t.me/s/NetAccount",
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

# Output paths
OUTPUT_DIR = "data/proxy-finder"
PROXY_FILE = f"{OUTPUT_DIR}/proxy.json"
STATS_FILE = f"{OUTPUT_DIR}/stats.json"

# Limits
MESSAGES_PER_CHANNEL = 20
MAX_PROXIES = 100
FETCH_TIMEOUT = 15  # seconds per channel
RETRY_COUNT = 2
DELAY_BETWEEN_CHANNELS = 2  # seconds

# Proxy URL patterns
PROXY_PATTERNS = [
    # MTProto / Telegram Proxy
    r'(tg://proxy\?[^\s<>"\']+)',
    r'(https?://t\.me/proxy\?[^\s<>"\']+)',
    
    # SOCKS5
    r'(socks5://[^\s<>"\']+)',
    
    # HTTP/HTTPS
    r'(https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5})',
    
    # V2Ray / XRay
    r'(vless://[^\s<>"\']+)',
    r'(vmess://[^\s<>"\']+)',
    r'(trojan://[^\s<>"\']+)',
    
    # Shadowsocks
    r'(ss://[^\s<>"\']+)',
    r'(ssr://[^\s<>"\']+)',
    
    # WireGuard
    r'(wg://[^\s<>"\']+)',
    r'(wireguard://[^\s<>"\']+)',
    
    # Hysteria
    r'(hysteria2?://[^\s<>"\']+)',
    r'(hy2://[^\s<>"\']+)',
    
    # Tuic
    r'(tuic://[^\s<>"\']+)',
]

# User-Agent rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
]


# ============================================
# Helper Functions
# ============================================

def get_random_ua():
    """Return a random User-Agent string."""
    return random.choice(USER_AGENTS)


def generate_proxy_id(url):
    """Generate a unique hash ID for a proxy URL."""
    return hashlib.sha256(url.encode()).hexdigest()[:12]


def detect_proxy_type(url):
    """Detect the type of proxy from its URL scheme."""
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
        parsed = urlparse(url_lower)
        if re.match(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', parsed.netloc.split(':')[0]):
            return 'http'
        return 'unknown'
    elif 'hysteria' in url_lower or url_lower.startswith('hy2://'):
        return 'hysteria'
    elif url_lower.startswith('tuic://'):
        return 'tuic'
    elif url_lower.startswith('wg://') or url_lower.startswith('wireguard://'):
        return 'wireguard'
    else:
        return 'unknown'


def extract_proxies_from_text(text):
    """Extract all proxy URLs from a text using regex patterns."""
    proxies = set()
    
    for pattern in PROXY_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            # Clean up the URL
            url = match.strip().rstrip('.,;:!?)"\'')
            if len(url) > 15:  # Minimum length for a valid proxy URL
                proxies.add(url)
    
    return list(proxies)


def ping_proxy(url, proxy_type, timeout=5):
    """
    Basic connectivity test for a proxy.
    Returns (is_alive, latency_ms)
    """
    try:
        if proxy_type in ('mtproto',):
            # MTProto — extract server and port
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
        
        elif proxy_type in ('http', 'socks5', 'vless', 'vmess', 'trojan', 'shadowsocks', 'shadowsocksr', 'hysteria', 'tuic', 'wireguard'):
            # Extract host and port
            parsed = urlparse(url)
            host = parsed.hostname
            port = parsed.port or {
                'http': 8080, 'socks5': 1080, 'vless': 443, 'vmess': 443,
                'trojan': 443, 'shadowsocks': 8388, 'shadowsocksr': 8388,
                'hysteria': 443, 'tuic': 443, 'wireguard': 51820
            }.get(proxy_type, 443)
            
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


def fetch_channel_messages(channel_url, max_messages=20):
    """
    Fetch recent messages from a public Telegram channel.
    Returns list of message text strings.
    """
    messages = []
    
    headers = {
        'User-Agent': get_random_ua(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    for attempt in range(RETRY_COUNT + 1):
        try:
            response = requests.get(channel_url, headers=headers, timeout=FETCH_TIMEOUT)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find message containers
            message_divs = soup.find_all('div', class_='tgme_widget_message_text')
            
            for div in message_divs[:max_messages]:
                text = div.get_text(separator=' ', strip=True)
                if text:
                    messages.append(text)
            
            break  # Success — exit retry loop
            
        except requests.RequestException as e:
            if attempt < RETRY_COUNT:
                time.sleep(3)
            else:
                print(f"⚠️  Failed to fetch {channel_url}: {e}")
    
    return messages


def load_existing_proxies():
    """Load existing proxy list from JSON file."""
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
    """Save proxy list to JSON file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(PROXY_FILE, 'w', encoding='utf-8') as f:
        json.dump(proxies, f, ensure_ascii=False, indent=2)


def save_stats(stats):
    """Save scraping statistics."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    stats['last_run'] = datetime.now(timezone.utc).isoformat()
    
    # Load existing stats
    existing = {}
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    
    # Merge stats
    existing.update(stats)
    
    # Save
    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)


# ============================================
# Main Scraping Logic
# ============================================

def main():
    print("=" * 60)
    print("🔍 Proxy Finder — Starting Telegram Channel Scrape")
    print(f"   Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   Channels: {len(CHANNELS)}")
    print("=" * 60)
    
    # Load existing proxies
    existing_proxies = load_existing_proxies()
    existing_ids = {p['id'] for p in existing_proxies}
    existing_urls = {p['url'] for p in existing_proxies}
    
    print(f"📦 Existing proxies in database: {len(existing_proxies)}")
    
    # Stats tracking
    stats = {
        'channels_checked': 0,
        'channels_failed': 0,
        'total_messages_scraped': 0,
        'proxies_found': 0,
        'proxies_new': 0,
        'proxies_duplicate': 0,
        'proxies_alive': 0,
        'proxies_dead': 0,
        'runs': 0
    }
    
    # Load existing runs count
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
    
    # Process each channel
    for i, channel_url in enumerate(CHANNELS, 1):
        channel_name = channel_url.split('/')[-1]
        print(f"\n📡 [{i}/{len(CHANNELS)}] Scanning: @{channel_name}")
        
        try:
            # Fetch messages
            messages = fetch_channel_messages(channel_url, MESSAGES_PER_CHANNEL)
            
            if not messages:
                stats['channels_failed'] += 1
                print(f"   ⚠️  No messages retrieved")
                continue
            
            stats['channels_checked'] += 1
            stats['total_messages_scraped'] += len(messages)
            print(f"   📨 Messages retrieved: {len(messages)}")
            
            # Extract proxies from all messages
            channel_proxies = []
            for msg in messages:
                extracted = extract_proxies_from_text(msg)
                channel_proxies.extend(extracted)
            
            if channel_proxies:
                print(f"   🔗 Raw proxies found: {len(channel_proxies)}")
                
                # Deduplicate within channel
                unique_proxies = list(set(channel_proxies))
                
                new_for_channel = 0
                for url in unique_proxies:
                    proxy_id = generate_proxy_id(url)
                    
                    # Skip if already exists
                    if proxy_id in existing_ids or url in existing_urls:
                        stats['proxies_duplicate'] += 1
                        continue
                    
                    proxy_type = detect_proxy_type(url)
                    
                    # Ping test
                    is_alive, latency = ping_proxy(url, proxy_type, timeout=5)
                    
                    if is_alive:
                        stats['proxies_alive'] += 1
                    else:
                        stats['proxies_dead'] += 1
                    
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
                    
                    all_new_proxies.append(proxy_entry)
                    existing_ids.add(proxy_id)
                    existing_urls.add(url)
                    new_for_channel += 1
                    stats['proxies_new'] += 1
                
                print(f"   ✅ New proxies added: {new_for_channel}")
                print(f"   🏓 Alive: {sum(1 for p in all_new_proxies[-new_for_channel:] if p['status'] == 'active')}")
            else:
                print(f"   ℹ️  No proxy links found")
            
        except Exception as e:
            stats['channels_failed'] += 1
            print(f"   ❌ Error: {e}")
        
        # Rate limiting between channels
        if i < len(CHANNELS):
            time.sleep(DELAY_BETWEEN_CHANNELS)
    
    # Merge: new proxies go to TOP, keep existing below, limit to MAX_PROXIES
    print(f"\n{'=' * 60}")
    print("📊 Final Processing")
    print(f"{'=' * 60}")
    print(f"   New proxies found: {len(all_new_proxies)}")
    print(f"   Duplicates skipped: {stats['proxies_duplicate']}")
    print(f"   Alive: {stats['proxies_alive']}")
    print(f"   Dead: {stats['proxies_dead']}")
    
    # Combine: new first, then existing
    final_proxies = all_new_proxies + existing_proxies
    
    # Trim to MAX_PROXIES
    if len(final_proxies) > MAX_PROXIES:
        removed = len(final_proxies) - MAX_PROXIES
        final_proxies = final_proxies[:MAX_PROXIES]
        print(f"   🗑️  Trimmed: {removed} old proxies removed (limit: {MAX_PROXIES})")
    
    # Sort: active first, then by added_at descending
    final_proxies.sort(
        key=lambda x: (
            0 if x['status'] == 'active' else 1,
            x.get('added_at', '')
        ),
        reverse=False
    )
    
    # Save
    save_proxies(final_proxies)
    save_stats(stats)
    
    print(f"\n✅ Proxy database updated: {len(final_proxies)} proxies saved to {PROXY_FILE}")
    print(f"   Active: {sum(1 for p in final_proxies if p['status'] == 'active')}")
    print(f"   Dead: {sum(1 for p in final_proxies if p['status'] == 'dead')}")
    print(f"📊 Stats saved to {STATS_FILE}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
