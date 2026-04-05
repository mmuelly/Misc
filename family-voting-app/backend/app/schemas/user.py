import uuid

from pydantic import BaseModel


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class GoogleAuthRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
