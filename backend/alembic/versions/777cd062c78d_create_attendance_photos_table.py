"""create_attendance_photos_table

Revision ID: 777cd062c78d
Revises: e12f48b5d602
Create Date: 2026-10-20 15:47:34.251025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '777cd062c78d'
down_revision: Union[str, Sequence[str], None] = 'e12f48b5d602'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create attendance_photos table for dedicated binary BYTEA storage and backfill existing photos."""
    op.create_table(
        'attendance_photos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('attendance_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.String(length=50), nullable=False),
        sa.Column('photo_type', sa.String(length=20), nullable=False, server_default='check_in'),
        sa.Column('photo_data', sa.LargeBinary(), nullable=False),
        sa.Column('mime_type', sa.String(length=50), nullable=False, server_default='image/jpeg'),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['attendance_id'], ['attendance.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('attendance_id', 'photo_type', name='uq_attendance_photos_att_type'),
    )
    op.create_index(op.f('ix_attendance_photos_id'), 'attendance_photos', ['id'], unique=False)
    op.create_index(op.f('ix_attendance_photos_attendance_id'), 'attendance_photos', ['attendance_id'], unique=False)
    op.create_index(op.f('ix_attendance_photos_employee_id'), 'attendance_photos', ['employee_id'], unique=False)

    # Backfill existing BYTEA records from attendance table into attendance_photos
    op.execute("""
        INSERT INTO attendance_photos (attendance_id, employee_id, photo_type, photo_data, mime_type, file_size_bytes, storage_key, created_at)
        SELECT id, employee_id, 'check_in', check_in_photo_data, COALESCE(check_in_photo_mime, 'image/jpeg'), octet_length(check_in_photo_data), check_in_photo_key, COALESCE(check_in_timestamp, created_at)
        FROM attendance
        WHERE check_in_photo_data IS NOT NULL;
    """)


def downgrade() -> None:
    """Drop attendance_photos table."""
    op.drop_index(op.f('ix_attendance_photos_employee_id'), table_name='attendance_photos')
    op.drop_index(op.f('ix_attendance_photos_attendance_id'), table_name='attendance_photos')
    op.drop_index(op.f('ix_attendance_photos_id'), table_name='attendance_photos')
    op.drop_table('attendance_photos')
