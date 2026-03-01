"""Tests for load_config() — env vars, config file, and precedence rules."""

import json
import os
from unittest.mock import mock_open, patch

import pytest

import agent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_no_file(**extra_env):
    """Call load_config() with no config file and optional env vars."""
    fake_path = type("P", (), {"exists": lambda self: False})()
    with patch.object(agent, "CONFIG_FILE", fake_path), \
         patch.dict(os.environ, extra_env, clear=False):
        # Remove any agent-related env vars that the test runner might expose
        scrubbed = {
            k: v for k, v in os.environ.items()
            if k not in {
                "IPA_CALORIES", "NTFY_TOPIC", "NTFY_SERVER", "ANTHROPIC_API_KEY",
                "STATE_FILE", "PORT", "LOG_LEVEL", "STATE_BUCKET", "AGENT_API_KEY",
            }
        }
        scrubbed.update(extra_env)
        with patch.dict(os.environ, scrubbed, clear=True):
            return agent.load_config()


# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

class TestDefaults:
    def test_ipa_calories_default(self):
        cfg = _load_no_file()
        assert cfg["ipa_calories"] == 280

    def test_ntfy_topic_default_empty(self):
        cfg = _load_no_file()
        assert cfg["ntfy_topic"] == ""

    def test_ntfy_server_default(self):
        cfg = _load_no_file()
        assert cfg["ntfy_server"] == "https://ntfy.sh"

    def test_anthropic_key_default_empty(self):
        cfg = _load_no_file()
        assert cfg["anthropic_api_key"] == ""

    def test_port_default(self):
        cfg = _load_no_file()
        assert cfg["port"] == 8765

    def test_state_bucket_default_empty(self):
        cfg = _load_no_file()
        assert cfg["state_bucket"] == ""

    def test_agent_api_key_default_empty(self):
        cfg = _load_no_file()
        assert cfg["agent_api_key"] == ""


# ---------------------------------------------------------------------------
# Config file overrides
# ---------------------------------------------------------------------------

class TestConfigFile:
    def _load_with_file(self, file_content: dict):
        raw = json.dumps(file_content)
        fake_path = type("P", (), {"exists": lambda self: True})()
        with patch.object(agent, "CONFIG_FILE", fake_path), \
             patch("builtins.open", mock_open(read_data=raw)), \
             patch.dict(os.environ, {}, clear=True):
            return agent.load_config()

    def test_file_overrides_ipa_calories(self):
        cfg = self._load_with_file({"ipa_calories": 320})
        assert cfg["ipa_calories"] == 320

    def test_file_overrides_ntfy_topic(self):
        cfg = self._load_with_file({"ntfy_topic": "my-topic"})
        assert cfg["ntfy_topic"] == "my-topic"

    def test_file_overrides_port(self):
        cfg = self._load_with_file({"port": 9000})
        assert cfg["port"] == 9000

    def test_file_partial_override_keeps_defaults(self):
        cfg = self._load_with_file({"ntfy_topic": "beer-alerts"})
        assert cfg["ipa_calories"] == 280  # default preserved
        assert cfg["ntfy_topic"] == "beer-alerts"


# ---------------------------------------------------------------------------
# Environment variable overrides
# ---------------------------------------------------------------------------

class TestEnvVarOverrides:
    def test_env_overrides_ipa_calories(self):
        cfg = _load_no_file(IPA_CALORIES="350")
        assert cfg["ipa_calories"] == 350

    def test_env_overrides_ntfy_topic(self):
        cfg = _load_no_file(NTFY_TOPIC="env-topic")
        assert cfg["ntfy_topic"] == "env-topic"

    def test_env_overrides_anthropic_key(self):
        cfg = _load_no_file(ANTHROPIC_API_KEY="sk-ant-test")
        assert cfg["anthropic_api_key"] == "sk-ant-test"

    def test_env_overrides_state_bucket(self):
        cfg = _load_no_file(STATE_BUCKET="my-bucket")
        assert cfg["state_bucket"] == "my-bucket"

    def test_env_overrides_agent_api_key(self):
        cfg = _load_no_file(AGENT_API_KEY="secret-key-123")
        assert cfg["agent_api_key"] == "secret-key-123"

    def test_port_env_var_parsed_as_int(self):
        cfg = _load_no_file(PORT="8080")
        assert cfg["port"] == 8080
        assert isinstance(cfg["port"], int)

    def test_ipa_calories_env_parsed_as_int(self):
        cfg = _load_no_file(IPA_CALORIES="310")
        assert isinstance(cfg["ipa_calories"], int)

    def test_port_env_takes_precedence_over_config_file(self):
        """PORT env var is applied after the general loop — always wins."""
        raw = json.dumps({"port": 9999})
        fake_path = type("P", (), {"exists": lambda self: True})()
        with patch.object(agent, "CONFIG_FILE", fake_path), \
             patch("builtins.open", mock_open(read_data=raw)), \
             patch.dict(os.environ, {"PORT": "8080"}, clear=True):
            cfg = agent.load_config()
        assert cfg["port"] == 8080
