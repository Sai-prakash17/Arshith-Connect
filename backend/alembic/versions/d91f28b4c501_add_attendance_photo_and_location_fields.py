"""add_attendance_photo_and_location_fields

Revision ID: d91f28b4c501
Revises: a678aa83f87a
Create Date: 2026-10-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd91f28b4c501'
down_revision: Union[str, Sequence[str], None] = 'a678aa83f87a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add photo key, GPS coordinates, accuracy, and working duration to attendance table."""
    op.add_column(
        'attendance',
        sa.Column('check_in_photo_key', sa.String(length=255), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_out_photo_key', sa.String(length=255), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_in_latitude', sa.Float(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_in_longitude', sa.Float(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_in_location_accuracy', sa.Float(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_out_latitude', sa.Float(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_out_longitude', sa.Float(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('check_out_location_accuracy', sa.Float(), nullable=True),
    )
    op.add_column(
        'attendance',
        sa.Column('working_duration_seconds', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    """Drop added columns from attendance table."""
    op.drop_column('attendance', 'working_duration_seconds')
    op.drop_column('attendance', 'check_out_location_accuracy')
    op.drop_column('attendance', 'check_out_longitude')
    op.drop_column('attendance', 'check_out_latitude')
    op.drop_column('attendance', 'check_in_location_accuracy')
    op.drop_column('attendance', 'check_in_longitude')
    op.drop_column('attendance', 'check_in_latitude')
    op.drop_column('attendance', 'check_out_photo_key')
    op.drop_column('attendance', 'check_in_photo_key')
