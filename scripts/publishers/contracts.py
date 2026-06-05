"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Contracts Publisher Layer

Responsibilities:
- Final data shaping for frontend
- GitHub Pages data contract generation
- Proxy dataset packaging
- System stats aggregation
- Feed generation
- UI-ready normalization

IMPORTANT:
This is the ONLY layer allowed to expose:
- data/proxy-finder/proxy.json
- data/proxy-finder/stats.json
- data/system/stats.json
- data/system/feed.json

Rules:
- No scraping
- No parsing
- No network calls
- No business logic (only shaping)
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from scripts.core.config import (
    PROXY_FILE,
    PROXY_STATS_FILE,
    SYSTEM_STATS_FILE,
    SYSTEM_FEED_FILE,
    ENGINE_VERSION,
)

from scripts.core.storage import (
    atomic_write_json,
    utc_now_iso,
    wrap_document,
)

from scripts.engines.reputation import (
    enrich_many,
    rank_records,
)

# ==========================================================
# PROXY NORMALIZATION
# ==========================================================


def normalize_proxy_record(
    record: dict,
    history_record: dict | None = None
) -> dict:
    """
    Final UI-ready proxy object.
    """

    base = {
        "id": record.get("id"),
        "url": record.get("url"),
        "type": record.get("type"),
        "source": record.get("source"),
        "status": record.get("status"),
        "latency_ms": record.get("latency_ms"),
    }

    # reputation enrichment (optional)
    if history_record:

        base.update(
            {
                "trust_score":
                    history_record.get(
                        "trust_score",
                        0
                    ),
                "grade":
                    history_record.get(
                        "grade",
                        "D"
                    ),
                "badge":
                    history_record.get(
                        "badge",
                        "experimental"
                    ),
            }
        )

    return base


# ==========================================================
# PROXY DATASET BUILDER
# ==========================================================


def build_proxy_dataset(
    proxies: list[dict],
    history: dict | None = None
) -> list[dict]:
    """
    Convert raw engine output to UI dataset.
    """

    history = history or {}

    dataset = []

    for p in proxies:

        hist = history.get(
            p.get("id")
        )

        dataset.append(
            normalize_proxy_record(
                p,
                hist
            )
        )

    return dataset


# ==========================================================
# SORTING LOGIC
# ==========================================================


def sort_proxies(
    proxies: list[dict]
) -> list[dict]:
    """
    UI sorting priority:
    1. active first
    2. lowest latency
    3. highest trust
    """

    def key(x):

        return (
            x.get(
                "status"
            ) == "active",
            -(x.get(
                "trust_score",
                0
            )),
            x.get(
                "latency_ms"
            )
            or 9999,
        )

    return sorted(
        proxies,
        key=key,
        reverse=True
    )


# ==========================================================
# SYSTEM STATS
# ==========================================================


def build_system_stats(
    proxies: list[dict],
    sources_checked: int,
) -> dict:

    active = [
        p
        for p in proxies
        if p.get("status") == "active"
    ]

    dead = len(proxies) - len(active)

    avg_latency = None

    latencies = [
        p.get("latency_ms")
        for p in active
        if p.get("latency_ms") is not None
    ]

    if latencies:
        avg_latency = round(
            sum(latencies)
            / len(latencies),
            2
        )

    return {
        "configs": len(active),
        "total": len(proxies),
        "dead": dead,
        "sources": sources_checked,
        "average_latency": avg_latency,
        "last_update": utc_now_iso(),
        "engine_version": ENGINE_VERSION,
    }


# ==========================================================
# FEED GENERATOR
# ==========================================================


def build_system_feed(
    active_count: int,
    sources_checked: int,
) -> list[dict]:

    now = datetime.now(
        timezone.utc
    ).strftime("%H:%M")

    return [
        {
            "id": f"sync-{now}",
            "title": "System Sync Completed",
            "description": (
                f"{active_count} active proxies synchronized"
            ),
            "timestamp": now,
            "type": "sync",
        },
        {
            "id": f"telemetry-{now}",
            "title": "Telemetry Scan Completed",
            "description": (
                f"{sources_checked} sources analyzed"
            ),
            "timestamp": now,
            "type": "system",
        },
    ]


# ==========================================================
# CONTRACT BUILDER
# ==========================================================


def build_contracts(
    proxies: list[dict],
    history: dict,
    sources_checked: int,
) -> dict:
    """
    Final output contract.
    """

    enriched_history = enrich_many(
        list(history.values())
    )

    enriched_map = {
        h["id"]: h
        for h in enriched_history
        if "id" in h
    }

    dataset = build_proxy_dataset(
        proxies,
        enriched_map
    )

    sorted_dataset = sort_proxies(
        dataset
    )

    system_stats = build_system_stats(
        sorted_dataset,
        sources_checked
    )

    feed = build_system_feed(
        system_stats["configs"],
        sources_checked,
    )

    return {
        "proxy_file": wrap_document(
            ENGINE_VERSION,
            utc_now_iso(),
            sorted_dataset,
        ),
        "stats_file": wrap_document(
            ENGINE_VERSION,
            utc_now_iso(),
            system_stats,
        ),
        "system_stats_file": wrap_document(
            ENGINE_VERSION,
            utc_now_iso(),
            system_stats,
        ),
        "feed_file": wrap_document(
            ENGINE_VERSION,
            utc_now_iso(),
            feed,
        ),
    }


# ==========================================================
# PUBLISHER (GITHUB PAGES OUTPUT)
# ==========================================================


def publish_to_github_pages(
    contracts: dict
) -> None:
    """
    Writes final JSON artifacts.

    GitHub Pages consumes only these files.
    """

    atomic_write_json(
        PROXY_FILE,
        contracts["proxy_file"]
    )

    atomic_write_json(
        PROXY_STATS_FILE,
        contracts["stats_file"]
    )

    atomic_write_json(
        SYSTEM_STATS_FILE,
        contracts["system_stats_file"]
    )

    atomic_write_json(
        SYSTEM_FEED_FILE,
        contracts["feed_file"]
    )


# ==========================================================
# HEALTH
# ==========================================================


def contracts_engine_status() -> dict:

    return {
        "engine": "contracts",
        "outputs": [
            str(PROXY_FILE),
            str(PROXY_STATS_FILE),
            str(SYSTEM_STATS_FILE),
            str(SYSTEM_FEED_FILE),
        ],
        "status": "healthy",
    }
