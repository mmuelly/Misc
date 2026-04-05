import uuid
from datetime import datetime

from pydantic import BaseModel


class SuggestPollRequest(BaseModel):
    family_id: uuid.UUID
    title: str
    category: str = "custom"
    description: str | None = None


class SuggestOptionRequest(BaseModel):
    family_id: uuid.UUID
    poll_id: uuid.UUID
    option_label: str


class SuggestionOut(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    suggested_by: uuid.UUID
    suggester_name: str
    suggester_avatar: str | None = None
    suggestion_type: str
    title: str | None = None
    category: str | None = None
    description: str | None = None
    poll_id: uuid.UUID | None = None
    poll_title: str | None = None
    option_label: str | None = None
    status: str
    resolved_by: uuid.UUID | None = None
    resolver_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ResolveSuggestionRequest(BaseModel):
    action: str  # "approve" or "reject"
