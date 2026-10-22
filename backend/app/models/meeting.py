from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    duration: Mapped[str] = mapped_column(String(50), default="30 mins", nullable=False)
    organizer: Mapped[str] = mapped_column(String(100), default="Operations Lead", nullable=False)
    platform: Mapped[str] = mapped_column(String(100), default="Google Meet", nullable=False)
    link: Mapped[str] = mapped_column(String(255), default="https://meet.google.com/new", nullable=False)
    attendees: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Scheduled", nullable=False)
    recipient_type: Mapped[str] = mapped_column(String(50), default="All Employees", nullable=False)
    recipient_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    organizer_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    start_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    end_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

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
