"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Extractor Engine

Responsibilities:
- Telegram channel fetching
- HTML parsing
- Message extraction
- Proxy extraction
- Source attribution
- Validation integration
- Extraction telemetry

Rules:
- No trust calculations
- No history management
- No persistence
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from bs4 import BeautifulSoup

from scripts.core.config import (
    CHANNELS,
    MESSAGES_PER_CHANNEL,
    PROXY_PATTERNS,
)

from scripts.core.session import (
    get_session,
    safe_text,
)

from scripts.engines.validator import (
    filter_valid_urls,
)

# ==========================================================
# DATA MODELS
# ==========================================================


@dataclass
class ExtractionResult:
    source: str
    urls: list[str]
    messages_scanned: int
    success: bool


# ==========================================================
# INTERNAL HELPERS
# ==========================================================


def channel_name_from_url(
    url: str
) -> str:
    """
    Extract telegram channel name.
    """

    return (
        url.rstrip("/")
        .split("/")[-1]
    )


# ==========================================================
# HTML FETCHING
# ==========================================================


def fetch_channel_html(
    channel_url: str
) -> str:
    """
    Download telegram public page.
    """

    session = get_session()

    return safe_text(
        session=session,
        url=channel_url,
    )


# ==========================================================
# MESSAGE EXTRACTION
# ==========================================================


def extract_messages(
    html: str
) -> list[str]:
    """
    Extract message bodies from telegram page.
    """

    if not html:
        return []

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    blocks = soup.find_all(
        "div",
        class_="tgme_widget_message_text"
    )

    messages = []

    for block in blocks[
        :MESSAGES_PER_CHANNEL
    ]:

        try:

            text = block.get_text(
                separator=" ",
                strip=True
            )

            if text:
                messages.append(text)

        except Exception:
            continue

    return messages


# ==========================================================
# PROXY EXTRACTION
# ==========================================================


def extract_urls_from_text(
    text: str
) -> list[str]:
    """
    Extract raw proxy URLs using patterns.
    """

    found = set()

    for pattern in PROXY_PATTERNS:

        try:

            matches = re.findall(
                pattern,
                text,
                re.IGNORECASE
            )

            for item in matches:

                if item:
                    found.add(
                        item.strip()
                    )

        except Exception:
            continue

    return list(found)


def extract_urls_from_messages(
    messages: list[str]
) -> list[str]:
    """
    Extract URLs from message collection.
    """

    urls = []

    for message in messages:

        urls.extend(
            extract_urls_from_text(
                message
            )
        )

    return urls


# ==========================================================
# CHANNEL EXTRACTION
# ==========================================================


def extract_channel(
    channel_url: str
) -> ExtractionResult:
    """
    Complete extraction pipeline
    for one channel.
    """

    source = channel_name_from_url(
        channel_url
    )

    try:

        html = fetch_channel_html(
            channel_url
        )

        if not html:

            return ExtractionResult(
                source=source,
                urls=[],
                messages_scanned=0,
                success=False,
            )

        messages = extract_messages(
            html
        )

        urls = extract_urls_from_messages(
            messages
        )

        urls = filter_valid_urls(
            urls
        )

        urls = list(
            set(urls)
        )

        return ExtractionResult(
            source=source,
            urls=urls,
            messages_scanned=len(
                messages
            ),
            success=True,
        )

    except Exception:

        return ExtractionResult(
            source=source,
            urls=[],
            messages_scanned=0,
            success=False,
        )


# ==========================================================
# BULK EXTRACTION
# ==========================================================


def extract_all_channels() -> list[
    ExtractionResult
]:
    """
    Sequential extraction helper.

    Concurrency is handled
    later by main pipeline.
    """

    results = []

    for channel in CHANNELS:

        result = extract_channel(
            channel
        )

        results.append(
            result
        )

    return results


# ==========================================================
# AGGREGATION HELPERS
# ==========================================================


def total_messages(
    results: list[
        ExtractionResult
    ]
) -> int:

    return sum(
        r.messages_scanned
        for r in results
    )


def total_urls(
    results: list[
        ExtractionResult
    ]
) -> int:

    return sum(
        len(r.urls)
        for r in results
    )


def successful_channels(
    results: list[
        ExtractionResult
    ]
) -> int:

    return sum(
        1
        for r in results
        if r.success
    )


def failed_channels(
    results: list[
        ExtractionResult
    ]
) -> int:

    return sum(
        1
        for r in results
        if not r.success
    )


# ==========================================================
# SOURCE PAYLOADS
# ==========================================================


def build_source_payloads(
    results: list[
        ExtractionResult
    ]
) -> list[dict]:
    """
    Convert extraction results
    into normalized records.
    """

    payloads = []

    for result in results:

        for url in result.urls:

            payloads.append(
                {
                    "source":
                        result.source,
                    "url":
                        url,
                }
            )

    return payloads


# ==========================================================
# TELEMETRY
# ==========================================================


def extraction_stats(
    results: list[
        ExtractionResult
    ]
) -> dict:

    channels = len(results)

    success = successful_channels(
        results
    )

    failed = failed_channels(
        results
    )

    return {
        "channels":
            channels,
        "success":
            success,
        "failed":
            failed,
        "messages":
            total_messages(
                results
            ),
        "urls":
            total_urls(
                results
            ),
    }


# ==========================================================
# HEALTH
# ==========================================================


def extractor_health() -> dict:
    """
    Engine diagnostics.
    """

    return {
        "engine": "extractor",
        "supports": [
            "telegram",
            "html",
            "regex",
        ],
        "status": "healthy",
    }
