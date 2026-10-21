from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class WorkUpdate(Base):
    __tablename__ = "work_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    update_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)  # "UPD-001"
    employee_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    employee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tag: Mapped[str] = mapped_column(String(100), default="Operations", nullable=False)
    tasks_completed: Mapped[str] = mapped_column(Text, nullable=False)
    blockers: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="None")

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
