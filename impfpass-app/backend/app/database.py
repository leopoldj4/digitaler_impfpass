"""Datenbankverbindung und Session-Management."""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://impfpass:impfpass@localhost:5432/impfpass_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI Dependency: liefert eine DB-Session und schließt sie danach."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
