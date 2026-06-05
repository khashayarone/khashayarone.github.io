"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Central Configuration Registry

All project-wide constants, paths, limits,
weights, timeouts and metadata live here.

No business logic should be placed in this file.
"""

from pathlib import Path

# ==========================================================
# VERSION
# ==========================================================

ENGINE_NAME = "Proxy Intelligence Engine"

ENGINE_VERSION = "2.1.0"

ENGINE_AUTHOR = "KHASHAYAR.ONE"

# ==========================================================
# ROOT PATHS
# ==========================================================

ROOT_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = ROOT_DIR / "data"

PROXY_DIR = DATA_DIR / "proxy-finder"

SYSTEM_DIR = DATA_DIR / "system"

CACHE_DIR = DATA_DIR / "cache"

# ==========================================================
# OUTPUT FILES
# ==========================================================

PROXY_FILE = PROXY_DIR / "proxy.json"

FASTEST_FILE = PROXY_DIR / "fastest.json"

RECOMMENDATIONS_FILE = PROXY_DIR / "recommendations.json"

LEADERBOARD_FILE = PROXY_DIR / "leaderboard.json"

PROXY_STATS_FILE = PROXY_DIR / "stats.json"

SYSTEM_STATS_FILE = SYSTEM_DIR / "stats.json"

SYSTEM_HEALTH_FILE = SYSTEM_DIR / "health.json"

SYSTEM_FEED_FILE = SYSTEM_DIR / "feed.json"

# ==========================================================
# CACHE FILES
# ==========================================================

PROXY_HISTORY_FILE = CACHE_DIR / "proxy-history.json"

SOURCE_HISTORY_FILE = CACHE_DIR / "source-history.json"

TRUST_HISTORY_FILE = CACHE_DIR / "trust-history.json"

# ==========================================================
# TELEGRAM SOURCES
# ==========================================================

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

# ==========================================================
# SCRAPER SETTINGS
# ==========================================================

MESSAGES_PER_CHANNEL = 25

FETCH_TIMEOUT = 10

MAX_WORKERS = 20

USER_AGENT = (
    "Mozilla/5.0 "
    "(Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 "
    "(KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# ==========================================================
# NETWORK SETTINGS
# ==========================================================

PING_TIMEOUT = 2

DEFAULT_PORT = 443

# ==========================================================
# DATABASE SETTINGS
# ==========================================================

MAX_DATABASE_RECORDS = 1000

MAX_FASTEST_RECORDS = 50

MAX_RECOMMENDED_RECORDS = 50

MAX_FEED_RECORDS = 25

MAX_LEADERBOARD_RECORDS = 30

# ==========================================================
# CACHE RETENTION
# ==========================================================

HISTORY_RETENTION_DAYS = 90

# ==========================================================
# TRUST ENGINE WEIGHTS
# ==========================================================

LATENCY_WEIGHT = 40

UPTIME_WEIGHT = 30

FRESHNESS_WEIGHT = 15

SOURCE_WEIGHT = 15

# ==========================================================
# COLLECTION LIMITS
# ==========================================================

FAST_THRESHOLD_MS = 150

ULTRA_FAST_THRESHOLD_MS = 80

# ==========================================================
# SUPPORTED PROTOCOLS
# ==========================================================

SUPPORTED_PROTOCOLS = {
    "vless",
    "vmess",
    "trojan",
    "shadowsocks",
    "mtproto",
}

# ==========================================================
# EXTRACTION PATTERNS
# ==========================================================

PROXY_PATTERNS = [
    r"(tg://proxy\?[^\s<>'\"]+)",
    r"(https?://t\.me/proxy\?[^\s<>'\"]+)",
    r"(vless://[^\s<>'\"]+)",
    r"(vmess://[^\s<>'\"]+)",
    r"(trojan://[^\s<>'\"]+)",
    r"(ss://[^\s<>'\"]+)",
]

# ==========================================================
# HEALTH STATUS
# ==========================================================

STATUS_ACTIVE = "active"

STATUS_DEAD = "dead"

STATUS_UNKNOWN = "unknown"

# ==========================================================
# DIRECTORY REGISTRY
# ==========================================================

REQUIRED_DIRECTORIES = [
    DATA_DIR,
    PROXY_DIR,
    SYSTEM_DIR,
    CACHE_DIR,
]

# ==========================================================
# JSON METADATA
# ==========================================================

JSON_METADATA = {
    "engine": ENGINE_NAME,
    "version": ENGINE_VERSION,
}
