import logging
from typing import Any

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.config import settings

logger = logging.getLogger(__name__)

WEEKLY_SUMMARY_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; }
        h1 { color: #333; font-size: 22px; }
        h2 { color: #555; font-size: 18px; margin-top: 24px; }
        .option { padding: 8px 12px; margin: 4px 0; background: #f0f4ff; border-radius: 4px; }
        .option .label { font-weight: bold; color: #333; }
        .option .count { color: #666; font-size: 14px; }
        .voters { color: #888; font-size: 13px; margin-left: 12px; }
        .footer { margin-top: 24px; color: #999; font-size: 12px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Weekly Voting Summary</h1>
        <p>Here are the results for the week of {{ week_of }}:</p>
        {% for poll in polls %}
        <h2>{{ poll.title }}</h2>
        {% for option in poll.options %}
        <div class="option">
            <span class="label">{{ option.label }}</span>
            <span class="count">({{ option.vote_count }} vote{{ 's' if option.vote_count != 1 else '' }})</span>
            {% if option.voters %}
            <div class="voters">Voters: {{ option.voters | join(', ') }}</div>
            {% endif %}
        </div>
        {% endfor %}
        {% endfor %}
        <div class="footer">
            <p>Sent by Family Vote App</p>
        </div>
    </div>
</body>
</html>
"""


def _get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


async def send_weekly_summary(
    recipient_emails: list[str],
    polls_data: list[dict[str, Any]],
    week_of: str,
) -> None:
    """Send weekly summary email to family members.

    Args:
        recipient_emails: List of email addresses to send to.
        polls_data: List of dicts with keys: title, options (list of dicts with
                    label, vote_count, voters (list of display names)).
        week_of: String representation of the week start date.
    """
    if not settings.MAIL_ENABLED:
        logger.info("Email is disabled. Skipping weekly summary send.")
        return

    if not recipient_emails:
        logger.info("No recipients for weekly summary.")
        return

    try:
        from jinja2 import Template

        template = Template(WEEKLY_SUMMARY_TEMPLATE)
        html_body = template.render(polls=polls_data, week_of=week_of)

        conf = _get_mail_config()
        fm = FastMail(conf)

        message = MessageSchema(
            subject=f"Family Vote - Weekly Summary ({week_of})",
            recipients=recipient_emails,
            body=html_body,
            subtype=MessageType.html,
        )

        await fm.send_message(message)
        logger.info(f"Weekly summary sent to {len(recipient_emails)} recipients.")
    except Exception:
        logger.exception("Failed to send weekly summary email")
