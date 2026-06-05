"""
KHASHAYAR.ONE
Proxy Intelligence Engine

Main Entry Point

Responsibilities:
- Safe execution wrapper
- CLI / CI compatibility
- Pipeline bootstrap
- Error containment layer
- Logging gateway

This is the ONLY file that should be executed directly.
Everything else is orchestrated through pipeline/runner.py
"""

from __future__ import annotations

import sys
import traceback
import time

from scripts.core.storage import ensure_directories

from scripts.pipeline.runner import run_pipeline


# ==========================================================
# LOGGING LAYER
# ==========================================================


def log_info(message: str):
    print(f"[INFO] {message}")


def log_error(message: str):
    print(f"[ERROR] {message}")


def log_success(message: str):
    print(f"[SUCCESS] {message}")


# ==========================================================
# SAFE EXECUTION WRAPPER
# ==========================================================


def safe_run():
    """
    Wraps pipeline execution with fault isolation.
    """

    try:

        log_info("Initializing KHASHAYAR.ONE Engine...")

        ensure_directories()

        start = time.time()

        state = run_pipeline()

        duration = round(time.time() - start, 2)

        log_success("Pipeline execution completed")

        log_info(
            f"Duration: {duration} sec"
        )

        log_info(
            f"Active proxies: {state.stats.get('active_proxies')}"
        )

        log_info(
            f"Total URLs processed: {state.stats.get('total_urls')}"
        )

        return 0

    except Exception as e:

        log_error("Fatal pipeline error occurred")

        log_error(str(e))

        traceback.print_exc()

        return 1


# ==========================================================
# CLI ENTRY
# ==========================================================


def cli():
    """
    CLI entrypoint for local or CI execution.
    """

    return safe_run()


# ==========================================================
# MAIN ENTRY
# ==========================================================


if __name__ == "__main__":

    exit_code = cli()

    sys.exit(exit_code)
