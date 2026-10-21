"""add_attendance_photo_bytea_data

Revision ID: e12f48b5d602
Revises: d91f28b4c501
Create Date: 2026-10-19 14:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e12f48b5d602'
down_revision: Union[str, Sequence[str], None] = 'd91f28b4c501'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add BYTEA columns to store binary photo data directly in PostgreSQL."""
    op.add_column(
        'attendance',
        sa.Column('check_in_photo_data', sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_out_photo_data', sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_in_photo_mime', sa.String(length=50), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_out_photo_mime', sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('attendance', 'check_out_photo_mime')
    op.drop_column('attendance', 'check_in_photo_mime')
    op.drop_column('attendance', 'check_out_photo_data')
    op.drop_column('attendance', 'check_in_photo_data')
