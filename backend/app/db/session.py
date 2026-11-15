from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, close_all_sessions, sessionmaker

from app.core.config import get_settings
from app.db.base import Base

settings = get_settings()


def _sqlite_db_path() -> Path | None:
    if not settings.DATABASE_URL.startswith("sqlite"):
        return None

    url = settings.DATABASE_URL.replace("sqlite:///", "", 1)
    db_path = Path(url)
    if not db_path.is_absolute():
        db_path = (Path(__file__).resolve().parents[2] / url).resolve()
    return db_path


def _get_engine_url() -> str:
    path = _sqlite_db_path()
    if path is not None:
        return f"sqlite:///{path.as_posix()}"
    return settings.DATABASE_URL


connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(_get_engine_url(), connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        close_all_sessions()
        engine.dispose()
    Base.metadata.create_all(bind=engine)


def reset_database() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        close_all_sessions()
        engine.dispose()
        db_path = _sqlite_db_path()
        if db_path is not None and db_path.exists():
            db_path.unlink()
    Base.metadata.create_all(bind=engine)
