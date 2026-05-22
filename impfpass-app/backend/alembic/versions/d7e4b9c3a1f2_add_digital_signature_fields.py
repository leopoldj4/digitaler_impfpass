"""add_digital_signature_fields

Revision ID: d7e4b9c3a1f2
Revises: 4a2127ba1ef8
Create Date: 2026-05-22 10:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7e4b9c3a1f2"
down_revision: Union[str, None] = "4a2127ba1ef8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vaccinations", sa.Column("digital_signature_hash", sa.String(length=128), nullable=True))
    op.add_column("vaccinations", sa.Column("digital_signature_payload", sa.JSON(), nullable=True))
    op.add_column("vaccinations", sa.Column("digital_signed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("vaccinations", sa.Column("digital_signed_by", sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column("vaccinations", "digital_signed_by")
    op.drop_column("vaccinations", "digital_signed_at")
    op.drop_column("vaccinations", "digital_signature_payload")
    op.drop_column("vaccinations", "digital_signature_hash")
