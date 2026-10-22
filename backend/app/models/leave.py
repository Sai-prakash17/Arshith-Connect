from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Leave(Base):
    __tablename__ = "leaves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    leave_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # "LV-001"
    employee_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "Casual Leave", "Sick Leave", "Earned Leave"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_type: Mapped[str] = mapped_column(String(50), default="Full-Day Leave", nullable=False)
    start_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    end_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    hours_count: Mapped[Optional[float]] = mapped_column(nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)  # "Pending", "Approved", "Rejected"
    applied_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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

    employee = relationship("Employee", back_populates="leaves")
