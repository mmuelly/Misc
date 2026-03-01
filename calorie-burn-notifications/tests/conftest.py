"""Shared fixtures for the calorie burn agent test suite."""

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from starlette.testclient import TestClient

# Ensure the package root is importable when pytest is run from the
# calorie-burn-notifications/ directory.
sys.path.insert(0, str(Path(__file__).parent.parent))

import agent  # noqa: E402


# ---------------------------------------------------------------------------
# Module-global cleanup
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_gcs_globals():
    """Restore the module-level GCS singletons after every test."""
    orig_client = agent._gcs_client
    orig_bucket = agent._gcs_bucket
    yield
    agent._gcs_client = orig_client
    agent._gcs_bucket = orig_bucket


# ---------------------------------------------------------------------------
# State helpers
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_state_path(tmp_path):
    """Redirect STATE_PATH to a temp file for isolation."""
    state_file = tmp_path / "state.json"
    with patch.object(agent, "STATE_PATH", state_file):
        yield state_file


@pytest.fixture()
def today_state():
    """Return a fresh state dict dated today with some burn already recorded."""
    from datetime import date
    return {"date": str(date.today()), "total_burned": 100.0, "beers_earned": 0}


@pytest.fixture()
def yesterday_state():
    """Return a state dict dated yesterday (triggers daily reset)."""
    from datetime import date, timedelta
    return {
        "date": str(date.today() - timedelta(days=1)),
        "total_burned": 999.0,
        "beers_earned": 3,
    }


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

CLEAN_CONFIG = {
    "ipa_calories": 280,
    "ntfy_topic": "",
    "ntfy_server": "https://ntfy.sh",
    "anthropic_api_key": "",
    "state_file": "state.json",
    "port": 8765,
    "log_level": "INFO",
    "state_bucket": "",
    "agent_api_key": "",
}


@pytest.fixture()
def clean_config():
    """Patch agent.CONFIG with no external services configured."""
    with patch.dict(agent.CONFIG, CLEAN_CONFIG, clear=True):
        yield


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    return TestClient(agent.app)
