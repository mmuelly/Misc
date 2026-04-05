import asyncio
import logging
import uuid
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.database import async_session
from app.models.family import FamilyMember
from app.models.poll import Poll
from app.models.user import User
from app.models.vote import Vote, VoteHistory
from app.services.email_service import send_weekly_summary

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

# Map day int (0=Monday) to cron day_of_week string
DAY_MAP = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}


def _job_id(poll_id: uuid.UUID) -> str:
    return f"poll_reset_{poll_id}"


async def reset_poll(poll_id: uuid.UUID) -> None:
    """Archive current week votes and optionally send summary email."""
    logger.info(f"Running weekly reset for poll {poll_id}")

    async with async_session() as db:
        try:
            result = await db.execute(select(Poll).where(Poll.id == poll_id))
            poll = result.scalar_one_or_none()
            if poll is None or not poll.is_active:
                logger.info(f"Poll {poll_id} not found or inactive, skipping reset.")
                return

            # Determine the week being archived (the week that just ended)
            today = date.today()
            week_of = today - timedelta(days=today.weekday())
            # If reset runs on the new week's reset day, archive the prior week
            # We archive based on the Monday of the current week
            # (votes were cast with this week_of)

            option_ids = [opt.id for opt in poll.options]
            if not option_ids:
                return

            result = await db.execute(
                select(Vote).where(
                    Vote.poll_option_id.in_(option_ids),
                    Vote.week_of == week_of,
                )
            )
            votes = result.scalars().all()

            # Build results JSON
            votes_by_option: dict[uuid.UUID, list[Vote]] = {}
            for v in votes:
                votes_by_option.setdefault(v.poll_option_id, []).append(v)

            options_data = []
            for opt in poll.options:
                opt_votes = votes_by_option.get(opt.id, [])
                voters = [
                    {
                        "user_id": str(v.user_id),
                        "display_name": v.user.display_name if v.user else "Unknown",
                        "avatar_url": v.user.avatar_url if v.user else None,
                    }
                    for v in opt_votes
                ]
                options_data.append(
                    {
                        "option_id": str(opt.id),
                        "label": opt.label,
                        "vote_count": len(opt_votes),
                        "voters": voters,
                    }
                )

            # Save to history
            history = VoteHistory(
                id=uuid.uuid4(),
                poll_id=poll.id,
                week_of=week_of,
                results_json={"options": options_data},
            )
            db.add(history)

            # Delete current week votes
            for v in votes:
                await db.delete(v)

            await db.commit()
            logger.info(
                f"Archived {len(votes)} votes for poll {poll_id}, week of {week_of}"
            )

            # Send summary email
            try:
                members_result = await db.execute(
                    select(FamilyMember).where(
                        FamilyMember.family_id == poll.family_id
                    )
                )
                members = members_result.scalars().all()
                user_ids = [m.user_id for m in members]

                users_result = await db.execute(
                    select(User).where(User.id.in_(user_ids))
                )
                users = users_result.scalars().all()
                emails = [u.email for u in users if u.email]

                email_polls_data = [
                    {
                        "title": poll.title,
                        "options": [
                            {
                                "label": od["label"],
                                "vote_count": od["vote_count"],
                                "voters": [
                                    v["display_name"] for v in od["voters"]
                                ],
                            }
                            for od in options_data
                        ],
                    }
                ]

                await send_weekly_summary(emails, email_polls_data, str(week_of))
            except Exception:
                logger.exception("Failed to send summary email during reset")

        except Exception:
            logger.exception(f"Error resetting poll {poll_id}")
            await db.rollback()


def add_poll_job(poll: Poll) -> None:
    """Register a weekly cron job for a poll."""
    if not poll.is_active:
        return

    hour, minute = poll.reset_time.split(":")
    day_of_week = DAY_MAP.get(poll.reset_day, "mon")

    trigger = CronTrigger(
        day_of_week=day_of_week,
        hour=int(hour),
        minute=int(minute),
        timezone=poll.reset_timezone,
    )

    job_id = _job_id(poll.id)

    # Remove existing job if present
    existing = scheduler.get_job(job_id)
    if existing:
        scheduler.remove_job(job_id)

    scheduler.add_job(
        reset_poll,
        trigger=trigger,
        id=job_id,
        args=[poll.id],
        replace_existing=True,
    )
    logger.info(
        f"Scheduled reset for poll {poll.id}: {day_of_week} at {poll.reset_time} {poll.reset_timezone}"
    )


def remove_poll_job(poll_id: uuid.UUID) -> None:
    """Remove the scheduled job for a poll."""
    job_id = _job_id(poll_id)
    existing = scheduler.get_job(job_id)
    if existing:
        scheduler.remove_job(job_id)
        logger.info(f"Removed scheduled job for poll {poll_id}")


def update_poll_job(poll: Poll) -> None:
    """Update the scheduled job when poll settings change."""
    remove_poll_job(poll.id)
    if poll.is_active:
        add_poll_job(poll)


async def load_all_poll_jobs() -> None:
    """Load all active polls and register their cron jobs."""
    async with async_session() as db:
        result = await db.execute(select(Poll).where(Poll.is_active == True))
        polls = result.scalars().all()
        for poll in polls:
            add_poll_job(poll)
        logger.info(f"Loaded {len(polls)} poll reset jobs")


def start_scheduler() -> None:
    """Start the APScheduler and load existing poll jobs."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")
        # Schedule the loading of jobs
        asyncio.ensure_future(load_all_poll_jobs())


def stop_scheduler() -> None:
    """Stop the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
