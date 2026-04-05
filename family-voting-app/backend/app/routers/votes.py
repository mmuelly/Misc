import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.poll import PollOption
from app.models.family import FamilyMember
from app.models.poll import Poll
from app.models.user import User
from app.models.vote import Vote
from app.schemas.vote import VoteCreate, VoteOut
from app.utils.deps import get_current_user, get_current_week_monday, get_db

router = APIRouter(prefix="/api/votes", tags=["votes"])


@router.post("", response_model=VoteOut, status_code=status.HTTP_201_CREATED)
async def cast_vote(
    body: VoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cast a vote for the current week. One vote per option per week per user."""
    # Look up the option and its poll
    result = await db.execute(
        select(PollOption).where(PollOption.id == body.poll_option_id)
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(status_code=404, detail="Poll option not found")

    # Look up the poll
    result = await db.execute(select(Poll).where(Poll.id == option.poll_id))
    poll = result.scalar_one_or_none()
    if poll is None or not poll.is_active:
        raise HTTPException(status_code=400, detail="Poll is not active")

    # Verify membership
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == poll.family_id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this family",
        )

    week_of = get_current_week_monday()

    # Check for duplicate vote
    result = await db.execute(
        select(Vote).where(
            Vote.poll_option_id == body.poll_option_id,
            Vote.user_id == current_user.id,
            Vote.week_of == week_of,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already voted for this option this week",
        )

    vote = Vote(
        id=uuid.uuid4(),
        poll_option_id=body.poll_option_id,
        user_id=current_user.id,
        week_of=week_of,
    )
    db.add(vote)
    await db.flush()
    await db.refresh(vote)

    return VoteOut(
        id=vote.id,
        poll_option_id=vote.poll_option_id,
        user_id=vote.user_id,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        week_of=vote.week_of,
        created_at=vote.created_at,
    )


@router.delete("/{vote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def retract_vote(
    vote_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retract your own vote."""
    result = await db.execute(select(Vote).where(Vote.id == vote_id))
    vote = result.scalar_one_or_none()
    if vote is None:
        raise HTTPException(status_code=404, detail="Vote not found")

    if vote.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only retract your own votes",
        )

    await db.delete(vote)
    await db.flush()
