import uuid
from datetime import datetime

from pydantic import BaseModel


class PollOptionCreate(BaseModel):
    label: str


class PollOptionOut(BaseModel):
    id: uuid.UUID
    label: str
    sort_order: int

    model_config = {"from_attributes": True}


class PollCreate(BaseModel):
    family_id: uuid.UUID
    title: str
    category: str = "custom"
    description: str | None = None
    options: list[PollOptionCreate]
    reset_day: int = 0
    reset_time: str = "09:00"
    reset_timezone: str = "UTC"


class PollUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    is_active: bool | None = None
    reset_day: int | None = None
    reset_time: str | None = None
    reset_timezone: str | None = None
    options: list[PollOptionCreate] | None = None


class PollOut(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    created_by: uuid.UUID
    title: str
    category: str
    description: str | None = None
    is_active: bool
    reset_day: int
    reset_time: str
    reset_timezone: str
    created_at: datetime
    options: list[PollOptionOut] = []

    model_config = {"from_attributes": True}
