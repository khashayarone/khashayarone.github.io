"""
KHASHAYAR.ONE
Proxy Intelligence Engine

History Engine

Responsibilities:
- Historical proxy tracking
- First seen / last seen
- Uptime tracking
- Latency tracking
- Health trend aggregation
- Cache lifecycle management

Rules:
- No scraping
- No networking
- No trust scoring
"""

from __future__ import annotations

from statistics import mean

from scripts.core.config import (
    HISTORY_FILE,
    ENGINE_VERSION,
)

from scripts.core.storage import (
    load_json,
    atomic_write_json,
    utc_now_iso,
)

# ==========================================================
# LOAD / SAVE
# ==========================================================


def load_history() -> dict:
    """
    Load proxy history database.
    """

    return load_json(
        HISTORY_FILE,
        {}
    )


def save_history(
    history: dict
) -> None:
    """
    Persist history database.
    """

    atomic_write_json(
        HISTORY_FILE,
        history
    )


# ==========================================================
# RECORD CREATION
# ==========================================================


def create_history_record(
    proxy_id: str
) -> dict:
    """
    Initial record.
    """

    now = utc_now_iso()

    return {
        "id": proxy_id,
        "version": ENGINE_VERSION,
        "first_seen": now,
        "last_seen": now,
        "seen_count": 0,
        "alive_count": 0,
        "dead_count": 0,
        "uptime_score": 0,
        "best_latency_ms": None,
        "worst_latency_ms": None,
        "average_latency_ms": None,
        "latency_samples": [],
    }


# ==========================================================
# LATENCY HELPERS
# ==========================================================


def update_latency_metrics(
    record: dict,
    latency_ms
) -> None:

    if latency_ms is None:
        return

    samples = record.setdefault(
        "latency_samples",
        []
    )

    samples.append(
        latency_ms
    )

    # جلوگیری از رشد بی‌نهایت فایل
    if len(samples) > 50:
        samples[:] = samples[-50:]

    record[
        "best_latency_ms"
    ] = min(samples)

    record[
        "worst_latency_ms"
    ] = max(samples)

    record[
        "average_latency_ms"
    ] = round(
        mean(samples),
        2
    )


# ==========================================================
# UPTIME SCORE
# ==========================================================


def calculate_uptime_score(
    alive_count: int,
    dead_count: int,
) -> int:
    """
    0-100
    """

    total = (
        alive_count
        + dead_count
    )

    if total == 0:
        return 0

    return round(
        (
            alive_count
            / total
        ) * 100
    )


# ==========================================================
# UPDATE RECORD
# ==========================================================


def update_history_record(
    history: dict,
    proxy_id: str,
    alive: bool,
    latency_ms=None,
) -> dict:
    """
    Update historical state.
    """

    record = history.get(
        proxy_id
    )

    if not record:

        record = create_history_record(
            proxy_id
        )

        history[
            proxy_id
        ] = record

    record[
        "last_seen"
    ] = utc_now_iso()

    record[
        "seen_count"
    ] += 1

    if alive:

        record[
            "alive_count"
        ] += 1

    else:

        record[
            "dead_count"
        ] += 1

    update_latency_metrics(
        record,
        latency_ms
    )

    record[
        "uptime_score"
    ] = calculate_uptime_score(
        record[
            "alive_count"
        ],
        record[
            "dead_count"
        ],
    )

    return record


# ==========================================================
# BULK UPDATE
# ==========================================================


def update_from_health_scan(
    history: dict,
    health_results: list[dict],
) -> dict:
    """
    Bulk history update.
    """

    for item in health_results:

        update_history_record(
            history=history,
            proxy_id=item.get("id"),
            alive=item.get(
                "alive",
                False
            ),
            latency_ms=item.get(
                "latency_ms"
            ),
        )

    return history


# ==========================================================
# LOOKUPS
# ==========================================================


def get_history_record(
    history: dict,
    proxy_id: str,
):
    return history.get(
        proxy_id
    )


def seen_before(
    history: dict,
    proxy_id: str,
) -> bool:

    return (
        proxy_id
        in history
    )


# ==========================================================
# AGGREGATION
# ==========================================================


def history_statistics(
    history: dict
) -> dict:

    total = len(history)

    if total == 0:

        return {
            "records": 0,
            "average_uptime": 0,
        }

    uptimes = []

    for item in history.values():

        uptimes.append(
            item.get(
                "uptime_score",
                0
            )
        )

    return {
        "records": total,
        "average_uptime": round(
            mean(uptimes),
            2
        ),
    }


# ==========================================================
# TOP RECORDS
# ==========================================================


def most_reliable(
    history: dict,
    limit: int = 20,
) -> list[dict]:

    items = list(
        history.values()
    )

    items.sort(
        key=lambda x: (
            x.get(
                "uptime_score",
                0
            ),
            x.get(
                "seen_count",
                0
            ),
        ),
        reverse=True,
    )

    return items[:limit]


def longest_seen(
    history: dict,
    limit: int = 20,
) -> list[dict]:

    items = list(
        history.values()
    )

    items.sort(
        key=lambda x:
        x.get(
            "seen_count",
            0
        ),
        reverse=True,
    )

    return items[:limit]


# ==========================================================
# CLEANUP
# ==========================================================


def cleanup_latency_samples(
    history: dict,
    max_samples: int = 50,
) -> dict:
    """
    Hard cap latency arrays.
    """

    for item in history.values():

        samples = item.get(
            "latency_samples",
            []
        )

        if (
            len(samples)
            > max_samples
        ):

            item[
                "latency_samples"
            ] = samples[
                -max_samples:
            ]

    return history


# ==========================================================
# MAINTENANCE
# ==========================================================


def optimize_history(
    history: dict
) -> dict:

    return cleanup_latency_samples(
        history
    )


# ==========================================================
# HEALTH
# ==========================================================


def history_engine_status() -> dict:

    return {
        "engine": "history",
        "history_file":
            str(HISTORY_FILE),
        "status":
            "healthy",
    }
