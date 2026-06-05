"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Storage Layer

Responsibilities:
- Directory bootstrap
- Safe JSON loading
- Atomic JSON writing
- Cache retention cleanup
- File existence management
- Corruption recovery

Rules:
- No scraping
- No trust calculations
- No network logic
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from scripts.core.config import (
    REQUIRED_DIRECTORIES,
    HISTORY_RETENTION_DAYS,
)

# ==========================================================
# TIME HELPERS
# ==========================================================


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso_datetime(value: str):
    try:
        return datetime.strptime(
            value,
            "%Y-%m-%dT%H:%M:%SZ"
        ).replace(
            tzinfo=timezone.utc
        )
    except Exception:
        return None


# ==========================================================
# DIRECTORY BOOTSTRAP
# ==========================================================


def ensure_directories() -> None:
    """
    Create all required project directories.
    Safe to call multiple times.
    """

    for directory in REQUIRED_DIRECTORIES:
        Path(directory).mkdir(
            parents=True,
            exist_ok=True
        )


# ==========================================================
# FILE HELPERS
# ==========================================================


def exists(path: Path) -> bool:
    return Path(path).exists()


def file_size(path: Path) -> int:
    try:
        return Path(path).stat().st_size
    except Exception:
        return 0


# ==========================================================
# JSON LOADER
# ==========================================================


def load_json(
    path: Path,
    default: Any
) -> Any:
    """
    Safe JSON loader.

    Returns default value if:
    - file missing
    - invalid json
    - read failure
    """

    try:

        if not path.exists():
            return default

        with open(
            path,
            "r",
            encoding="utf-8"
        ) as f:

            return json.load(f)

    except Exception:
        return default


# ==========================================================
# JSON VALIDATION
# ==========================================================


def is_json_serializable(
    value: Any
) -> bool:
    try:
        json.dumps(
            value,
            ensure_ascii=False
        )
        return True
    except Exception:
        return False


# ==========================================================
# ATOMIC WRITER
# ==========================================================


def atomic_write_json(
    path: Path,
    data: Any,
    indent: int = 2
) -> None:
    """
    Atomic write implementation.

    Process:

    temp file
      ->
    flush
      ->
    fsync
      ->
    replace

    Prevents broken JSON files
    if workflow crashes.
    """

    if not is_json_serializable(data):
        raise ValueError(
            f"JSON serialization failed: {path}"
        )

    target_dir = path.parent

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=target_dir,
        delete=False
    ) as tmp:

        json.dump(
            data,
            tmp,
            ensure_ascii=False,
            indent=indent
        )

        tmp.flush()

        os.fsync(
            tmp.fileno()
        )

        temp_name = tmp.name

    os.replace(
        temp_name,
        path
    )


# ==========================================================
# BULK WRITER
# ==========================================================


def write_documents(
    documents: Dict[Path, Any]
) -> None:
    """
    Atomic write multiple documents.
    """

    for path, payload in documents.items():
        atomic_write_json(
            path,
            payload
        )


# ==========================================================
# CACHE RETENTION
# ==========================================================


def cleanup_history_records(
    history_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Removes records older than
    retention policy.
    """

    if not isinstance(
        history_data,
        dict
    ):
        return {}

    cutoff = (
        datetime.now(timezone.utc)
        - timedelta(
            days=HISTORY_RETENTION_DAYS
        )
    )

    cleaned = {}

    for key, value in history_data.items():

        last_seen = value.get(
            "last_seen"
        )

        dt = parse_iso_datetime(
            last_seen
        )

        if not dt:
            continue

        if dt >= cutoff:
            cleaned[key] = value

    return cleaned


# ==========================================================
# CACHE ROTATION
# ==========================================================


def rotate_history_cache(
    path: Path
) -> int:
    """
    Loads cache,
    removes expired entries,
    rewrites cache.

    Returns:
        remaining records count
    """

    data = load_json(
        path,
        {}
    )

    cleaned = cleanup_history_records(
        data
    )

    atomic_write_json(
        path,
        cleaned
    )

    return len(cleaned)


# ==========================================================
# JSON DOCUMENT WRAPPER
# ==========================================================


def wrap_document(
    version: str,
    generated_at: str,
    data: Any,
    metadata: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Standardized output envelope.

    Example:

    {
      "version": "2.1.0",
      "generated_at": "...",
      "total": 123,
      "data": [...]
    }
    """

    metadata = metadata or {}

    total = 0

    if isinstance(data, list):
        total = len(data)

    elif isinstance(data, dict):
        total = len(data)

    return {
        "version": version,
        "generated_at": generated_at,
        "total": total,
        "data": data,
        "metadata": metadata
    }


# ==========================================================
# CORRUPTION GUARD
# ==========================================================


def ensure_json_file(
    path: Path,
    default_value: Any
) -> Any:
    """
    Creates missing file.

    Returns content.
    """

    if not path.exists():

        atomic_write_json(
            path,
            default_value
        )

        return default_value

    return load_json(
        path,
        default_value
    )


# ==========================================================
# HEALTH CHECK
# ==========================================================


def storage_health() -> dict:
    """
    Storage layer diagnostics.
    """

    return {
        "timestamp": utc_now_iso(),
        "directories": len(
            REQUIRED_DIRECTORIES
        ),
        "status": "healthy"
    }
