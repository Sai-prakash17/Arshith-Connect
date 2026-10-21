from datetime import datetime, timezone
import logging
from app.services.firestore_service import firestore_service
from app.core.security import get_password_hash

logger = logging.getLogger("uvicorn.error")


def init_firestore_seed():
    """Ensure default admin and office timings exist in Firestore."""
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Ensure Default Admin User exists
    admin_email = "admin@arshith.com"
    existing_users = firestore_service.list_documents("users", [("email", "==", admin_email)])
    if not existing_users:
        logger.info(f"Seeding default administrator ({admin_email}) in Firestore...")
        user_id = firestore_service.create_document("users", {
            "email": admin_email,
            "hashed_password": get_password_hash("AdminPassword@123"),
            "role": "admin",
            "is_active": True,
            "approval_status": "APPROVED",
            "created_at": now_iso,
            "updated_at": now_iso,
        })

        # Check corresponding employee
        existing_emp = firestore_service.list_documents("employees", [("employee_id", "==", "ADM-001")])
        if not existing_emp:
            firestore_service.create_document("employees", {
                "employee_id": "ADM-001",
                "user_id": user_id,
                "full_name": "Administrator",
                "email": admin_email,
                "phone": "--",
                "department": "Operations",
                "designation": "Administrator",
                "status": "Active",
                "shift": "General (09:30 AM - 06:30 PM)",
                "location": "HQ Office",
                "created_at": now_iso,
                "updated_at": now_iso,
            })

    # 2. Ensure Regular Office Timing exists
    timings = firestore_service.list_documents("office_timings", [("timing_type", "==", "REGULAR")])
    if not timings:
        logger.info("Seeding default regular office timing in Firestore...")
        firestore_service.create_document("office_timings", {
            "timing_type": "REGULAR",
            "start_time": "09:30",
            "end_time": "18:30",
            "grace_minutes": 2,
            "created_at": now_iso,
            "updated_at": now_iso,
        })
