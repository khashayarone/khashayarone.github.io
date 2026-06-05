"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Domain Models

Single source of truth for all project entities.

Rules:
- No I/O
- No networking
- No filesystem access
- No business logic

Only data structures and serialization helpers.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any


# ==========================================================
# PROXY RECORD
# ==========================================================

@dataclass
class ProxyRecord:
    """
    Main proxy object stored in proxy.json
    """

    id: str

    url: str

    protocol: str

    source: str

    status: str

    latency_ms: Optional[int] = None

    trust_score: int = 0

    trust_grade: str = "C"

    source_score: int = 0

    uptime_score: int = 0

    freshness_score: int = 0

    first_seen: str = ""

    last_seen: str = ""

    seen_count: int = 1

    alive_count: int = 0

    dead_count: int = 0

    country: Optional[str] = None

    tags: List[str] = field(default_factory=list)

    is_fast: bool = False

    is_recommended: bool = False

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# SOURCE RECORD
# ==========================================================

@dataclass
class SourceRecord:
    """
    Telegram channel reputation profile
    """

    source: str

    total_found: int = 0

    total_active: int = 0

    total_dead: int = 0

    success_rate: float = 0.0

    reputation_score: int = 0

    first_seen: str = ""

    last_seen: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# HISTORY RECORD
# ==========================================================

@dataclass
class HistoryRecord:
    """
    Long-term proxy memory object
    """

    id: str

    first_seen: str

    last_seen: str

    seen_count: int = 1

    alive_count: int = 0

    dead_count: int = 0

    best_latency_ms: Optional[int] = None

    worst_latency_ms: Optional[int] = None

    average_latency_ms: Optional[int] = None

    uptime_score: int = 0

    trust_score: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# FEED EVENT
# ==========================================================

@dataclass
class FeedEvent:
    """
    Activity feed item
    """

    id: str

    type: str

    title: str

    description: str

    timestamp: str

    severity: str = "info"

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# SYSTEM HEALTH
# ==========================================================

@dataclass
class SystemHealth:
    """
    System health snapshot
    """

    status: str

    active_configs: int

    inactive_configs: int

    channels_checked: int

    channels_failed: int

    generated_at: str

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# SYSTEM STATS
# ==========================================================

@dataclass
class SystemStats:
    """
    Frontend statistics contract
    """

    configs: int

    sources: int

    active_configs: int

    inactive_configs: int

    generated_at: str

    version: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# PROXY STATS
# ==========================================================

@dataclass
class ProxyStats:
    """
    Detailed engine telemetry
    """

    channels_checked: int = 0

    channels_failed: int = 0

    total_messages_scraped: int = 0

    proxies_new: int = 0

    proxies_duplicate: int = 0

    proxies_alive: int = 0

    proxies_dead: int = 0

    generated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# COLLECTION PAYLOAD
# ==========================================================

@dataclass
class CollectionPayload:
    """
    Generic frontend collection format
    """

    name: str

    generated_at: str

    total: int

    items: List[Dict[str, Any]]

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==========================================================
# JSON DOCUMENT
# ==========================================================

@dataclass
class JsonDocument:
    """
    Standardized JSON wrapper

    Used by publisher layer to ensure
    consistent metadata across all outputs.
    """

    version: str

    generated_at: str

    total: int

    data: Any

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
