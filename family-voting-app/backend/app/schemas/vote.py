import uuid
from datetime import date, datetime

from pydantic import BaseModel


class VoteCreate(BaseModel):
    poll_option_id: uuid.UUID


class VoteOut(BaseModel):
    id: uuid.UUID
    poll_option_id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None = None
    week_of: date
    created_at: datetime

    model_config = {"from_attributes": True}


class VoterInfo(BaseModel):
    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None = None


class OptionVoteSummary(BaseModel):
    option_id: uuid.UUID
    label: str
    vote_count: int
    voters: list[VoterInfo] = []


class PollVoteSummary(BaseModel):
    poll_id: uuid.UUID
    week_of: date
    options: list[OptionVoteSummary] = []
