"""Alembic Migrations-Umgebung."""

import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from alembic import context

# .env laden damit DATABASE_URL verfügbar ist
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

config = context.config

# DATABASE_URL aus Umgebungsvariable überschreibt alembic.ini
db_url = os.getenv("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alle Models importieren damit Alembic die Tabellen kennt
from app.database import Base  # noqa: E402
import app.models.models  # noqa: E402, F401

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Migrationen ohne DB-Verbindung ausführen (SQL-Skript generieren)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Migrationen direkt gegen die Datenbank ausführen."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
