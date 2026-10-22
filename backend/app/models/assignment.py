from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class WorkAssignment(Base):
    __tablename__ = "work_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    task_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)  # "TSK-001"
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Employee Name or ID or Team
    assigned_by: Mapped[str] = mapped_column(String(100), default="Administrator", nullable=False)
    assignment_type: Mapped[str] = mapped_column(String(50), default="Individual", nullable=False)  # "Individual" or "Team"
    target_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Employee ID or Team ID
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="High", nullable=False)  # "High", "Medium", "Low"
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 to 100
    status: Mapped[str] = mapped_column(String(50), default="In Progress", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
