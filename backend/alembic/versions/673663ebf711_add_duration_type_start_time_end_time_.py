"""add duration_type start_time end_time hours_count to leaves

Revision ID: 673663ebf711
Revises: cae2fb141e8b
Create Date: 2026-10-18 18:02:35.232843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '673663ebf711'
down_revision: Union[str, Sequence[str], None] = 'cae2fb141e8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('leaves', sa.Column('duration_type', sa.String(length=50), server_default='Full-Day Leave', nullable=False))
    op.add_column('leaves', sa.Column('start_time', sa.String(length=50), nullable=True))
    op.add_column('leaves', sa.Column('end_time', sa.String(length=50), nullable=True))
    op.add_column('leaves', sa.Column('hours_count', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('leaves', 'hours_count')
    op.drop_column('leaves', 'end_time')
    op.drop_column('leaves', 'start_time')
    op.drop_column('leaves', 'duration_type')
