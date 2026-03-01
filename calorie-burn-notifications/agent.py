#!/usr/bin/env python3
"""
Calorie Burn Notification Agent
Tracks Apple Health calorie burn data and sends an iPhone notification
each time you've burned enough calories to cover a 20oz IPA (~280 cal).
"""

import json
import logging
import os
import time
from datetime import date, datetime
from pathlib import Path

import anthropic
import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration (override via environment variables or config.json)
# ---------------------------------------------------------------------------

CONFIG_FILE = Path(__file__).parent / "config.json"

DEFAULTS = {
    "ipa_calories": 280,          # calories in a 20oz IPA (adjust to your beer)
    "ntfy_topic": "",             # your ntfy topic (e.g. "my-calorie-alerts-abc123")
    "ntfy_server": "https://ntfy.sh",
    "anthropic_api_key": "",      # or set ANTHROPIC_API_KEY env var
    "state_file": "state.json",   # persists daily totals across restarts
    "port": 8765,
    "log_level": "INFO",
}


def load_config() -> dict:
    cfg = dict(DEFAULTS)
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            cfg.update(json.load(f))
    # Environment variables take highest precedence
    for key in cfg:
        env_val = os.environ.get(key.upper())
        if env_val is not None:
            cfg[key] = int(env_val) if isinstance(cfg[key], int) else env_val
    if not cfg["anthropic_api_key"]:
        cfg["anthropic_api_key"] = os.environ.get("ANTHROPIC_API_KEY", "")
    return cfg


CONFIG = load_config()

logging.basicConfig(
    level=getattr(logging, CONFIG["log_level"]),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State persistence (daily reset)
# ---------------------------------------------------------------------------

STATE_PATH = Path(__file__).parent / CONFIG["state_file"]


def load_state() -> dict:
    if STATE_PATH.exists():
        with open(STATE_PATH) as f:
            state = json.load(f)
        if state.get("date") == str(date.today()):
            return state
    # New day → fresh slate
    return {"date": str(date.today()), "total_burned": 0.0, "beers_earned": 0}


def save_state(state: dict) -> None:
    with open(STATE_PATH, "w") as f:
        json.dump(state, f)


# ---------------------------------------------------------------------------
# Claude-powered notification message
# ---------------------------------------------------------------------------

def generate_message(beers_earned: int, total_burned: float, ipa_cal: int) -> str:
    """Ask Claude to write a fun, punchy push notification message."""
    api_key = CONFIG["anthropic_api_key"]
    if not api_key:
        return f"Beer #{beers_earned} unlocked! You've burned {total_burned:.0f} cal today. Go crack a cold one."

    client = anthropic.Anthropic(api_key=api_key)
    prompt = (
        f"You are writing a fun, one-sentence iPhone push notification for someone "
        f"who just burned enough calories ({ipa_cal} cal) to 'earn' their {beers_earned} "
        f"{'st' if beers_earned == 1 else 'nd' if beers_earned == 2 else 'rd' if beers_earned == 3 else 'th'} "
        f"20oz IPA of the day. Their total burn today is {total_burned:.0f} calories. "
        f"Be witty, celebratory, and beer-themed. Max 120 characters. No hashtags. No emojis."
    )
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=60,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip().strip('"')
    except Exception as e:
        log.warning("Claude API error: %s — using fallback message", e)
        return f"IPA #{beers_earned} earned! {total_burned:.0f} cal burned today. You deserve it."


# ---------------------------------------------------------------------------
# ntfy push notification
# ---------------------------------------------------------------------------

def send_notification(title: str, body: str) -> None:
    topic = CONFIG["ntfy_topic"]
    server = CONFIG["ntfy_server"]
    if not topic:
        log.warning("ntfy_topic not configured — skipping notification (would send: %s)", body)
        return

    url = f"{server}/{topic}"
    headers = {
        "Title": title,
        "Priority": "default",
        "Tags": "beer,trophy",
    }
    try:
        resp = httpx.post(url, content=body.encode(), headers=headers, timeout=10)
        resp.raise_for_status()
        log.info("Notification sent: %s", body)
    except Exception as e:
        log.error("Failed to send ntfy notification: %s", e)


# ---------------------------------------------------------------------------
# FastAPI server (receives data from iOS Shortcut)
# ---------------------------------------------------------------------------

app = FastAPI(title="Calorie Burn Agent")


class HealthPayload(BaseModel):
    """
    Payload sent by the iOS Shortcut every time it runs.
    active_calories: cumulative active calories burned TODAY (from Apple Health).
    """
    active_calories: float
    timestamp: str | None = None  # ISO-8601, optional


@app.post("/health-update")
async def health_update(payload: HealthPayload):
    state = load_state()
    ipa_cal = int(CONFIG["ipa_calories"])

    previous_total = state["total_burned"]
    new_total = payload.active_calories  # Apple Health gives the running daily total

    # Guard: ignore if new value is lower than persisted (clock rollover / stale data)
    if new_total < previous_total and previous_total - new_total < 50:
        log.debug("Ignoring stale/lower calorie reading: %.1f < %.1f", new_total, previous_total)
        return {"status": "ignored", "reason": "stale reading"}

    state["total_burned"] = new_total

    beers_now = int(new_total // ipa_cal)
    beers_before = state["beers_earned"]

    if beers_now > beers_before:
        # You just crossed a new IPA threshold!
        state["beers_earned"] = beers_now
        save_state(state)

        message = generate_message(beers_now, new_total, ipa_cal)
        send_notification(
            title=f"IPA #{beers_now} Unlocked!",
            body=message,
        )
        log.info("Threshold crossed → beer #%d | total burned: %.1f cal", beers_now, new_total)
        return {"status": "notification_sent", "beers_earned": beers_now, "message": message}

    save_state(state)
    remaining = ipa_cal - (new_total % ipa_cal)
    log.info(
        "Update received: %.1f cal burned | %d beer(s) earned | %.1f cal until next beer",
        new_total, beers_now, remaining,
    )
    return {
        "status": "ok",
        "total_burned": new_total,
        "beers_earned": beers_now,
        "calories_until_next_beer": remaining,
    }


@app.get("/status")
async def status():
    state = load_state()
    ipa_cal = int(CONFIG["ipa_calories"])
    burned = state["total_burned"]
    earned = state["beers_earned"]
    remaining = ipa_cal - (burned % ipa_cal) if burned > 0 else ipa_cal
    return {
        "date": state["date"],
        "total_burned_today": burned,
        "beers_earned_today": earned,
        "calories_until_next_beer": remaining,
        "ipa_calories": ipa_cal,
    }


@app.get("/")
async def root():
    return {"message": "Calorie Burn Agent is running. POST to /health-update"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(CONFIG["port"])
    log.info("Starting Calorie Burn Agent on port %d", port)
    log.info("IPA threshold: %d calories (20oz IPA)", int(CONFIG["ipa_calories"]))
    if not CONFIG["ntfy_topic"]:
        log.warning("ntfy_topic is not set — notifications will be logged only. Set it in config.json.")
    uvicorn.run(app, host="0.0.0.0", port=port)
