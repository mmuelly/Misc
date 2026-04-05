import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Poll(Base):
    __tablename__ = "polls"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="custom")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reset_day: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0=Monday
    reset_time: Mapped[str] = mapped_column(String(5), default="09:00", nullable=False)
    reset_timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    options = relationship(
        "PollOption",
        back_populates="poll",
        lazy="selectin",
        order_by="PollOption.sort_order",
        cascade="all, delete-orphan",
    )


class PollOption(Base):
    __tablename__ = "poll_options"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    poll_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    poll = relationship("Poll", back_populates="options")
