"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Reputation Engine

Responsibilities:
- Trust score calculation
- Reliability ranking
- Grade assignment
- Confidence scoring
- Source quality weighting
- Frontend badge generation

Rules:
- No scraping
- No networking
- No persistence
"""

from __future__ import annotations

from statistics import mean

# ==========================================================
# SCORING WEIGHTS
# ==========================================================

UPTIME_WEIGHT = 0.50

LATENCY_WEIGHT = 0.25

CONSISTENCY_WEIGHT = 0.15

LONGEVITY_WEIGHT = 0.10

MAX_SCORE = 100

# ==========================================================
# GRADE THRESHOLDS
# ==========================================================

GRADE_A = 85

GRADE_B = 70

GRADE_C = 50

# ==========================================================
# LATENCY SCORE
# ==========================================================


def latency_score(
    latency_ms
) -> int:
    """
    Convert latency into score.

    Lower latency = higher score.
    """

    if latency_ms is None:
        return 0

    if latency_ms <= 50:
        return 100

    if latency_ms <= 100:
        return 95

    if latency_ms <= 150:
        return 90

    if latency_ms <= 250:
        return 80

    if latency_ms <= 350:
        return 65

    if latency_ms <= 500:
        return 50

    if latency_ms <= 1000:
        return 30

    return 10


# ==========================================================
# UPTIME SCORE
# ==========================================================


def uptime_component(
    uptime_score
) -> int:

    if uptime_score is None:
        return 0

    return max(
        0,
        min(
            100,
            int(uptime_score)
        )
    )


# ==========================================================
# CONSISTENCY SCORE
# ==========================================================


def consistency_score(
    alive_count: int,
    dead_count: int,
) -> int:
    """
    Stability over time.
    """

    total = (
        alive_count
        + dead_count
    )

    if total == 0:
        return 0

    failure_ratio = (
        dead_count
        / total
    )

    score = (
        100
        - (failure_ratio * 100)
    )

    return round(score)


# ==========================================================
# LONGEVITY SCORE
# ==========================================================


def longevity_score(
    seen_count: int
) -> int:
    """
    Rewards repeatedly observed configs.
    """

    if seen_count >= 100:
        return 100

    if seen_count >= 75:
        return 90

    if seen_count >= 50:
        return 80

    if seen_count >= 25:
        return 70

    if seen_count >= 10:
        return 60

    if seen_count >= 5:
        return 40

    return 20


# ==========================================================
# TRUST SCORE
# ==========================================================


def trust_score(
    history_record: dict
) -> int:
    """
    Main trust calculation.
    """

    uptime = uptime_component(
        history_record.get(
            "uptime_score",
            0
        )
    )

    latency = latency_score(
        history_record.get(
            "average_latency_ms"
        )
    )

    consistency = consistency_score(
        history_record.get(
            "alive_count",
            0
        ),
        history_record.get(
            "dead_count",
            0
        ),
    )

    longevity = longevity_score(
        history_record.get(
            "seen_count",
            0
        )
    )

    score = (
        uptime * UPTIME_WEIGHT
        +
        latency * LATENCY_WEIGHT
        +
        consistency * CONSISTENCY_WEIGHT
        +
        longevity * LONGEVITY_WEIGHT
    )

    return round(
        min(
            MAX_SCORE,
            score
        )
    )


# ==========================================================
# GRADE SYSTEM
# ==========================================================


def trust_grade(
    score: int
) -> str:

    if score >= GRADE_A:
        return "A"

    if score >= GRADE_B:
        return "B"

    if score >= GRADE_C:
        return "C"

    return "D"


# ==========================================================
# BADGE SYSTEM
# ==========================================================


def trust_badge(
    score: int
) -> str:

    grade = trust_grade(
        score
    )

    if grade == "A":
        return "verified"

    if grade == "B":
        return "trusted"

    if grade == "C":
        return "average"

    return "experimental"


# ==========================================================
# SOURCE QUALITY
# ==========================================================


def source_confidence(
    total_records: int,
    active_records: int,
) -> int:
    """
    Channel confidence score.
    """

    if total_records <= 0:
        return 0

    return round(
        (
            active_records
            / total_records
        ) * 100
    )


# ==========================================================
# FRONTEND PAYLOAD
# ==========================================================


def reputation_payload(
    history_record: dict
) -> dict:

    score = trust_score(
        history_record
    )

    return {
        "trust_score":
            score,
        "grade":
            trust_grade(
                score
            ),
        "badge":
            trust_badge(
                score
            ),
    }


# ==========================================================
# ENRICH RECORD
# ==========================================================


def enrich_history_record(
    history_record: dict
) -> dict:
    """
    Adds trust data
    directly to record.
    """

    reputation = reputation_payload(
        history_record
    )

    history_record.update(
        reputation
    )

    return history_record


# ==========================================================
# BULK ENRICH
# ==========================================================


def enrich_many(
    history_records: list[dict]
) -> list[dict]:

    enriched = []

    for item in history_records:

        enriched.append(
            enrich_history_record(
                item
            )
        )

    return enriched


# ==========================================================
# SORTING
# ==========================================================


def rank_records(
    records: list[dict]
) -> list[dict]:
    """
    Highest trust first.
    """

    return sorted(
        records,
        key=lambda x: (
            x.get(
                "trust_score",
                0
            ),
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


# ==========================================================
# SOURCE RANKING
# ==========================================================


def rank_sources(
    source_stats: list[dict]
) -> list[dict]:

    return sorted(
        source_stats,
        key=lambda x:
        x.get(
            "confidence",
            0
        ),
        reverse=True,
    )


# ==========================================================
# SUMMARY
# ==========================================================


def reputation_summary(
    records: list[dict]
) -> dict:

    if not records:

        return {
            "average_score": 0,
            "top_grade": "N/A",
        }

    scores = [
        item.get(
            "trust_score",
            0
        )
        for item in records
    ]

    return {
        "average_score":
            round(
                mean(scores),
                2
            ),
        "top_grade":
            max(
                (
                    item.get(
                        "grade",
                        "D"
                    )
                    for item in records
                ),
                default="D"
            ),
    }


# ==========================================================
# HEALTH
# ==========================================================


def reputation_engine_status() -> dict:

    return {
        "engine": "reputation",
        "weights": {
            "uptime":
                UPTIME_WEIGHT,
            "latency":
                LATENCY_WEIGHT,
            "consistency":
                CONSISTENCY_WEIGHT,
            "longevity":
                LONGEVITY_WEIGHT,
        },
        "status":
            "healthy",
    }
