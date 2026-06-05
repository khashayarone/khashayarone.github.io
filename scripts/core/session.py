"""
KHASHAYAR.ONE
Proxy Intelligence Engine

HTTP Session Layer

Responsibilities:
- Shared requests session
- Connection pooling
- Retry strategy
- Default headers
- Transport configuration

Rules:
- No scraping logic
- No parsing logic
- No business logic
"""

from __future__ import annotations

import requests

from requests import Session
from requests.adapters import HTTPAdapter

try:
    from urllib3.util.retry import Retry
except ImportError:
    Retry = None

from scripts.core.config import (
    FETCH_TIMEOUT,
    USER_AGENT,
)

# ==========================================================
# CONSTANTS
# ==========================================================

DEFAULT_POOL_CONNECTIONS = 50

DEFAULT_POOL_MAXSIZE = 50

DEFAULT_RETRY_TOTAL = 3

DEFAULT_RETRY_BACKOFF = 0.5

DEFAULT_STATUS_FORCELIST = (
    429,
    500,
    502,
    503,
    504,
)

# ==========================================================
# HEADERS
# ==========================================================

DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": (
        "text/html,"
        "application/xhtml+xml,"
        "application/xml;q=0.9,"
        "*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Connection": "keep-alive",
}


# ==========================================================
# RETRY STRATEGY
# ==========================================================

def build_retry_strategy() -> Retry | None:
    """
    Build urllib3 retry policy.

    Handles:
    - Rate limiting
    - Temporary failures
    - Connection resets
    """

    if Retry is None:
        return None

    return Retry(
        total=DEFAULT_RETRY_TOTAL,
        read=DEFAULT_RETRY_TOTAL,
        connect=DEFAULT_RETRY_TOTAL,
        backoff_factor=DEFAULT_RETRY_BACKOFF,
        status_forcelist=DEFAULT_STATUS_FORCELIST,
        allowed_methods=[
            "GET",
            "HEAD",
        ],
        raise_on_status=False,
    )


# ==========================================================
# HTTP ADAPTER
# ==========================================================

def build_adapter() -> HTTPAdapter:
    """
    Shared connection pool adapter.
    """

    retry = build_retry_strategy()

    return HTTPAdapter(
        max_retries=retry,
        pool_connections=DEFAULT_POOL_CONNECTIONS,
        pool_maxsize=DEFAULT_POOL_MAXSIZE,
    )


# ==========================================================
# SESSION FACTORY
# ==========================================================

def create_session() -> Session:
    """
    Create optimized requests session.

    Features:
    - Keep-Alive
    - Retry
    - Connection Pooling
    """

    session = requests.Session()

    session.headers.update(
        DEFAULT_HEADERS
    )

    adapter = build_adapter()

    session.mount(
        "http://",
        adapter
    )

    session.mount(
        "https://",
        adapter
    )

    return session


# ==========================================================
# REQUEST HELPERS
# ==========================================================

def safe_get(
    session: Session,
    url: str,
    timeout: int = FETCH_TIMEOUT,
):
    """
    Safe GET request wrapper.

    Returns:
        requests.Response | None
    """

    try:

        response = session.get(
            url,
            timeout=timeout,
        )

        response.raise_for_status()

        return response

    except Exception:
        return None


def safe_text(
    session: Session,
    url: str,
    timeout: int = FETCH_TIMEOUT,
) -> str:
    """
    Return page text or empty string.
    """

    response = safe_get(
        session=session,
        url=url,
        timeout=timeout,
    )

    if not response:
        return ""

    try:
        return response.text
    except Exception:
        return ""


# ==========================================================
# SESSION HEALTH
# ==========================================================

def session_health() -> dict:
    """
    Diagnostics for monitoring.
    """

    return {
        "transport": "requests",
        "pool_connections":
            DEFAULT_POOL_CONNECTIONS,
        "pool_maxsize":
            DEFAULT_POOL_MAXSIZE,
        "retry_total":
            DEFAULT_RETRY_TOTAL,
        "status": "healthy",
    }


# ==========================================================
# GLOBAL SHARED SESSION
# ==========================================================

_SHARED_SESSION = None


def get_session() -> Session:
    """
    Singleton session instance.

    Entire engine uses one shared
    pooled session.
    """

    global _SHARED_SESSION

    if _SHARED_SESSION is None:
        _SHARED_SESSION = create_session()

    return _SHARED_SESSION


# ==========================================================
# CLEANUP
# ==========================================================

def close_session() -> None:
    """
    Close global session gracefully.
    """

    global _SHARED_SESSION

    if _SHARED_SESSION:

        try:
            _SHARED_SESSION.close()
        except Exception:
            pass

    _SHARED_SESSION = None
