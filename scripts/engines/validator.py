"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Validation Engine

Responsibilities:
- URL validation
- Protocol validation
- Endpoint validation
- Port validation
- Data sanitization
- Duplicate protection helpers

Rules:
- No networking
- No filesystem access
- No scraping
"""

from __future__ import annotations

import re
import hashlib
from urllib.parse import urlparse

from scripts.core.config import (
    SUPPORTED_PROTOCOLS,
)

# ==========================================================
# CONSTANTS
# ==========================================================

MIN_URL_LENGTH = 12

MAX_URL_LENGTH = 10000

VALID_PORT_MIN = 1

VALID_PORT_MAX = 65535

# ==========================================================
# PROTOCOL DETECTION
# ==========================================================


def detect_protocol(url: str) -> str:
    """
    Detect supported protocol type.
    """

    if not url:
        return "unknown"

    value = url.lower()

    if value.startswith("vless://"):
        return "vless"

    if value.startswith("vmess://"):
        return "vmess"

    if value.startswith("trojan://"):
        return "trojan"

    if value.startswith("ss://"):
        return "shadowsocks"

    if value.startswith("tg://proxy"):
        return "mtproto"

    if "t.me/proxy" in value:
        return "mtproto"

    return "unknown"


# ==========================================================
# BASIC SANITIZATION
# ==========================================================


def sanitize_url(url: str) -> str:
    """
    Normalize extracted URLs.
    """

    if not isinstance(url, str):
        return ""

    cleaned = url.strip()

    cleaned = cleaned.rstrip(
        ".,;:!?)\"]}'"
    )

    cleaned = cleaned.replace(
        "\n",
        ""
    )

    cleaned = cleaned.replace(
        "\r",
        ""
    )

    return cleaned


# ==========================================================
# URL VALIDATION
# ==========================================================


def is_reasonable_length(
    url: str
) -> bool:

    return (
        MIN_URL_LENGTH
        <= len(url)
        <= MAX_URL_LENGTH
    )


def validate_protocol(
    url: str
) -> bool:

    protocol = detect_protocol(url)

    return (
        protocol
        in SUPPORTED_PROTOCOLS
    )


def validate_url(
    url: str
) -> bool:
    """
    High-level URL validation.
    """

    if not url:
        return False

    url = sanitize_url(url)

    if not is_reasonable_length(url):
        return False

    if not validate_protocol(url):
        return False

    return True


# ==========================================================
# MTProto VALIDATION
# ==========================================================


def validate_mtproto_url(
    url: str
) -> bool:
    """
    Validate tg://proxy links.
    """

    value = url.lower()

    if (
        not value.startswith("tg://proxy")
        and "t.me/proxy" not in value
    ):
        return False

    if "server=" not in value:
        return False

    if "port=" not in value:
        return False

    return True


# ==========================================================
# VMESS VALIDATION
# ==========================================================


def validate_vmess_url(
    url: str
) -> bool:
    """
    Lightweight VMESS validation.
    """

    if not url.startswith("vmess://"):
        return False

    payload = url[8:]

    return len(payload) > 20


# ==========================================================
# VLESS VALIDATION
# ==========================================================


def validate_vless_url(
    url: str
) -> bool:
    """
    Lightweight VLESS validation.
    """

    if not url.startswith("vless://"):
        return False

    return "@" in url


# ==========================================================
# TROJAN VALIDATION
# ==========================================================


def validate_trojan_url(
    url: str
) -> bool:
    """
    Lightweight Trojan validation.
    """

    if not url.startswith("trojan://"):
        return False

    return "@" in url


# ==========================================================
# SHADOWSOCKS VALIDATION
# ==========================================================


def validate_shadowsocks_url(
    url: str
) -> bool:
    """
    Lightweight Shadowsocks validation.
    """

    return url.startswith("ss://")


# ==========================================================
# ADVANCED URL VALIDATION
# ==========================================================


def validate_proxy_url(
    url: str
) -> bool:
    """
    Protocol-aware validation.
    """

    if not validate_url(url):
        return False

    protocol = detect_protocol(url)

    if protocol == "mtproto":
        return validate_mtproto_url(url)

    if protocol == "vmess":
        return validate_vmess_url(url)

    if protocol == "vless":
        return validate_vless_url(url)

    if protocol == "trojan":
        return validate_trojan_url(url)

    if protocol == "shadowsocks":
        return validate_shadowsocks_url(url)

    return False


# ==========================================================
# HOST VALIDATION
# ==========================================================


def validate_host(
    host: str
) -> bool:
    """
    Validate hostname or IP.
    """

    if not host:
        return False

    host = host.strip()

    if len(host) < 2:
        return False

    return True


# ==========================================================
# PORT VALIDATION
# ==========================================================


def validate_port(
    port
) -> bool:

    try:

        value = int(port)

        return (
            VALID_PORT_MIN
            <= value
            <= VALID_PORT_MAX
        )

    except Exception:
        return False


# ==========================================================
# ENDPOINT VALIDATION
# ==========================================================


def validate_endpoint(
    host,
    port
) -> bool:

    return (
        validate_host(host)
        and validate_port(port)
    )


# ==========================================================
# DUPLICATE PROTECTION
# ==========================================================


def generate_proxy_id(
    url: str
) -> str:
    """
    Stable proxy identifier.
    """

    return hashlib.sha256(
        url.encode("utf-8")
    ).hexdigest()[:12]


def is_duplicate(
    proxy_id: str,
    known_ids: set
) -> bool:

    return proxy_id in known_ids


# ==========================================================
# URL EXTRA CLEANUP
# ==========================================================


def normalize_url(
    url: str
) -> str:
    """
    Canonical normalization.
    """

    url = sanitize_url(url)

    url = re.sub(
        r"\s+",
        "",
        url
    )

    return url


# ==========================================================
# BATCH VALIDATION
# ==========================================================


def filter_valid_urls(
    urls: list[str]
) -> list[str]:
    """
    Return only valid URLs.
    """

    valid = []

    for url in urls:

        normalized = normalize_url(
            url
        )

        if validate_proxy_url(
            normalized
        ):
            valid.append(
                normalized
            )

    return valid


# ==========================================================
# VALIDATION REPORT
# ==========================================================


def validation_report(
    urls: list[str]
) -> dict:
    """
    Useful for diagnostics.
    """

    total = len(urls)

    valid = len(
        filter_valid_urls(urls)
    )

    invalid = total - valid

    return {
        "total": total,
        "valid": valid,
        "invalid": invalid,
        "success_rate": (
            round(
                (valid / total) * 100,
                2
            )
            if total
            else 0
        ),
    }
