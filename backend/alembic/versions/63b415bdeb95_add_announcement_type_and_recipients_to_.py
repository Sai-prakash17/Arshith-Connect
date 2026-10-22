"""add_announcement_type_and_recipients_to_announcements

Revision ID: 63b415bdeb95
Revises: 673663ebf711
Create Date: 2026-10-18 18:26:39.888179

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63b415bdeb95'
down_revision: Union[str, Sequence[str], None] = '673663ebf711'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'announcements',
        sa.Column('announcement_type', sa.String(length=50), server_default='General', nullable=False),
    )
    op.add_column(
        'announcements',
        sa.Column('recipient_type', sa.String(length=50), server_default='All Employees', nullable=False),
    )
    op.add_column('announcements', sa.Column('recipient_ids', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('announcements', 'recipient_ids')
    op.drop_column('announcements', 'recipient_type')
    op.drop_column('announcements', 'announcement_type')
