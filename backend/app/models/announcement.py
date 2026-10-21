from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, Boolean, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    announcement_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="Admin Office", nullable=False)
    date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="Normal", nullable=False)  # "Normal", "High", "Urgent"
    announcement_type: Mapped[str] = mapped_column(String(50), default="General", nullable=False)  # "General", "Important", "Holiday", "Meeting"
    recipient_type: Mapped[str] = mapped_column(String(50), default="All Employees", nullable=False)  # "All Employees", "Selected Members"
    recipient_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
