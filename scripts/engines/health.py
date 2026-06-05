"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Health Engine

Responsibilities:
- TCP connectivity testing
- Latency measurement
- Endpoint health classification
- Bulk health scanning
- Runtime telemetry

Rules:
- No filesystem access
- No scraping
- No trust calculations
- No history management
"""

from __future__ import annotations

import socket
import time

from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)

from scripts.core.config import (
    MAX_WORKERS,
    PING_TIMEOUT,
    STATUS_ACTIVE,
    STATUS_DEAD,
    STATUS_UNKNOWN,
    FAST_THRESHOLD_MS,
    ULTRA_FAST_THRESHOLD_MS,
)

from scripts.engines.validator import (
    validate_endpoint,
)

# ==========================================================
# LATENCY CLASSIFICATION
# ==========================================================


def latency_tier(
    latency_ms: int | None
) -> str:

    if latency_ms is None:
        return "unknown"

    if latency_ms <= ULTRA_FAST_THRESHOLD_MS:
        return "ultra"

    if latency_ms <= FAST_THRESHOLD_MS:
        return "fast"

    if latency_ms <= 500:
        return "normal"

    return "slow"


# ==========================================================
# TCP CHECK
# ==========================================================


def tcp_ping(
    host: str,
    port: int,
    timeout: int = PING_TIMEOUT,
):
    """
    Low-level TCP connectivity test.

    Returns:
        (
            is_alive,
            latency_ms
        )
    """

    if not validate_endpoint(
        host,
        port
    ):
        return False, None

    sock = None

    try:

        start = time.perf_counter()

        sock = socket.socket(
            socket.AF_INET,
            socket.SOCK_STREAM
        )

        sock.settimeout(
            timeout
        )

        result = sock.connect_ex(
            (
                host,
                port
            )
        )

        latency = int(
            (
                time.perf_counter()
                - start
            ) * 1000
        )

        return (
            result == 0,
            latency
        )

    except Exception:

        return (
            False,
            None
        )

    finally:

        if sock:

            try:
                sock.close()
            except Exception:
                pass


# ==========================================================
# HEALTH CLASSIFICATION
# ==========================================================


def classify_status(
    is_alive: bool
) -> str:

    return (
        STATUS_ACTIVE
        if is_alive
        else STATUS_DEAD
    )


# ==========================================================
# ENDPOINT HEALTH
# ==========================================================


def endpoint_health(
    host: str,
    port: int,
) -> dict:
    """
    Full endpoint health payload.
    """

    alive, latency = tcp_ping(
        host,
        port
    )

    return {
        "host": host,
        "port": port,
        "alive": alive,
        "status":
            classify_status(
                alive
            ),
        "latency_ms":
            latency,
        "latency_tier":
            latency_tier(
                latency
            ),
    }


# ==========================================================
# PROXY HEALTH
# ==========================================================


def proxy_health(
    proxy_id: str,
    host: str,
    port: int,
) -> dict:
    """
    Health payload tied to proxy.
    """

    result = endpoint_health(
        host,
        port
    )

    result["id"] = proxy_id

    return result


# ==========================================================
# BULK HEALTH
# ==========================================================


def bulk_health_scan(
    endpoints: list[dict]
) -> list[dict]:
    """
    Concurrent health checks.

    Input:

    [
        {
            "id":"abc",
            "host":"1.1.1.1",
            "port":443
        }
    ]
    """

    results = []

    if not endpoints:
        return results

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        futures = []

        for item in endpoints:

            future = executor.submit(
                proxy_health,
                item.get("id"),
                item.get("host"),
                item.get("port"),
            )

            futures.append(
                future
            )

        for future in as_completed(
            futures
        ):

            try:

                results.append(
                    future.result()
                )

            except Exception:

                continue

    return results


# ==========================================================
# AGGREGATION
# ==========================================================


def count_active(
    results: list[dict]
) -> int:

    return sum(
        1
        for item in results
        if item.get("alive")
    )


def count_dead(
    results: list[dict]
) -> int:

    return sum(
        1
        for item in results
        if not item.get("alive")
    )


def average_latency(
    results: list[dict]
):
    values = [
        item["latency_ms"]
        for item in results
        if item.get(
            "latency_ms"
        ) is not None
    ]

    if not values:
        return None

    return round(
        sum(values)
        / len(values),
        2
    )


# ==========================================================
# HEALTH REPORT
# ==========================================================


def health_report(
    results: list[dict]
) -> dict:

    total = len(results)

    active = count_active(
        results
    )

    dead = count_dead(
        results
    )

    avg_latency = average_latency(
        results
    )

    return {
        "total": total,
        "active": active,
        "dead": dead,
        "average_latency":
            avg_latency,
        "success_rate":
            round(
                (
                    active
                    / total
                ) * 100,
                2
            )
            if total
            else 0,
    }


# ==========================================================
# FAST COLLECTIONS
# ==========================================================


def fastest_records(
    records: list[dict],
    limit: int = 50
) -> list[dict]:

    eligible = [
        r
        for r in records
        if r.get(
            "latency_ms"
        ) is not None
    ]

    eligible.sort(
        key=lambda x:
        x["latency_ms"]
    )

    return eligible[:limit]


def ultra_fast_records(
    records: list[dict]
) -> list[dict]:

    return [
        r
        for r in records
        if (
            r.get(
                "latency_ms"
            ) is not None
            and
            r["latency_ms"]
            <= ULTRA_FAST_THRESHOLD_MS
        )
    ]


# ==========================================================
# HEALTH DIAGNOSTICS
# ==========================================================


def health_engine_status() -> dict:

    return {
        "engine": "health",
        "timeout":
            PING_TIMEOUT,
        "workers":
            MAX_WORKERS,
        "status":
            "healthy",
    }
