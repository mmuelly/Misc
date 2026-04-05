import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.family import Family, FamilyMember
from app.models.user import User
from app.schemas.family import (
    FamilyCreate,
    FamilyDetailOut,
    FamilyMemberOut,
    FamilyOut,
    JoinFamilyRequest,
)
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/api/families", tags=["families"])


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(6)[:8]


async def _require_membership(
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


@router.post("", response_model=FamilyOut, status_code=status.HTTP_201_CREATED)
async def create_family(
    body: FamilyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new family. The creator becomes an admin."""
    family = Family(
        id=uuid.uuid4(),
        name=body.name,
        invite_code=_generate_invite_code(),
        created_by=current_user.id,
    )
    db.add(family)
    await db.flush()

    member = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(member)
    await db.flush()
    return family


@router.get("/{family_id}", response_model=FamilyDetailOut)
async def get_family_detail(
    family_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get family detail with members. Must be a member."""
    await _require_membership(family_id, current_user.id, db)

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()
    if family is None:
        raise HTTPException(status_code=404, detail="Family not found")

    members_out = []
    for fm in family.members:
        members_out.append(
            FamilyMemberOut(
                id=fm.id,
                user_id=fm.user_id,
                display_name=fm.user.display_name,
                avatar_url=fm.user.avatar_url,
                role=fm.role,
                joined_at=fm.joined_at,
            )
        )

    return FamilyDetailOut(
        id=family.id,
        name=family.name,
        invite_code=family.invite_code,
        created_at=family.created_at,
        members=members_out,
    )


@router.post("/join", response_model=FamilyOut)
async def join_family(
    body: JoinFamilyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a family via invite code."""
    result = await db.execute(
        select(Family).where(Family.invite_code == body.invite_code)
    )
    family = result.scalar_one_or_none()
    if family is None:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Check if already a member
    existing = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family.id,
            FamilyMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already a member of this family",
        )

    member = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        user_id=current_user.id,
        role="member",
    )
    db.add(member)
    await db.flush()
    return family


@router.patch("/{family_id}", response_model=FamilyOut)
async def update_family(
    family_id: uuid.UUID,
    body: FamilyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update family name. Admin only."""
    membership = await _require_membership(family_id, current_user.id, db)
    if membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update the family",
        )

    result = await db.execute(select(Family).where(Family.id == family_id))
    family = result.scalar_one_or_none()
    if family is None:
        raise HTTPException(status_code=404, detail="Family not found")

    family.name = body.name
    await db.flush()
    return family


@router.delete(
    "/{family_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_member(
    family_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member. Admin can remove anyone; members can only remove themselves."""
    caller_membership = await _require_membership(family_id, current_user.id, db)

    is_self = current_user.id == user_id
    is_admin = caller_membership.role == "admin"

    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove other members",
        )

    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
        )
    )
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(target)
    await db.flush()
