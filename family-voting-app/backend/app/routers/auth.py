import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.user import GoogleAuthRequest, TokenResponse, UserOut
from app.utils.deps import create_access_token, get_current_user, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Dev bypass token for testing without Google OAuth
DEV_BYPASS_TOKEN = "dev-bypass-token"


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Verify Google ID token, upsert user, return JWT."""

    # Dev bypass: allow a special token for development/testing
    if body.token == DEV_BYPASS_TOKEN:
        google_id = "dev-user-001"
        email = "dev@familyvote.local"
        name = "Dev User"
        picture = None
    else:
        try:
            idinfo = id_token.verify_oauth2_token(
                body.token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
            google_id = idinfo["sub"]
            email = idinfo["email"]
            name = idinfo.get("name", email.split("@")[0])
            picture = idinfo.get("picture")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token",
            )

    # Upsert user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=email,
            display_name=name,
            avatar_url=picture,
            google_id=google_id,
        )
        db.add(user)
        await db.flush()
    else:
        user.email = email
        user.display_name = name
        user.avatar_url = picture
        await db.flush()

    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return current user profile."""
    return current_user
