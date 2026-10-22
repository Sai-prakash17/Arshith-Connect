import json
from datetime import date, datetime
from app.db.session import SessionLocal, check_db_connection
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.attendance_photo import AttendancePhoto
from app.models.leave import Leave
from app.models.holiday import Holiday
from app.models.meeting import Meeting
from app.models.announcement import Announcement
from app.models.team import Team, TeamMember
from app.models.assignment import WorkAssignment
from app.models.work_update import WorkUpdate
from app.models.registration_request import RegistrationRequest
from app.models.office_timing import OfficeTiming


def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, bytes):
        return None  # binary photos handled separately
    raise TypeError(f"Type {type(obj)} not serializable")


def export_all():
    if not check_db_connection():
        print("Cannot connect to PostgreSQL to export data.")
        return

    export_data = {}
    with SessionLocal() as db:
        # Users
        users = []
        for u in db.query(User).all():
            users.append({
                "id": u.id,
                "email": u.email,
                "hashed_password": u.hashed_password,
                "role": u.role,
                "is_active": u.is_active,
                "approval_status": u.approval_status,
                "reviewed_by_id": u.reviewed_by_id,
                "reviewed_at": u.reviewed_at,
                "rejection_reason": u.rejection_reason,
                "created_at": u.created_at,
                "updated_at": u.updated_at,
            })
        export_data["users"] = users

        # Employees
        employees = []
        for e in db.query(Employee).all():
            employees.append({
                "id": e.id,
                "employee_id": e.employee_id,
                "user_id": e.user_id,
                "full_name": e.full_name,
                "email": e.email,
                "phone": e.phone,
                "department": e.department,
                "designation": e.designation,
                "joining_date": e.joining_date,
                "status": e.status,
                "shift": e.shift,
                "location": e.location,
                "attendance_percentage": e.attendance_percentage,
                "created_at": e.created_at,
                "updated_at": e.updated_at,
            })
        export_data["employees"] = employees

        # Attendance
        attendances = []
        for a in db.query(Attendance).all():
            attendances.append({
                "id": a.id,
                "employee_id": a.employee_id,
                "date": a.date,
                "check_in_time": a.check_in_time,
                "check_out_time": a.check_out_time,
                "check_in_timestamp": a.check_in_timestamp,
                "check_out_timestamp": a.check_out_timestamp,
                "work_mode": a.work_mode,
                "status": a.status,
                "duration": a.duration,
                "is_late": a.is_late,
                "check_in_latitude": a.check_in_latitude,
                "check_in_longitude": a.check_in_longitude,
                "check_in_location_accuracy": a.check_in_location_accuracy,
                "check_out_latitude": a.check_out_latitude,
                "check_out_longitude": a.check_out_longitude,
                "check_out_location_accuracy": a.check_out_location_accuracy,
                "check_in_photo_key": a.check_in_photo_key,
                "check_out_photo_key": a.check_out_photo_key,
                "has_check_in_photo": bool(a.check_in_photo_data or a.check_in_photo_key),
                "created_at": a.created_at,
                "updated_at": a.updated_at,
            })
        export_data["attendances"] = attendances

        # Leaves
        leaves = []
        for l in db.query(Leave).all():
            leaves.append({
                "id": l.id,
                "leave_code": l.leave_code,
                "employee_id": l.employee_id,
                "employee_name": l.employee_name,
                "leave_type": l.leave_type,
                "start_date": l.start_date,
                "end_date": l.end_date,
                "days_count": l.days_count,
                "duration_type": l.duration_type,
                "start_time": l.start_time,
                "end_time": l.end_time,
                "hours_count": l.hours_count,
                "reason": l.reason,
                "status": l.status,
                "applied_date": l.applied_date,
                "reviewed_by": l.reviewed_by,
                "approved_at": l.approved_at,
                "rejection_remarks": l.rejection_remarks,
                "created_at": l.created_at,
                "updated_at": l.updated_at,
            })
        export_data["leaves"] = leaves

        # Holidays
        holidays = []
        for h in db.query(Holiday).all():
            holidays.append({
                "id": h.id,
                "holiday_code": h.holiday_code,
                "name": h.name,
                "date": h.date,
                "description": h.description,
                "type": h.type,
                "created_at": h.created_at,
                "updated_at": h.updated_at,
            })
        export_data["holidays"] = holidays

        # Meetings
        meetings = []
        for m in db.query(Meeting).all():
            meetings.append({
                "id": m.id,
                "meeting_code": m.meeting_code,
                "title": m.title,
                "date": m.date,
                "time": m.time,
                "duration": m.duration,
                "organizer": m.organizer,
                "platform": m.platform,
                "link": m.link,
                "attendees": m.attendees,
                "description": m.description,
                "status": m.status,
                "recipient_type": m.recipient_type,
                "recipient_ids": m.recipient_ids,
                "created_at": m.created_at,
                "updated_at": m.updated_at,
            })
        export_data["meetings"] = meetings

        # Announcements
        announcements = []
        for an in db.query(Announcement).all():
            announcements.append({
                "id": an.id,
                "announcement_code": an.announcement_code,
                "title": an.title,
                "message": an.message,
                "author": an.author,
                "date": an.date,
                "priority": an.priority,
                "announcement_type": an.announcement_type,
                "recipient_type": an.recipient_type,
                "recipient_ids": an.recipient_ids,
                "is_active": an.is_active,
                "created_at": an.created_at,
                "updated_at": an.updated_at,
            })
        export_data["announcements"] = announcements

        # Teams
        teams = []
        for t in db.query(Team).all():
            members = [tm.employee_id for tm in t.members]
            teams.append({
                "id": t.id,
                "name": t.name,
                "department": t.department,
                "description": t.description,
                "leader": t.leader,
                "members": members,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            })
        export_data["teams"] = teams

        # Assignments
        assignments = []
        for wa in db.query(WorkAssignment).all():
            assignments.append({
                "id": wa.id,
                "task_code": wa.task_code,
                "title": wa.title,
                "description": wa.description,
                "assigned_to": wa.assigned_to,
                "assigned_by": wa.assigned_by,
                "assignment_type": wa.assignment_type,
                "target_id": wa.target_id,
                "deadline": wa.deadline,
                "priority": wa.priority,
                "progress": wa.progress,
                "status": wa.status,
                "created_at": wa.created_at,
                "updated_at": wa.updated_at,
            })
        export_data["assignments"] = assignments

        # Work Updates
        work_updates = []
        for wu in db.query(WorkUpdate).all():
            work_updates.append({
                "id": wu.id,
                "update_code": wu.update_code,
                "employee_id": wu.employee_id,
                "employee_name": wu.employee_name,
                "date": wu.date,
                "time": wu.time,
                "tag": wu.tag,
                "tasks_completed": wu.tasks_completed,
                "blockers": wu.blockers,
                "created_at": wu.created_at,
                "updated_at": wu.updated_at,
            })
        export_data["work_updates"] = work_updates

        # Registration Requests
        reg_requests = []
        for rr in db.query(RegistrationRequest).all():
            reg_requests.append({
                "id": rr.id,
                "request_code": rr.request_code,
                "full_name": rr.full_name,
                "employee_id": rr.employee_id,
                "email": rr.email,
                "phone": rr.phone,
                "status": rr.status,
                "requested_date": rr.requested_date,
                "rejection_reason": rr.rejection_reason,
                "reviewed_by": rr.reviewed_by,
                "reviewed_at": rr.reviewed_at,
                "created_at": rr.created_at,
                "updated_at": rr.updated_at,
            })
        export_data["registration_requests"] = reg_requests

        # Office Timings
        office_timings = []
        for ot in db.query(OfficeTiming).all():
            office_timings.append({
                "id": ot.id,
                "timing_type": ot.timing_type,
                "start_time": ot.start_time,
                "end_time": ot.end_time,
                "grace_minutes": ot.grace_minutes,
                "special_date": ot.special_date,
                "special_occasion": ot.special_occasion,
                "created_at": ot.created_at,
                "updated_at": ot.updated_at,
            })
        export_data["office_timings"] = office_timings

    # Write to JSON files
    with open("postgres_backup_data.json", "w", encoding="utf-8") as f:
        json.dump(export_data, f, default=json_serial, indent=2)

    with open("../database_backup_export.json", "w", encoding="utf-8") as f:
        json.dump(export_data, f, default=json_serial, indent=2)

    print(f"Export completed successfully:")
    for k, v in export_data.items():
        print(f"  - {k}: {len(v)} records")


if __name__ == "__main__":
    export_all()
