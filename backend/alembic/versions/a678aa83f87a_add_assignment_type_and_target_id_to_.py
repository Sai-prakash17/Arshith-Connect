"""add_assignment_type_and_target_id_to_work_assignments

Revision ID: a678aa83f87a
Revises: 63b415bdeb95
Create Date: 2026-10-18 18:49:41.937856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a678aa83f87a'
down_revision: Union[str, Sequence[str], None] = '63b415bdeb95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'work_assignments',
        sa.Column('assignment_type', sa.String(length=50), server_default='Individual', nullable=False),
    )
    op.add_column(
        'work_assignments',
        sa.Column('target_id', sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('work_assignments', 'target_id')
    op.drop_column('work_assignments', 'assignment_type')
