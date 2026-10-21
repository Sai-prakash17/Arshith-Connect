"""add recipient and organizer fields to meetings

Revision ID: cae2fb141e8b
Revises: 9131e752cd7e
Create Date: 2026-10-18 17:51:00.087225

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cae2fb141e8b'
down_revision: Union[str, Sequence[str], None] = '9131e752cd7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('meetings', sa.Column('recipient_type', sa.String(length=50), server_default='All Employees', nullable=False))
    op.add_column('meetings', sa.Column('recipient_ids', sa.Text(), nullable=True))
    op.add_column('meetings', sa.Column('organizer_id', sa.String(length=50), nullable=True))
    op.add_column('meetings', sa.Column('start_time', sa.String(length=50), nullable=True))
    op.add_column('meetings', sa.Column('end_time', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('meetings', 'end_time')
    op.drop_column('meetings', 'start_time')
    op.drop_column('meetings', 'organizer_id')
    op.drop_column('meetings', 'recipient_ids')
    op.drop_column('meetings', 'recipient_type')
