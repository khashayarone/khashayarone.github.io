"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Parser Engine

Responsibilities:
- Protocol detection
- Endpoint extraction
- VMESS decode
- MTProto parsing
- VLESS parsing
- Trojan parsing
- Shadowsocks parsing
- Normalized endpoint contracts

Rules:
- No networking
- No filesystem access
- No scraping
"""

from __future__ import annotations

import json
import base64
import re

from urllib.parse import (
    urlparse,
    parse_qs,
)

from scripts.core.config import (
    DEFAULT_PORT,
)

from scripts.engines.validator import (
    detect_protocol,
)

# ==========================================================
# BASE64 HELPERS
# ==========================================================


def safe_b64_decode(
    value: str
) -> str:
    """
    Safe Base64 decoder.
    """

    try:

        value += "=" * (
            (
                4 - len(value) % 4
            ) % 4
        )

        decoded = base64.b64decode(
            value
        )

        return decoded.decode(
            "utf-8",
            errors="ignore"
        )

    except Exception:
        return ""


# ==========================================================
# COMMON HELPERS
# ==========================================================


def safe_int(
    value,
    default=None
):
    try:
        return int(value)
    except Exception:
        return default


# ==========================================================
# VMESS
# ==========================================================


def parse_vmess(
    url: str
) -> dict:
    """
    Parse VMESS config.
    """

    try:

        payload = url[8:]

        decoded = safe_b64_decode(
            payload
        )

        data = json.loads(
            decoded
        )

        host = data.get("add")

        port = safe_int(
            data.get("port"),
            DEFAULT_PORT
        )

        return {
            "protocol": "vmess",
            "host": host,
            "port": port,
            "name": data.get("ps"),
            "network": data.get("net"),
            "tls": data.get("tls"),
            "raw": data,
        }

    except Exception:

        return {
            "protocol": "vmess",
            "host": None,
            "port": None,
            "raw": {},
        }


# ==========================================================
# MTProto
# ==========================================================


def parse_mtproto(
    url: str
) -> dict:
    """
    Parse tg://proxy
    Parse t.me/proxy
    """

    try:

        if url.startswith(
            "https://t.me/proxy"
        ):
            parsed = urlparse(url)
            params = parse_qs(
                parsed.query
            )

            host = (
                params.get(
                    "server",
                    [None]
                )[0]
            )

            port = safe_int(
                params.get(
                    "port",
                    [DEFAULT_PORT]
                )[0]
            )

        else:

            host_match = re.search(
                r"server=([^&]+)",
                url
            )

            port_match = re.search(
                r"port=(\d+)",
                url
            )

            host = (
                host_match.group(1)
                if host_match
                else None
            )

            port = (
                safe_int(
                    port_match.group(1)
                )
                if port_match
                else None
            )

        return {
            "protocol": "mtproto",
            "host": host,
            "port": port,
            "raw": {},
        }

    except Exception:

        return {
            "protocol": "mtproto",
            "host": None,
            "port": None,
            "raw": {},
        }


# ==========================================================
# VLESS
# ==========================================================


def parse_vless(
    url: str
) -> dict:
    """
    Parse VLESS endpoint.
    """

    try:

        parsed = urlparse(url)

        return {
            "protocol": "vless",
            "host": parsed.hostname,
            "port": parsed.port,
            "username": parsed.username,
            "name": parsed.fragment,
            "raw": {},
        }

    except Exception:

        return {
            "protocol": "vless",
            "host": None,
            "port": None,
            "raw": {},
        }


# ==========================================================
# TROJAN
# ==========================================================


def parse_trojan(
    url: str
) -> dict:
    """
    Parse Trojan endpoint.
    """

    try:

        parsed = urlparse(url)

        return {
            "protocol": "trojan",
            "host": parsed.hostname,
            "port": parsed.port,
            "password": parsed.username,
            "name": parsed.fragment,
            "raw": {},
        }

    except Exception:

        return {
            "protocol": "trojan",
            "host": None,
            "port": None,
            "raw": {},
        }


# ==========================================================
# SHADOWSOCKS
# ==========================================================


def parse_shadowsocks(
    url: str
) -> dict:
    """
    Parse Shadowsocks endpoint.
    """

    try:

        content = url[5:]

        if "#" in content:
            content, name = content.split(
                "#",
                1
            )
        else:
            name = None

        host = None
        port = None

        endpoint_match = re.search(
            r"@([^:]+):(\d+)",
            content
        )

        if endpoint_match:

            host = endpoint_match.group(
                1
            )

            port = safe_int(
                endpoint_match.group(
                    2
                )
            )

        return {
            "protocol": "shadowsocks",
            "host": host,
            "port": port,
            "name": name,
            "raw": {},
        }

    except Exception:

        return {
            "protocol": "shadowsocks",
            "host": None,
            "port": None,
            "raw": {},
        }


# ==========================================================
# UNIVERSAL PARSER
# ==========================================================


def parse_proxy(
    url: str
) -> dict:
    """
    Main protocol dispatcher.
    """

    protocol = detect_protocol(
        url
    )

    if protocol == "vmess":
        return parse_vmess(url)

    if protocol == "mtproto":
        return parse_mtproto(url)

    if protocol == "vless":
        return parse_vless(url)

    if protocol == "trojan":
        return parse_trojan(url)

    if protocol == "shadowsocks":
        return parse_shadowsocks(
            url
        )

    return {
        "protocol": "unknown",
        "host": None,
        "port": None,
        "raw": {},
    }


# ==========================================================
# ENDPOINT EXTRACTION
# ==========================================================


def extract_endpoint(
    url: str
):
    """
    Returns:
    (host, port)
    """

    parsed = parse_proxy(
        url
    )

    return (
        parsed.get("host"),
        parsed.get("port"),
    )


# ==========================================================
# HEALTH COMPATIBILITY
# ==========================================================


def endpoint_payload(
    url: str
) -> dict:
    """
    Standardized endpoint object
    for health engine.
    """

    parsed = parse_proxy(
        url
    )

    return {
        "protocol":
            parsed.get(
                "protocol"
            ),
        "host":
            parsed.get(
                "host"
            ),
        "port":
            parsed.get(
                "port"
            ),
    }


# ==========================================================
# DIAGNOSTICS
# ==========================================================


def parser_health() -> dict:
    """
    Engine diagnostics.
    """

    return {
        "supported_protocols": [
            "vmess",
            "vless",
            "trojan",
            "shadowsocks",
            "mtproto",
        ],
        "status": "healthy",
    }
