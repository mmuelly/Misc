import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, families, polls, votes
from app.tasks.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    # Create tables for SQLite dev (no-op if they exist)
    async with engine.begin() as conn:
        # Import all models so they are registered on Base.metadata
        import app.models  # noqa: F401

        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured.")

    start_scheduler()

    yield

    # Shutdown
    stop_scheduler()
    logger.info("Shut down complete.")


app = FastAPI(
    title="Family Voting App",
    description="Backend API for family voting/polling",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(families.router)
app.include_router(polls.router)
app.include_router(votes.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
