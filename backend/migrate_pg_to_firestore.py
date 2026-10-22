"""
PostgreSQL to Cloud Firestore Migration Script for Arshith Connect
Transfers all users, employees, attendance, leaves, holidays, meetings, announcements,
teams, work assignments, work updates, registration requests, and office timings into Cloud Firestore.
"""

import os
import json
import logging
from datetime import datetime, date, timezone
from typing import Dict, Any

from app.core.config import settings
from app.core.firebase import init_firebase, get_firestore_client, is_firebase_live
from app.services.firestore_service import FirestoreService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")


def load_export_data() -> Dict[str, Any]:
    """Load exported data from postgres_backup_data.json or directly from PostgreSQL."""
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "postgres_backup_data.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback to running export_pg_data.py
    logger.info("postgres_backup_data.json not found, running export...")
    from export_pg_data import export_all
    export_all()
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def migrate_to_firestore():
    logger.info("=" * 70)
    logger.info("ARSHITH CONNECT: POSTGRESQL -> CLOUD FIRESTORE MIGRATION")
    logger.info("=" * 70)
    logger.info(f"Target Firebase Project ID : {settings.FIREBASE_PROJECT_ID}")
    logger.info(f"Target Firestore Database  : {settings.FIREBASE_DATABASE_NAME}")

    is_live = init_firebase()
    fs = get_firestore_client()

    if not is_live or fs is None:
        logger.warning(
            "Firebase Admin is not connected to a live cloud project.\n"
            "Data will be synchronized to the local Firestore-compatible store.\n"
            "To migrate to live Google Cloud Firestore:\n"
            "1. Download your service account key from Firebase Console > Project Settings > Service Accounts\n"
            "2. Save it as backend/serviceAccountKey.json\n"
            f"3. Ensure FIREBASE_DATABASE_NAME='{settings.FIREBASE_DATABASE_NAME}' in backend/.env\n"
            "4. Re-run this migration script: python migrate_pg_to_firestore.py"
        )

    data = load_export_data()
    summary = {}

    # 1. Users Collection
    users = data.get("users", [])
    logger.info(f"Migrating {len(users)} users...")
    for u in users:
        doc_id = str(u.get("id"))
        FirestoreService.save("users", doc_id, u)
    summary["users"] = len(users)

    # 2. Employees Collection
    employees = data.get("employees", [])
    logger.info(f"Migrating {len(employees)} employees...")
    for e in employees:
        doc_id = e.get("employee_id") or str(e.get("id"))
        FirestoreService.save("employees", doc_id, e)
    summary["employees"] = len(employees)

    # 3. Attendance Collection
    attendances = data.get("attendances", [])
    logger.info(f"Migrating {len(attendances)} attendance records...")
    for a in attendances:
        doc_id = f"{a.get('employee_id')}_{a.get('date')}" if a.get("employee_id") and a.get("date") else str(a.get("id"))
        FirestoreService.save("attendance", doc_id, a)
    summary["attendance"] = len(attendances)

    # 4. Leaves Collection
    leaves = data.get("leaves", [])
    logger.info(f"Migrating {len(leaves)} leave records...")
    for l in leaves:
        doc_id = l.get("leave_code") or str(l.get("id"))
        FirestoreService.save("leaves", doc_id, l)
    summary["leaves"] = len(leaves)

    # 5. Holidays Collection
    holidays = data.get("holidays", [])
    logger.info(f"Migrating {len(holidays)} holiday records...")
    for h in holidays:
        doc_id = h.get("holiday_code") or str(h.get("id"))
        FirestoreService.save("holidays", doc_id, h)
    summary["holidays"] = len(holidays)

    # 6. Meetings Collection
    meetings = data.get("meetings", [])
    logger.info(f"Migrating {len(meetings)} meeting records...")
    for m in meetings:
        doc_id = m.get("meeting_code") or str(m.get("id"))
        FirestoreService.save("meetings", doc_id, m)
    summary["meetings"] = len(meetings)

    # 7. Announcements Collection
    announcements = data.get("announcements", [])
    logger.info(f"Migrating {len(announcements)} announcements...")
    for an in announcements:
        doc_id = an.get("announcement_code") or str(an.get("id"))
        FirestoreService.save("announcements", doc_id, an)
    summary["announcements"] = len(announcements)

    # 8. Teams Collection
    teams = data.get("teams", [])
    logger.info(f"Migrating {len(teams)} teams...")
    for t in teams:
        doc_id = str(t.get("name") or t.get("id"))
        FirestoreService.save("teams", doc_id, t)
    summary["teams"] = len(teams)

    # 9. Work Assignments Collection
    assignments = data.get("assignments", [])
    logger.info(f"Migrating {len(assignments)} work assignments...")
    for wa in assignments:
        doc_id = wa.get("task_code") or str(wa.get("id"))
        FirestoreService.save("work_assignments", doc_id, wa)
    summary["work_assignments"] = len(assignments)

    # 10. Work Updates Collection
    updates = data.get("work_updates", [])
    logger.info(f"Migrating {len(updates)} work updates...")
    for wu in updates:
        doc_id = wu.get("update_code") or str(wu.get("id"))
        FirestoreService.save("work_updates", doc_id, wu)
    summary["work_updates"] = len(updates)

    # 11. Registration Requests Collection
    reg_reqs = data.get("registration_requests", [])
    logger.info(f"Migrating {len(reg_reqs)} registration requests...")
    for rr in reg_reqs:
        doc_id = rr.get("request_code") or str(rr.get("id"))
        FirestoreService.save("registration_requests", doc_id, rr)
    summary["registration_requests"] = len(reg_reqs)

    # 12. Office Timings Collection
    timings = data.get("office_timings", [])
    logger.info(f"Migrating {len(timings)} office timings...")
    for ot in timings:
        doc_id = str(ot.get("timing_type", "REGULAR")).lower()
        FirestoreService.save("office_timings", doc_id, ot)
    summary["office_timings"] = len(timings)

    # 13. Office Configuration (Official Geofence Coordinates)
    office_config = {
        "id": "main_office",
        "officeName": "HQ Office",
        "officeAddress": "Bengaluru, Karnataka",
        "latitude": settings.COMPANY_OFFICE_LATITUDE,
        "longitude": settings.COMPANY_OFFICE_LONGITUDE,
        "radiusMeters": settings.OFFICE_GEOFENCE_RADIUS_METERS,
        "maxAccuracyMeters": settings.MAX_GPS_ACCURACY_METERS,
        "timezone": settings.ATTENDANCE_TIMEZONE,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    FirestoreService.save("office_config", "main_office", office_config)
    summary["office_config"] = 1

    logger.info("=" * 70)
    logger.info("MIGRATION SUMMARY")
    logger.info("=" * 70)
    for k, count in summary.items():
        logger.info(f"  ✓ {k.ljust(25)}: {count} documents migrated")
    logger.info("=" * 70)
    logger.info("Cloud Firestore migration script finished successfully.")


if __name__ == "__main__":
    migrate_to_firestore()
