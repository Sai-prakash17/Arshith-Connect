from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class OfficeTiming(Base):
    __tablename__ = "office_timings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    timing_type: Mapped[str] = mapped_column(String(50), default="REGULAR", nullable=False)  # "REGULAR" or "SPECIAL"
    start_time: Mapped[str] = mapped_column(String(20), default="09:30", nullable=False)
    end_time: Mapped[str] = mapped_column(String(20), default="18:30", nullable=False)
    grace_minutes: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    special_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    special_occasion: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

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
