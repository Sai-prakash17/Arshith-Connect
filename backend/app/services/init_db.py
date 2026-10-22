from datetime import date
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.user import User
from app.models.employee import Employee
from app.models.office_timing import OfficeTiming
from app.models.holiday import Holiday
from app.models.announcement import Announcement
from app.models.meeting import Meeting
from app.models.team import Team, TeamMember
from app.models.assignment import WorkAssignment
from app.models.work_update import WorkUpdate
from app.models.attendance import Attendance


def init_db(db: Session) -> None:
    """Initialize database with default admin account, office timings, and sample structure."""
    # 1. Ensure Default Admin User exists
    admin_email = "admin@arshith.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash("AdminPassword@123"),
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.flush()

        admin_emp = Employee(
            employee_id="ADM-001",
            user_id=admin_user.id,
            full_name="Administrator",
            email=admin_email,
            phone="--",
            department="Operations",
            designation="Administrator",
            status="Active",
            shift="General (09:30 AM - 06:30 PM)",
            location="HQ Office",
        )
        db.add(admin_emp)

    # 2. Ensure Regular Office Timing exists
    regular_timing = db.query(OfficeTiming).filter(OfficeTiming.timing_type == "REGULAR").first()
    if not regular_timing:
        regular_timing = OfficeTiming(
            timing_type="REGULAR",
            start_time="09:30",
            end_time="18:30",
            grace_minutes=2,
        )
        db.add(regular_timing)

    db.commit()


if __name__ == "__main__":
    from app.db.session import SessionLocal
    with SessionLocal() as db_session:
        init_db(db_session)
        print("Database initialization completed successfully.")
