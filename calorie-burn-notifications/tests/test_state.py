"""Tests for local-file and GCS state backends."""

import json
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest

import agent


TODAY = str(date.today())
YESTERDAY = str(date.today() - timedelta(days=1))
FRESH = {"date": TODAY, "total_burned": 0.0, "beers_earned": 0}


# ---------------------------------------------------------------------------
# Local backend
# ---------------------------------------------------------------------------

class TestLocalBackend:
    def test_fresh_state_when_no_file(self, tmp_state_path):
        state = agent._load_state_local()
        assert state["date"] == TODAY
        assert state["total_burned"] == 0.0
        assert state["beers_earned"] == 0

    def test_fresh_state_when_file_is_stale(self, tmp_state_path):
        stale = {"date": YESTERDAY, "total_burned": 500.0, "beers_earned": 2}
        tmp_state_path.write_text(json.dumps(stale))
        state = agent._load_state_local()
        assert state["date"] == TODAY
        assert state["total_burned"] == 0.0
        assert state["beers_earned"] == 0

    def test_loads_todays_state(self, tmp_state_path):
        saved = {"date": TODAY, "total_burned": 350.5, "beers_earned": 1}
        tmp_state_path.write_text(json.dumps(saved))
        state = agent._load_state_local()
        assert state["total_burned"] == 350.5
        assert state["beers_earned"] == 1

    def test_save_then_load_roundtrip(self, tmp_state_path):
        data = {"date": TODAY, "total_burned": 420.0, "beers_earned": 1}
        agent._save_state_local(data)
        loaded = agent._load_state_local()
        assert loaded == data

    def test_save_writes_valid_json(self, tmp_state_path):
        data = {"date": TODAY, "total_burned": 0.0, "beers_earned": 0}
        agent._save_state_local(data)
        raw = tmp_state_path.read_text()
        parsed = json.loads(raw)
        assert parsed["date"] == TODAY

    def test_load_state_routes_to_local_when_no_bucket(self, tmp_state_path):
        with patch.dict(agent.CONFIG, {"state_bucket": ""}):
            state = agent.load_state()
        assert state["date"] == TODAY

    def test_save_state_routes_to_local_when_no_bucket(self, tmp_state_path):
        data = {"date": TODAY, "total_burned": 100.0, "beers_earned": 0}
        with patch.dict(agent.CONFIG, {"state_bucket": ""}):
            agent.save_state(data)
        assert tmp_state_path.exists()
        assert json.loads(tmp_state_path.read_text())["total_burned"] == 100.0


# ---------------------------------------------------------------------------
# GCS backend
# ---------------------------------------------------------------------------

def _make_gcs_bucket(blob_data: dict | None = None, raise_on_load=False, raise_on_save=False):
    """Return a mock GCS bucket whose blob behaves as specified."""
    blob = MagicMock()

    if blob_data is None:
        blob.exists.return_value = False
    else:
        blob.exists.return_value = True
        if raise_on_load:
            blob.download_as_text.side_effect = Exception("GCS read error")
        else:
            blob.download_as_text.return_value = json.dumps(blob_data)

    if raise_on_save:
        blob.upload_from_string.side_effect = Exception("GCS write error")

    bucket = MagicMock()
    bucket.blob.return_value = blob
    return bucket, blob


class TestGCSBackend:
    def _with_bucket(self, bucket):
        return patch("agent._get_gcs_bucket", return_value=bucket)

    def test_fresh_state_when_blob_missing(self):
        bucket, _ = _make_gcs_bucket(blob_data=None)
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            state = agent._load_state_gcs()
        assert state["date"] == TODAY
        assert state["total_burned"] == 0.0

    def test_fresh_state_when_blob_is_stale(self):
        stale = {"date": YESTERDAY, "total_burned": 999.0, "beers_earned": 3}
        bucket, _ = _make_gcs_bucket(blob_data=stale)
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            state = agent._load_state_gcs()
        assert state["date"] == TODAY
        assert state["total_burned"] == 0.0

    def test_loads_todays_state_from_blob(self):
        saved = {"date": TODAY, "total_burned": 210.0, "beers_earned": 0}
        bucket, _ = _make_gcs_bucket(blob_data=saved)
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            state = agent._load_state_gcs()
        assert state["total_burned"] == 210.0

    def test_gcs_read_error_returns_fresh_state(self):
        bucket, _ = _make_gcs_bucket(blob_data={"date": TODAY}, raise_on_load=True)
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            state = agent._load_state_gcs()
        assert state["total_burned"] == 0.0

    def test_save_uploads_correct_json(self):
        bucket, blob = _make_gcs_bucket()
        data = {"date": TODAY, "total_burned": 560.0, "beers_earned": 2}
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            agent._save_state_gcs(data)
        blob.upload_from_string.assert_called_once()
        call_args = blob.upload_from_string.call_args
        uploaded = json.loads(call_args[0][0])
        assert uploaded["total_burned"] == 560.0
        assert uploaded["beers_earned"] == 2
        assert call_args[1]["content_type"] == "application/json"

    def test_save_uses_correct_blob_name(self):
        bucket, blob = _make_gcs_bucket()
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            agent._save_state_gcs({"date": TODAY, "total_burned": 0.0, "beers_earned": 0})
        bucket.blob.assert_called_with(agent._GCS_STATE_BLOB)

    def test_gcs_write_error_does_not_raise(self, caplog):
        bucket, _ = _make_gcs_bucket(raise_on_save=True)
        data = {"date": TODAY, "total_burned": 100.0, "beers_earned": 0}
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "test-bucket"}):
            agent._save_state_gcs(data)  # must not raise
        assert any("GCS save_state error" in r.message for r in caplog.records)

    def test_load_state_routes_to_gcs_when_bucket_set(self):
        saved = {"date": TODAY, "total_burned": 50.0, "beers_earned": 0}
        bucket, _ = _make_gcs_bucket(blob_data=saved)
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "my-bucket"}):
            state = agent.load_state()
        assert state["total_burned"] == 50.0

    def test_save_state_routes_to_gcs_when_bucket_set(self):
        bucket, blob = _make_gcs_bucket()
        data = {"date": TODAY, "total_burned": 300.0, "beers_earned": 1}
        with self._with_bucket(bucket), \
             patch.dict(agent.CONFIG, {"state_bucket": "my-bucket"}):
            agent.save_state(data)
        blob.upload_from_string.assert_called_once()
