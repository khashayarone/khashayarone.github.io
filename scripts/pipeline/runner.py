"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Pipeline Runner (Orchestration Layer)

Responsibilities:
- Full pipeline orchestration
- Engine execution order control
- Data flow coordination
- Extraction → Validation → Parsing → Health → History → Reputation → Publishing
- Runtime telemetry aggregation
- Failure isolation per stage

IMPORTANT:
This is the MAIN CONTROL UNIT of the system.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from scripts.core.config import (
    MAX_WORKERS,
)

from scripts.core.storage import (
    ensure_directories,
)

from scripts.engines.extractor import (
    extract_all_channels,
    extraction_stats,
    build_source_payloads,
)

from scripts.engines.validator import (
    generate_proxy_id,
)

from scripts.engines.parser import (
    extract_endpoint,
    parse_proxy,
)

from scripts.engines.health import (
    bulk_health_scan,
    health_report,
)

from scripts.engines.history import (
    load_history,
    update_from_health_scan,
    optimize_history,
    save_history,
)

from scripts.engines.reputation import (
    enrich_many,
)

from scripts.publishers.contracts import (
    build_contracts,
    publish_to_github_pages,
)

# ==========================================================
# PIPELINE STATE
# ==========================================================


class PipelineState:

    def __init__(self):

        self.raw_extractions = []
        self.payloads = []
        self.endpoints = []
        self.health_results = []
        self.history = {}
        self.contracts = None

        self.stats = {
            "start_time": None,
            "end_time": None,
            "duration_sec": None,
            "channels_processed": 0,
            "total_urls": 0,
            "active_proxies": 0,
            "dead_proxies": 0,
        }


# ==========================================================
# STEP 1 — EXTRACTION
# ==========================================================


def step_extract():
    """
    Extract from Telegram channels.
    """

    results = extract_all_channels()

    stats = extraction_stats(results)

    payloads = build_source_payloads(results)

    return results, stats, payloads


# ==========================================================
# STEP 2 — ENDPOINT BUILDING
# ==========================================================


def step_build_endpoints(payloads: list[dict]) -> list[dict]:

    endpoints = []

    for item in payloads:

        url = item.get("url")

        host, port = extract_endpoint(url)

        if not host or not port:
            continue

        endpoints.append(
            {
                "id": generate_proxy_id(url),
                "url": url,
                "host": host,
                "port": port,
                "source": item.get("source"),
            }
        )

    return endpoints


# ==========================================================
# STEP 3 — HEALTH CHECK
# ==========================================================


def step_health(endpoints: list[dict]):

    return bulk_health_scan(endpoints)


# ==========================================================
# STEP 4 — HISTORY UPDATE
# ==========================================================


def step_history(history: dict, health_results: list[dict]):

    updated = update_from_health_scan(
        history,
        health_results,
    )

    optimized = optimize_history(updated)

    save_history(optimized)

    return optimized


# ==========================================================
# STEP 5 — REPUTATION ENRICHMENT
# ==========================================================


def step_reputation(history: dict):

    return enrich_many(list(history.values()))


# ==========================================================
# STEP 6 — PUBLISHING
# ==========================================================


def step_publish(
    endpoints: list[dict],
    history: dict,
    sources_checked: int,
):

    contracts = build_contracts(
        proxies=endpoints,
        history=history,
        sources_checked=sources_checked,
    )

    publish_to_github_pages(contracts)

    return contracts


# ==========================================================
# MAIN PIPELINE
# ==========================================================


def run_pipeline() -> PipelineState:
    """
    Full system execution.
    """

    ensure_directories()

    state = PipelineState()
    state.stats["start_time"] = time.time()

    # STEP 1
    results, stats, payloads = step_extract()

    state.raw_extractions = results
    state.payloads = payloads

    # STEP 2
    endpoints = step_build_endpoints(payloads)
    state.endpoints = endpoints

    # STEP 3
    health_results = step_health(endpoints)
    state.health_results = health_results

    # STEP 4
    history = load_history()
    history = step_history(history, health_results)
    state.history = history

    # STEP 5 (optional enrichment)
    reputation = step_reputation(history)

    # STEP 6
    contracts = step_publish(
        endpoints=endpoints,
        history=history,
        sources_checked=stats["channels"],
    )

    state.contracts = contracts

    # FINAL STATS
    state.stats["end_time"] = time.time()
    state.stats["duration_sec"] = round(
        state.stats["end_time"]
        - state.stats["start_time"],
        2,
    )

    state.stats["channels_processed"] = stats["channels"]
    state.stats["total_urls"] = stats["urls"]

    active = [
        h
        for h in history.values()
        if h.get("alive_count", 0) > 0
    ]

    state.stats["active_proxies"] = len(active)

    dead = [
        h
        for h in history.values()
        if h.get("dead_count", 0) > 0
    ]

    state.stats["dead_proxies"] = len(dead)

    return state


# ==========================================================
# BATCH RUNNER (FOR GITHUB ACTIONS)
# ==========================================================


def run():
    """
    Entry point for CI/CD.
    """

    state = run_pipeline()

    print(
        "Pipeline completed in",
        state.stats["duration_sec"],
        "seconds"
    )

    print(
        "Active proxies:",
        state.stats["active_proxies"]
    )

    print(
        "Total URLs:",
        state.stats["total_urls"]
    )


# ==========================================================
# SAFETY ENTRY
# ==========================================================


if __name__ == "__main__":
    run()
