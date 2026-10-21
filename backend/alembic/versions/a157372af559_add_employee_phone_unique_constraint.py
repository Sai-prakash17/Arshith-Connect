"""add_employee_phone_unique_constraint

Revision ID: a157372af559
Revises: fb4cf1a1d3d6
Create Date: 2026-10-18 14:28:52.972211

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a157372af559'
down_revision: Union[str, Sequence[str], None] = 'fb4cf1a1d3d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Normalize existing phone data in employees table
    op.execute("UPDATE employees SET phone = regexp_replace(phone, '[^0-9+]', '', 'g') WHERE phone IS NOT NULL AND phone != '--' AND phone != ''")
    
    # Create unique partial index on phone (ignoring null, empty, and '--')
    op.create_index(
        'uq_employees_phone',
        'employees',
        ['phone'],
        unique=True,
        postgresql_where=sa.text("phone IS NOT NULL AND phone != '' AND phone != '--'")
    )
    
    # Create functional unique partial index on normalized digits
    op.create_index(
        'uq_employees_phone_normalized',
        'employees',
        [sa.text("regexp_replace(phone, '[^0-9+]', '', 'g')")],
        unique=True,
        postgresql_where=sa.text("phone IS NOT NULL AND phone != '' AND phone != '--'")
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_employees_phone_normalized', table_name='employees')
    op.drop_index('uq_employees_phone', table_name='employees')
