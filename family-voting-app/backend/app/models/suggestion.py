import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Suggestion(Base):
    __tablename__ = "suggestions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    suggested_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    suggestion_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # "poll" or "option"
    )
    # For poll suggestions
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # For option suggestions
    poll_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("polls.id", ondelete="CASCADE"), nullable=True
    )
    option_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False  # "pending", "approved", "rejected"
    )
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    suggester = relationship("User", foreign_keys=[suggested_by])
    resolver = relationship("User", foreign_keys=[resolved_by])
    poll = relationship("Poll", foreign_keys=[poll_id])
