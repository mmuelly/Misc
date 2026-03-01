"""Integration tests for all HTTP endpoints using the FastAPI TestClient."""

from datetime import date
from unittest.mock import MagicMock, patch, call

import pytest
from starlette.testclient import TestClient

import agent

TODAY = str(date.today())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fresh_state(burned=0.0, beers=0):
    return {"date": TODAY, "total_burned": burned, "beers_earned": beers}


# Patch out all external I/O so endpoint tests are hermetic
EXTERNAL_IO = {
    "load_state": patch("agent.load_state", return_value=fresh_state()),
    "save_state": patch("agent.save_state"),
    "generate_message": patch("agent.generate_message", return_value="Time for a beer!"),
    "send_notification": patch("agent.send_notification"),
}


def patched(**overrides):
    """Context manager that patches external I/O, allowing selective overrides."""
    from contextlib import ExitStack
    stack = ExitStack()
    mocks = {}
    patches = {
        "load_state": patch("agent.load_state", return_value=fresh_state()),
        "save_state": patch("agent.save_state"),
        "generate_message": patch("agent.generate_message", return_value="Time for a beer!"),
        "send_notification": patch("agent.send_notification"),
        **overrides,
    }
    for name, p in patches.items():
        mocks[name] = stack.enter_context(p)
    return stack, mocks


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

class TestRoot:
    def test_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_returns_message_field(self, client):
        resp = client.get("/")
        assert "message" in resp.json()


# ---------------------------------------------------------------------------
# GET /status
# ---------------------------------------------------------------------------

class TestStatus:
    def test_returns_200(self, client):
        state = fresh_state(burned=150.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280}):
            resp = client.get("/status")
        assert resp.status_code == 200

    def test_response_structure(self, client):
        state = fresh_state(burned=150.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280}):
            data = client.get("/status").json()
        assert set(data.keys()) >= {"date", "total_burned_today", "beers_earned_today",
                                     "calories_until_next_beer", "ipa_calories"}

    def test_reflects_burn_and_beers(self, client):
        state = fresh_state(burned=560.0, beers=2)
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280}):
            data = client.get("/status").json()
        assert data["total_burned_today"] == 560.0
        assert data["beers_earned_today"] == 2

    def test_remaining_calories_calculation(self, client):
        state = fresh_state(burned=150.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280}):
            data = client.get("/status").json()
        assert data["calories_until_next_beer"] == pytest.approx(130.0)

    def test_remaining_calories_zero_burn(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280}):
            data = client.get("/status").json()
        assert data["calories_until_next_beer"] == 280

    def test_remaining_calories_after_full_beer(self, client):
        state = fresh_state(burned=280.0, beers=1)
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280}):
            data = client.get("/status").json()
        # 280 % 280 == 0 → remaining should equal one full IPA
        assert data["calories_until_next_beer"] == pytest.approx(280.0)


# ---------------------------------------------------------------------------
# POST /health-update — threshold logic
# ---------------------------------------------------------------------------

class TestHealthUpdate:
    def test_below_threshold_returns_ok(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            resp = client.post("/health-update", json={"active_calories": 100.0})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_below_threshold_reports_remaining_calories(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 100.0}).json()
        assert data["calories_until_next_beer"] == pytest.approx(180.0)

    def test_first_beer_threshold_sends_notification(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch("agent.generate_message", return_value="Cheers!") as gen, \
             patch("agent.send_notification") as notif, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            resp = client.post("/health-update", json={"active_calories": 280.0})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "notification_sent"
        assert data["beers_earned"] == 1
        gen.assert_called_once_with(1, 280.0, 280)
        notif.assert_called_once()

    def test_notification_title_includes_beer_number(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch("agent.generate_message", return_value="Cheers!"), \
             patch("agent.send_notification") as notif, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            client.post("/health-update", json={"active_calories": 280.0})
        title = notif.call_args[1]["title"]
        assert "1" in title

    def test_second_beer_threshold_sends_notification(self, client):
        state = fresh_state(burned=280.0, beers=1)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch("agent.generate_message", return_value="Another one!"), \
             patch("agent.send_notification") as notif, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            resp = client.post("/health-update", json={"active_calories": 560.0})
        assert resp.json()["beers_earned"] == 2
        notif.assert_called_once()

    def test_multi_threshold_jump_sends_one_notification(self, client):
        """Jumping from 0 to 840 cal (3 beers) in one update sends exactly one notification."""
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch("agent.generate_message", return_value="Wow!"), \
             patch("agent.send_notification") as notif, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 840.0}).json()
        assert data["beers_earned"] == 3
        notif.assert_called_once()  # one notification, for the highest count earned

    def test_update_does_not_send_notification_when_no_new_threshold(self, client):
        state = fresh_state(burned=100.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch("agent.send_notification") as notif, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            client.post("/health-update", json={"active_calories": 200.0})
        notif.assert_not_called()

    def test_state_is_saved_when_no_threshold_crossed(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state") as save, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            client.post("/health-update", json={"active_calories": 100.0})
        save.assert_called_once()

    def test_state_is_saved_when_threshold_crossed(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state") as save, \
             patch("agent.generate_message", return_value="!"), \
             patch("agent.send_notification"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            client.post("/health-update", json={"active_calories": 280.0})
        save.assert_called_once()
        saved_state = save.call_args[0][0]
        assert saved_state["beers_earned"] == 1

    def test_notification_body_is_generated_message(self, client):
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch("agent.generate_message", return_value="Custom message here"), \
             patch("agent.send_notification") as notif, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 280.0}).json()
        assert data["message"] == "Custom message here"
        notif_body = notif.call_args[1]["body"]
        assert notif_body == "Custom message here"


# ---------------------------------------------------------------------------
# POST /health-update — stale reading guard
# ---------------------------------------------------------------------------

class TestStaleReadingGuard:
    def test_stale_reading_small_drop_is_ignored(self, client):
        state = fresh_state(burned=500.0, beers=1)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state") as save, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 460.0}).json()
        assert data["status"] == "ignored"
        save.assert_not_called()

    def test_stale_reading_boundary_49_ignored(self, client):
        state = fresh_state(burned=500.0, beers=1)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state") as save, \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 451.0}).json()
        assert data["status"] == "ignored"

    def test_reading_drop_of_exactly_50_is_not_ignored(self, client):
        """A drop of ≥50 cal is treated as a valid new-day reset, not stale."""
        state = fresh_state(burned=500.0, beers=1)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 450.0}).json()
        assert data["status"] != "ignored"

    def test_higher_reading_is_never_ignored(self, client):
        state = fresh_state(burned=100.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            data = client.post("/health-update", json={"active_calories": 101.0}).json()
        assert data["status"] != "ignored"


# ---------------------------------------------------------------------------
# POST /health-update — API key auth
# ---------------------------------------------------------------------------

class TestApiKeyAuth:
    def test_no_key_configured_accepts_without_header(self, client):
        state = fresh_state()
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            resp = client.post("/health-update", json={"active_calories": 50.0})
        assert resp.status_code == 200

    def test_key_required_missing_header_returns_401(self, client):
        state = fresh_state()
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": "my-secret"}):
            resp = client.post("/health-update", json={"active_calories": 50.0})
        assert resp.status_code == 401

    def test_key_required_wrong_key_returns_401(self, client):
        state = fresh_state()
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": "my-secret"}):
            resp = client.post(
                "/health-update",
                json={"active_calories": 50.0},
                headers={"Authorization": "Bearer wrong-key"},
            )
        assert resp.status_code == 401

    def test_key_required_correct_key_returns_200(self, client):
        state = fresh_state()
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": "my-secret"}):
            resp = client.post(
                "/health-update",
                json={"active_calories": 50.0},
                headers={"Authorization": "Bearer my-secret"},
            )
        assert resp.status_code == 200

    def test_status_endpoint_requires_no_auth(self, client):
        """GET /status is always unauthenticated."""
        state = fresh_state()
        with patch("agent.load_state", return_value=state), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": "my-secret"}):
            resp = client.get("/status")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /health-update — input validation
# ---------------------------------------------------------------------------

class TestInputValidation:
    def test_missing_active_calories_returns_422(self, client):
        resp = client.post("/health-update", json={"timestamp": "2026-01-01T00:00:00"})
        assert resp.status_code == 422

    def test_non_numeric_active_calories_returns_422(self, client):
        resp = client.post("/health-update", json={"active_calories": "a lot"})
        assert resp.status_code == 422

    def test_empty_body_returns_422(self, client):
        resp = client.post("/health-update", json={})
        assert resp.status_code == 422

    def test_optional_timestamp_accepted(self, client):
        state = fresh_state()
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            resp = client.post(
                "/health-update",
                json={"active_calories": 50.0, "timestamp": "2026-03-01T10:00:00"},
            )
        assert resp.status_code == 200

    def test_negative_calories_processed_as_stale_or_ok(self, client):
        """Negative calories won't crash the agent; stale guard or ok path handles it."""
        state = fresh_state(burned=0.0, beers=0)
        with patch("agent.load_state", return_value=state), \
             patch("agent.save_state"), \
             patch.dict(agent.CONFIG, {"ipa_calories": 280, "agent_api_key": ""}):
            resp = client.post("/health-update", json={"active_calories": -10.0})
        # Should not return 500
        assert resp.status_code == 200
