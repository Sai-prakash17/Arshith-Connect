"""add_approved_at_to_leaves

Revision ID: 9131e752cd7e
Revises: a157372af559
Create Date: 2026-10-18 17:30:15.835709

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9131e752cd7e'
down_revision: Union[str, Sequence[str], None] = 'a157372af559'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('leaves', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('leaves', 'approved_at')
