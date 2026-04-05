import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.family import FamilyMember
from app.models.poll import Poll, PollOption
from app.models.suggestion import Suggestion
from app.models.user import User
from app.schemas.suggestion import (
    ResolveSuggestionRequest,
    SuggestOptionRequest,
    SuggestPollRequest,
    SuggestionOut,
)
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


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


def _suggestion_to_out(suggestion: Suggestion) -> SuggestionOut:
    return SuggestionOut(
        id=suggestion.id,
        family_id=suggestion.family_id,
        suggested_by=suggestion.suggested_by,
        suggester_name=suggestion.suggester.display_name,
        suggester_avatar=suggestion.suggester.avatar_url,
        suggestion_type=suggestion.suggestion_type,
        title=suggestion.title,
        category=suggestion.category,
        description=suggestion.description,
        poll_id=suggestion.poll_id,
        poll_title=suggestion.poll.title if suggestion.poll else None,
        option_label=suggestion.option_label,
        status=suggestion.status,
        resolved_by=suggestion.resolved_by,
        resolver_name=suggestion.resolver.display_name if suggestion.resolver else None,
        created_at=suggestion.created_at,
    )


@router.get("", response_model=list[SuggestionOut])
async def list_suggestions(
    family_id: uuid.UUID = Query(...),
    status_filter: str = Query("pending", alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List suggestions for a family. Defaults to pending; pass status=all for all."""
    await _require_family_member(family_id, current_user.id, db)

    query = select(Suggestion).where(Suggestion.family_id == family_id)
    if status_filter != "all":
        query = query.where(Suggestion.status == status_filter)
    query = query.order_by(Suggestion.created_at.desc())

    result = await db.execute(query)
    suggestions = result.scalars().all()
    return [_suggestion_to_out(s) for s in suggestions]


@router.post("/poll", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
async def suggest_poll(
    body: SuggestPollRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest a new poll. Any family member can suggest."""
    await _require_family_member(body.family_id, current_user.id, db)

    suggestion = Suggestion(
        id=uuid.uuid4(),
        family_id=body.family_id,
        suggested_by=current_user.id,
        suggestion_type="poll",
        title=body.title,
        category=body.category,
        description=body.description,
        status="pending",
    )
    db.add(suggestion)
    await db.flush()
    await db.refresh(suggestion)
    return _suggestion_to_out(suggestion)


@router.post("/option", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
async def suggest_option(
    body: SuggestOptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest a new option for an existing poll. Any family member can suggest."""
    await _require_family_member(body.family_id, current_user.id, db)

    # Verify the poll exists and belongs to the family
    result = await db.execute(select(Poll).where(Poll.id == body.poll_id))
    poll = result.scalar_one_or_none()
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.family_id != body.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Poll does not belong to the specified family",
        )

    suggestion = Suggestion(
        id=uuid.uuid4(),
        family_id=body.family_id,
        suggested_by=current_user.id,
        suggestion_type="option",
        poll_id=body.poll_id,
        option_label=body.option_label,
        status="pending",
    )
    db.add(suggestion)
    await db.flush()
    await db.refresh(suggestion)
    return _suggestion_to_out(suggestion)


@router.post("/{suggestion_id}/resolve", response_model=SuggestionOut)
async def resolve_suggestion(
    suggestion_id: uuid.UUID,
    body: ResolveSuggestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a suggestion. Admin or poll creator only."""
    if body.action not in ("approve", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'",
        )

    result = await db.execute(select(Suggestion).where(Suggestion.id == suggestion_id))
    suggestion = result.scalar_one_or_none()
    if suggestion is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    if suggestion.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Suggestion has already been resolved",
        )

    membership = await _require_family_member(suggestion.family_id, current_user.id, db)

    # Check permission: admin or (for option suggestions) the poll creator
    is_admin = membership.role == "admin"
    is_poll_creator = False
    if suggestion.suggestion_type == "option" and suggestion.poll_id is not None:
        poll_result = await db.execute(select(Poll).where(Poll.id == suggestion.poll_id))
        poll = poll_result.scalar_one_or_none()
        if poll is not None and poll.created_by == current_user.id:
            is_poll_creator = True

    if not is_admin and not is_poll_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin or the poll creator can resolve suggestions",
        )

    if body.action == "approve":
        if suggestion.suggestion_type == "poll":
            # Create the actual poll from the suggestion
            new_poll = Poll(
                id=uuid.uuid4(),
                family_id=suggestion.family_id,
                created_by=suggestion.suggested_by,
                title=suggestion.title,
                category=suggestion.category or "custom",
                description=suggestion.description,
                reset_day=0,
                reset_time="09:00",
                reset_timezone="UTC",
            )
            db.add(new_poll)

        elif suggestion.suggestion_type == "option":
            # Add the option to the poll
            poll_result = await db.execute(
                select(Poll).where(Poll.id == suggestion.poll_id)
            )
            poll = poll_result.scalar_one_or_none()
            if poll is None:
                raise HTTPException(status_code=404, detail="Poll no longer exists")

            # Calculate next sort_order
            max_order_result = await db.execute(
                select(sa_func.coalesce(sa_func.max(PollOption.sort_order), -1)).where(
                    PollOption.poll_id == poll.id
                )
            )
            max_order = max_order_result.scalar()
            next_order = (max_order or 0) + 1

            new_option = PollOption(
                id=uuid.uuid4(),
                poll_id=poll.id,
                label=suggestion.option_label,
                sort_order=next_order,
            )
            db.add(new_option)

        suggestion.status = "approved"
    else:
        suggestion.status = "rejected"

    suggestion.resolved_by = current_user.id
    await db.flush()
    await db.refresh(suggestion)
    return _suggestion_to_out(suggestion)


@router.delete("/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_suggestion(
    suggestion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete own suggestion (only if still pending)."""
    result = await db.execute(select(Suggestion).where(Suggestion.id == suggestion_id))
    suggestion = result.scalar_one_or_none()
    if suggestion is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    if suggestion.suggested_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own suggestions",
        )

    if suggestion.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete pending suggestions",
        )

    await db.delete(suggestion)
    await db.flush()
