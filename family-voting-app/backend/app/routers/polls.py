import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.family import FamilyMember
from app.models.poll import Poll, PollOption
from app.models.user import User
from app.models.vote import Vote, VoteHistory
from app.schemas.poll import PollCreate, PollOut, PollUpdate
from app.schemas.vote import (
    OptionVoteSummary,
    PollVoteSummary,
    VoterInfo,
    VoteOut,
)
from app.utils.deps import get_current_user, get_current_week_monday, get_db

router = APIRouter(prefix="/api/polls", tags=["polls"])


async def _require_family_member(
    family_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> FamilyMember:
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family",
        )
    return member


async def _get_poll_or_404(poll_id: uuid.UUID, db: AsyncSession) -> Poll:
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll


@router.get("", response_model=list[PollOut])
async def list_polls(
    family_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active polls for a family. Must be a member."""
    await _require_family_member(family_id, current_user.id, db)
    result = await db.execute(
        select(Poll).where(Poll.family_id == family_id, Poll.is_active == True)
    )
    polls = result.scalars().all()
    return polls


@router.post("", response_model=PollOut, status_code=status.HTTP_201_CREATED)
async def create_poll(
    body: PollCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a poll with options. Must be a family member."""
    await _require_family_member(body.family_id, current_user.id, db)

    poll = Poll(
        id=uuid.uuid4(),
        family_id=body.family_id,
        created_by=current_user.id,
        title=body.title,
        category=body.category,
        description=body.description,
        reset_day=body.reset_day,
        reset_time=body.reset_time,
        reset_timezone=body.reset_timezone,
    )
    db.add(poll)
    await db.flush()

    for idx, opt in enumerate(body.options):
        option = PollOption(
            id=uuid.uuid4(),
            poll_id=poll.id,
            label=opt.label,
            sort_order=idx,
        )
        db.add(option)

    await db.flush()
    # Refresh to load relationships
    await db.refresh(poll)
    return poll


@router.get("/{poll_id}", response_model=PollOut)
async def get_poll(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get poll detail with options. Also returns current week votes."""
    poll = await _get_poll_or_404(poll_id, db)
    await _require_family_member(poll.family_id, current_user.id, db)
    return poll


@router.get("/{poll_id}/votes", response_model=PollVoteSummary)
async def get_poll_current_votes(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current week vote summary for a poll."""
    poll = await _get_poll_or_404(poll_id, db)
    await _require_family_member(poll.family_id, current_user.id, db)

    week_of = get_current_week_monday()
    option_ids = [opt.id for opt in poll.options]

    result = await db.execute(
        select(Vote).where(
            Vote.poll_option_id.in_(option_ids),
            Vote.week_of == week_of,
        )
    )
    votes = result.scalars().all()

    # Build summary
    votes_by_option: dict[uuid.UUID, list[Vote]] = {}
    for v in votes:
        votes_by_option.setdefault(v.poll_option_id, []).append(v)

    option_summaries = []
    for opt in poll.options:
        opt_votes = votes_by_option.get(opt.id, [])
        voters = [
            VoterInfo(
                user_id=v.user_id,
                display_name=v.user.display_name,
                avatar_url=v.user.avatar_url,
            )
            for v in opt_votes
        ]
        option_summaries.append(
            OptionVoteSummary(
                option_id=opt.id,
                label=opt.label,
                vote_count=len(opt_votes),
                voters=voters,
            )
        )

    return PollVoteSummary(
        poll_id=poll.id,
        week_of=week_of,
        options=option_summaries,
    )


@router.patch("/{poll_id}", response_model=PollOut)
async def update_poll(
    poll_id: uuid.UUID,
    body: PollUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit a poll. Creator or family admin only."""
    poll = await _get_poll_or_404(poll_id, db)
    membership = await _require_family_member(poll.family_id, current_user.id, db)

    if poll.created_by != current_user.id and membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator or an admin can edit this poll",
        )

    update_data = body.model_dump(exclude_unset=True)
    options_data = update_data.pop("options", None)

    for field, value in update_data.items():
        setattr(poll, field, value)

    if options_data is not None:
        # Replace all options
        for old_opt in list(poll.options):
            await db.delete(old_opt)
        await db.flush()

        for idx, opt_data in enumerate(options_data):
            option = PollOption(
                id=uuid.uuid4(),
                poll_id=poll.id,
                label=opt_data["label"],
                sort_order=idx,
            )
            db.add(option)

    await db.flush()
    await db.refresh(poll)
    return poll


@router.delete("/{poll_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_poll(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a poll. Creator or family admin only."""
    poll = await _get_poll_or_404(poll_id, db)
    membership = await _require_family_member(poll.family_id, current_user.id, db)

    if poll.created_by != current_user.id and membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator or an admin can deactivate this poll",
        )

    poll.is_active = False
    await db.flush()


@router.get("/{poll_id}/history", response_model=list[PollVoteSummary])
async def get_poll_history(
    poll_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get past week vote results from history."""
    poll = await _get_poll_or_404(poll_id, db)
    await _require_family_member(poll.family_id, current_user.id, db)

    result = await db.execute(
        select(VoteHistory)
        .where(VoteHistory.poll_id == poll_id)
        .order_by(VoteHistory.week_of.desc())
    )
    history_rows = result.scalars().all()

    summaries = []
    for row in history_rows:
        data = row.results_json
        option_summaries = []
        for opt_data in data.get("options", []):
            option_summaries.append(
                OptionVoteSummary(
                    option_id=opt_data["option_id"],
                    label=opt_data["label"],
                    vote_count=opt_data["vote_count"],
                    voters=[VoterInfo(**v) for v in opt_data.get("voters", [])],
                )
            )
        summaries.append(
            PollVoteSummary(
                poll_id=poll_id,
                week_of=row.week_of,
                options=option_summaries,
            )
        )

    return summaries
