import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Family(Base):
    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    invite_code: Mapped[str] = mapped_column(
        String(8), unique=True, nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    members = relationship("FamilyMember", back_populates="family", lazy="selectin")


class FamilyMember(Base):
    __tablename__ = "family_members"
    __table_args__ = (
        UniqueConstraint("family_id", "user_id", name="uq_family_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(10), nullable=False, default="member"
    )
    joined_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    family = relationship("Family", back_populates="members")
    user = relationship("User", lazy="selectin")
