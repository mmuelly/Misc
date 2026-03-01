"""Tests for generate_message() and send_notification()."""

from unittest.mock import MagicMock, patch

import pytest

import agent


# ---------------------------------------------------------------------------
# generate_message
# ---------------------------------------------------------------------------

class TestGenerateMessage:
    def test_no_api_key_returns_fallback(self):
        with patch.dict(agent.CONFIG, {"anthropic_api_key": ""}):
            msg = agent.generate_message(beers_earned=1, total_burned=280, ipa_cal=280)
        assert "1" in msg
        assert len(msg) > 0

    def test_fallback_contains_beer_number(self):
        with patch.dict(agent.CONFIG, {"anthropic_api_key": ""}):
            msg = agent.generate_message(beers_earned=3, total_burned=840, ipa_cal=280)
        assert "3" in msg

    def test_fallback_contains_calorie_count(self):
        with patch.dict(agent.CONFIG, {"anthropic_api_key": ""}):
            msg = agent.generate_message(beers_earned=2, total_burned=560.0, ipa_cal=280)
        assert "560" in msg

    def test_with_api_key_calls_claude_and_returns_response(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="  You earned a cold one, champion!  ")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            msg = agent.generate_message(beers_earned=1, total_burned=280, ipa_cal=280)

        assert msg == "You earned a cold one, champion!"
        mock_client.messages.create.assert_called_once()

    def test_claude_call_uses_correct_model(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Cheers!")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            agent.generate_message(beers_earned=1, total_burned=280, ipa_cal=280)

        call_kwargs = mock_client.messages.create.call_args[1]
        assert call_kwargs["model"] == "claude-sonnet-4-6"

    def test_claude_api_error_returns_fallback(self):
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API error")

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            msg = agent.generate_message(beers_earned=2, total_burned=560, ipa_cal=280)

        # Should return fallback, not raise
        assert "2" in msg or "560" in msg

    def test_ordinal_suffix_1st(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="ok")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            agent.generate_message(beers_earned=1, total_burned=280, ipa_cal=280)

        prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
        assert "1st" in prompt

    def test_ordinal_suffix_2nd(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="ok")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            agent.generate_message(beers_earned=2, total_burned=560, ipa_cal=280)

        prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
        assert "2nd" in prompt

    def test_ordinal_suffix_3rd(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="ok")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_client.messages.create.return_value = mock_response

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            agent.generate_message(beers_earned=3, total_burned=840, ipa_cal=280)

        prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
        assert "3rd" in prompt

    def test_ordinal_suffix_4th_and_beyond(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="ok")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch.dict(agent.CONFIG, {"anthropic_api_key": "sk-ant-test"}), \
             patch("agent.anthropic.Anthropic", return_value=mock_client):
            agent.generate_message(beers_earned=4, total_burned=1120, ipa_cal=280)

        prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
        assert "4th" in prompt


# ---------------------------------------------------------------------------
# send_notification
# ---------------------------------------------------------------------------

class TestSendNotification:
    def test_no_topic_skips_http_call(self, caplog):
        with patch.dict(agent.CONFIG, {"ntfy_topic": "", "ntfy_server": "https://ntfy.sh"}), \
             patch("agent.httpx.post") as mock_post:
            agent.send_notification("Title", "Body")
        mock_post.assert_not_called()

    def test_no_topic_logs_warning(self, caplog):
        with patch.dict(agent.CONFIG, {"ntfy_topic": "", "ntfy_server": "https://ntfy.sh"}):
            agent.send_notification("Title", "Body")
        assert any("ntfy_topic not configured" in r.message for r in caplog.records)

    def test_with_topic_posts_to_correct_url(self):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        with patch.dict(agent.CONFIG, {"ntfy_topic": "my-topic", "ntfy_server": "https://ntfy.sh"}), \
             patch("agent.httpx.post", return_value=mock_resp) as mock_post:
            agent.send_notification("Title", "Body")
        mock_post.assert_called_once()
        url = mock_post.call_args[0][0]
        assert url == "https://ntfy.sh/my-topic"

    def test_with_topic_sends_correct_title_header(self):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        with patch.dict(agent.CONFIG, {"ntfy_topic": "my-topic", "ntfy_server": "https://ntfy.sh"}), \
             patch("agent.httpx.post", return_value=mock_resp) as mock_post:
            agent.send_notification("IPA #1 Unlocked!", "You earned it")
        headers = mock_post.call_args[1]["headers"]
        assert headers["Title"] == "IPA #1 Unlocked!"

    def test_with_topic_sends_body_as_bytes(self):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        with patch.dict(agent.CONFIG, {"ntfy_topic": "my-topic", "ntfy_server": "https://ntfy.sh"}), \
             patch("agent.httpx.post", return_value=mock_resp) as mock_post:
            agent.send_notification("Title", "Hello world")
        content = mock_post.call_args[1]["content"]
        assert content == b"Hello world"

    def test_http_exception_does_not_propagate(self, caplog):
        with patch.dict(agent.CONFIG, {"ntfy_topic": "my-topic", "ntfy_server": "https://ntfy.sh"}), \
             patch("agent.httpx.post", side_effect=Exception("network error")):
            agent.send_notification("Title", "Body")  # must not raise
        assert any("Failed to send" in r.message for r in caplog.records)

    def test_non_2xx_response_does_not_propagate(self, caplog):
        import httpx as _httpx
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = _httpx.HTTPStatusError(
            "403", request=MagicMock(), response=MagicMock()
        )
        with patch.dict(agent.CONFIG, {"ntfy_topic": "my-topic", "ntfy_server": "https://ntfy.sh"}), \
             patch("agent.httpx.post", return_value=mock_resp):
            agent.send_notification("Title", "Body")  # must not raise
        assert any("Failed to send" in r.message for r in caplog.records)

    def test_custom_ntfy_server_used_in_url(self):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        with patch.dict(agent.CONFIG, {"ntfy_topic": "t", "ntfy_server": "https://self.hosted.example.com"}), \
             patch("agent.httpx.post", return_value=mock_resp) as mock_post:
            agent.send_notification("T", "B")
        url = mock_post.call_args[0][0]
        assert url.startswith("https://self.hosted.example.com/")


# ---------------------------------------------------------------------------
# _check_api_key
# ---------------------------------------------------------------------------

class TestCheckApiKey:
    def test_no_key_configured_always_passes(self):
        with patch.dict(agent.CONFIG, {"agent_api_key": ""}):
            agent._check_api_key(None)  # no exception
            agent._check_api_key("Bearer wrong")  # no exception either

    def test_missing_header_raises_401(self):
        from fastapi import HTTPException
        with patch.dict(agent.CONFIG, {"agent_api_key": "secret"}):
            with pytest.raises(HTTPException) as exc:
                agent._check_api_key(None)
        assert exc.value.status_code == 401

    def test_wrong_bearer_prefix_raises_401(self):
        from fastapi import HTTPException
        with patch.dict(agent.CONFIG, {"agent_api_key": "secret"}):
            with pytest.raises(HTTPException) as exc:
                agent._check_api_key("Token secret")
        assert exc.value.status_code == 401

    def test_wrong_key_raises_401(self):
        from fastapi import HTTPException
        with patch.dict(agent.CONFIG, {"agent_api_key": "secret"}):
            with pytest.raises(HTTPException) as exc:
                agent._check_api_key("Bearer wrong-key")
        assert exc.value.status_code == 401

    def test_correct_key_passes(self):
        with patch.dict(agent.CONFIG, {"agent_api_key": "correct-key"}):
            agent._check_api_key("Bearer correct-key")  # no exception
