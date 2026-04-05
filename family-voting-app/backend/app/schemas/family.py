import uuid
from datetime import datetime

from pydantic import BaseModel


class FamilyCreate(BaseModel):
    name: str


class FamilyOut(BaseModel):
    id: uuid.UUID
    name: str
    invite_code: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FamilyMemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None = None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class FamilyDetailOut(FamilyOut):
    members: list[FamilyMemberOut] = []


class JoinFamilyRequest(BaseModel):
    invite_code: str
