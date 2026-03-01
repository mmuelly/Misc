# Calorie Burn Notification Agent — Setup Guide

Sends a push notification to your iPhone every time you've burned enough
calories to cover a **20oz IPA (~280 cal)** based on your Apple Health data.

```
Apple Health → iOS Shortcut (every 15 min) → Python Agent → ntfy → iPhone
                                                     ↓
                                              Claude generates
                                              a fun message
```

---

## 1. Install ntfy on your iPhone

1. Install **[ntfy](https://apps.apple.com/us/app/ntfy/id1625396347)** from the App Store (free).
2. Open the app → tap **+** → Subscribe to a topic.
3. Choose a **unique topic name**, e.g. `calorie-alert-jsmith42`
   (treat it like a password — anyone who knows it can post to it).
4. Copy your topic name for step 3.

---

## 2. Run the Python agent

### Prerequisites
- Python 3.11+
- An Anthropic API key (optional — fallback messages are used without one)
- A Mac or server on the same network as your iPhone

```bash
cd calorie-burn-notifications
pip install -r requirements.txt
```

### Configure

Edit `config.json`:

```json
{
  "ipa_calories": 280,
  "ntfy_topic": "your-unique-topic-here",
  "ntfy_server": "https://ntfy.sh",
  "anthropic_api_key": "sk-ant-...",
  "port": 8765
}
```

| Key | Description |
|-----|-------------|
| `ipa_calories` | Calories in your specific IPA (default 280 for a typical 20oz IPA) |
| `ntfy_topic` | Your unique ntfy topic name from step 1 |
| `anthropic_api_key` | Your Anthropic API key for AI-generated messages (optional) |
| `port` | Local port the server listens on (default 8765) |

Alternatively, set any key as an environment variable (uppercase), e.g.:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export NTFY_TOPIC="calorie-alert-jsmith42"
```

### Start the agent

```bash
python agent.py
```

You should see:
```
Starting Calorie Burn Agent on port 8765
IPA threshold: 280 calories (20oz IPA)
```

Keep this terminal running (or use `screen`, `tmux`, or a systemd service).

### Find your machine's local IP

```bash
ipconfig getifaddr en0    # Mac (Wi-Fi)
# or
hostname -I               # Linux
```

You'll need this IP for the Shortcut (e.g. `192.168.1.42`).

---

## 3. Create the iOS Shortcut

This Shortcut runs every 15 minutes, reads your active calories from Health,
and POSTs them to the agent.

### Steps

1. Open the **Shortcuts** app on your iPhone.
2. Tap **+** → **Add Action**.
3. Build the following actions in order:

---

**Action 1 — Get Health Sample**
- Action: `Find Health Samples`
- Type: `Active Energy Burned`
- Sort by: `Start Date` → **Newest First**
- Limit: **1**

> This gives you a single latest calorie sample. We want the *cumulative*
> daily total, so we use a different approach with the next action.

Actually, use this simpler approach instead:

**Action 1 — Get Health Quantity**
- Action: `Log Health Sample` is not what we want — use `Get Health Statistics`
  (search for "health" in the action library).
- Statistic: `Active Energy Burned`
- Time period: **Today**
- Aggregate: **Sum**

**Action 2 — Get Contents of URL** (HTTP POST)
- URL: `http://YOUR_MAC_IP:8765/health-update`
  (replace `YOUR_MAC_IP` with the IP from step 2)
- Method: **POST**
- Request Body: **JSON**
- Add key: `active_calories` → Value: `Health Statistics` (the output of Action 1)
- Add key: `timestamp` → Value: `Current Date` (formatted as ISO 8601)

---

### Shortcut URL (import template)

Because Health access requires on-device authorization, import the shortcut
manually. Here is the complete action sequence as a reference:

```
1. Find Health Samples
   - Type: Active Energy Burned
   - Aggregate: Sum
   - Start: Start of Today
   - End: Now

2. Get Contents of URL
   - URL: http://<YOUR_IP>:8765/health-update
   - Method: POST
   - Body (JSON):
       active_calories → Provided Input (from step 1)
       timestamp       → Current Date (ISO 8601)
```

### Automate it (every 15 minutes)

1. Go to the **Automation** tab in Shortcuts.
2. Tap **+** → **Personal Automation** → **Time of Day**.
3. Set: **Repeat every 15 minutes** (or use individual time triggers).
4. Add action: **Run Shortcut** → select your shortcut.
5. Disable "Ask Before Running".

> **Tip:** iOS 17+ allows background Shortcut automations without confirmation.

---

## 4. Test it

Manually trigger the Shortcut and watch the agent logs:

```
Update received: 1850.3 cal burned | 6 beer(s) earned | 129.7 cal until next beer
```

Or call the status endpoint from any browser:

```
http://YOUR_MAC_IP:8765/status
```

Response:
```json
{
  "date": "2025-08-15",
  "total_burned_today": 1850.3,
  "beers_earned_today": 6,
  "calories_until_next_beer": 129.7,
  "ipa_calories": 280
}
```

To simulate a threshold crossing for testing:
```bash
curl -X POST http://localhost:8765/health-update \
  -H "Content-Type: application/json" \
  -d '{"active_calories": 280}'
```

---

## 5. Run as a background service (optional)

### macOS (launchd)

Create `~/Library/LaunchAgents/com.calorie.agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.calorie.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/path/to/calorie-burn-notifications/agent.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/path/to/calorie-burn-notifications</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/calorie-agent.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/calorie-agent.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.calorie.agent.plist
```

### Linux (systemd)

```ini
# /etc/systemd/system/calorie-agent.service
[Unit]
Description=Calorie Burn Notification Agent

[Service]
ExecStart=/usr/bin/python3 /path/to/calorie-burn-notifications/agent.py
WorkingDirectory=/path/to/calorie-burn-notifications
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now calorie-agent
```

---

## Calorie Reference

| Beer | Calories (approx) |
|------|-------------------|
| 20oz IPA (6–7% ABV) | **280** |
| 20oz light lager | 180 |
| 20oz stout | 300 |
| 20oz sour | 240 |

Adjust `ipa_calories` in `config.json` to match your actual beer.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Shortcut can't reach the agent | Ensure your Mac and iPhone are on the same Wi-Fi; check firewall settings |
| No notification received | Verify `ntfy_topic` matches the topic subscribed in the ntfy app |
| `403` from ntfy | Your topic may be reserved — choose a more unique name |
| Agent not persisting state | Check write permissions in the agent directory |
| Claude messages not generating | Verify `ANTHROPIC_API_KEY` is set and has credits |
