from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import Integer, String, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    request_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)  # "REQ-001"
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    employee_id: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)  # "Pending", "Approved", "Rejected"
    requested_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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
