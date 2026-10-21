from datetime import date, datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, extract

from app.core.config import settings
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.leave import Leave
from app.models.holiday import Holiday
from app.models.meeting import Meeting
from app.models.announcement import Announcement
from app.models.assignment import WorkAssignment
from app.models.employee import Employee
from app.models.user import User
from app.dependencies.auth import get_current_user, get_current_admin, get_current_employee
from app.routers.attendance import format_attendance_response
from app.routers.meetings import format_meeting_response
from app.routers.announcements import format_announcement_response
from app.routers.assignments import format_assignment_response
from app.services.firestore_service import FirestoreService
from app.services.attendance_service import get_attendance_today

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


@router.get("/admin")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Compute real dashboard headline metrics and feeds for Administrator."""
    today = get_attendance_today()
    today_iso = today.isoformat()
    admin_email = getattr(admin_user, "email", "admin@arshith.com")
    admin_id = getattr(admin_user, "id", 1)

    if settings.DATABASE_BACKEND == "firebase":
        # 1. Today's attendance records from Firestore
        today_records = FirestoreService.query("attendance", {"date": today_iso})
        total_present = len([r for r in today_records if r.get("status") in ["Present", "Late", "Completed"]])
        wfo_count = len([r for r in today_records if r.get("work_mode") == "WFO" and r.get("status") in ["Present", "Late", "Completed"]])
        wfh_count = len([r for r in today_records if r.get("work_mode") == "WFH" and r.get("status") in ["Present", "Late", "Completed"]])
        late_count = len([r for r in today_records if r.get("is_late") or r.get("status") == "Late"])

        # 2. Pending leaves
        leaves = FirestoreService.list_all("leaves")
        pending_leaves = len([l for l in leaves if str(l.get("status", "")).strip().lower() == "pending"])

        # 3. This month's holidays
        all_holidays = FirestoreService.list_all("holidays")
        this_month_holidays = 0
        for h in all_holidays:
            d_str = str(h.get("date", ""))
            try:
                hd = date.fromisoformat(d_str)
                if hd.year == today.year and hd.month == today.month:
                    this_month_holidays += 1
            except Exception:
                pass

        # 4. Announcements
        announcements = FirestoreService.query("announcements", {"is_active": True})
        announcements.sort(key=lambda x: str(x.get("date", "")), reverse=True)

        # 5. Meetings
        meetings = FirestoreService.list_all("meetings")
        upcoming_meetings = []
        for m in meetings:
            d_str = str(m.get("date", ""))
            try:
                md = date.fromisoformat(d_str)
                if md >= today:
                    upcoming_meetings.append(m)
            except Exception:
                upcoming_meetings.append(m)
        upcoming_meetings.sort(key=lambda x: (str(x.get("date", "")), str(x.get("time", ""))))

        # Admin name
        admin_emps = FirestoreService.query("employees", {"email": admin_email})
        admin_name = admin_emps[0].get("full_name") if admin_emps else "Administrator"

        return {
            "adminName": admin_name,
            "adminEmail": admin_email,
            "stats": {
                "totalPresent": total_present,
                "wfo": wfo_count,
                "wfh": wfh_count,
                "late": late_count,
                "pendingLeaves": pending_leaves,
                "thisMonthHolidays": this_month_holidays,
            },
            "announcements": [format_announcement_response(a) for a in announcements[:5]],
            "meetings": [format_meeting_response(m) for m in upcoming_meetings[:5]],
            "recentAttendance": [format_attendance_response(r) for r in today_records[:8]],
        }

    # PostgreSQL fallback
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    total_present = len([r for r in today_records if r.status in ["Present", "Late", "Completed"]])
    wfo_count = len([r for r in today_records if r.work_mode == "WFO" and r.status in ["Present", "Late", "Completed"]])
    wfh_count = len([r for r in today_records if r.work_mode == "WFH" and r.status in ["Present", "Late", "Completed"]])
    late_count = len([r for r in today_records if r.is_late or r.status == "Late"])

    pending_leaves = db.query(Leave).filter(Leave.status == "Pending").count()
    this_month_holidays = (
        db.query(Holiday)
        .filter(
            extract("year", Holiday.date) == today.year,
            extract("month", Holiday.date) == today.month,
        )
        .count()
    )

    recent_announcements = (
        db.query(Announcement)
        .filter(Announcement.is_active == True)
        .order_by(desc(Announcement.date), desc(Announcement.id))
        .limit(5)
        .all()
    )

    today_meetings = (
        db.query(Meeting)
        .filter(Meeting.date >= today)
        .order_by(Meeting.date.asc(), Meeting.time.asc())
        .limit(5)
        .all()
    )

    admin_emp = db.query(Employee).filter(Employee.user_id == admin_user.id).first()
    admin_name = admin_emp.full_name if admin_emp else "Administrator"

    return {
        "adminName": admin_name,
        "adminEmail": admin_user.email,
        "stats": {
            "totalPresent": total_present,
            "wfo": wfo_count,
            "wfh": wfh_count,
            "late": late_count,
            "pendingLeaves": pending_leaves,
            "thisMonthHolidays": this_month_holidays,
        },
        "announcements": [format_announcement_response(a) for a in recent_announcements],
        "meetings": [format_meeting_response(m) for m in today_meetings],
        "recentAttendance": [format_attendance_response(r) for r in today_records[:8]],
    }


@router.get("/employee")
def get_employee_dashboard(
    db: Session = Depends(get_db),
    employee=Depends(get_current_employee),
):
    """Retrieve customized workforce metrics, daily clock state, and feeds for authenticated employee."""
    today = get_attendance_today()
    today_iso = today.isoformat()
    emp_id = getattr(employee, "employee_id", None) or getattr(employee, "employeeId", None)
    emp_name = getattr(employee, "full_name", None) or getattr(employee, "fullName", None) or "Employee"
    emp_dept = getattr(employee, "department", "Operations")
    emp_desig = getattr(employee, "designation", "Employee")

    if settings.DATABASE_BACKEND == "firebase":
        records = FirestoreService.query("attendance", {"employee_id": emp_id, "date": today_iso})
        att = records[0] if records else None

        is_completed = bool(att and att.get("check_out_time"))
        is_checked_in = bool(att and att.get("check_in_time") and not is_completed)
        status_display = "Completed" if is_completed else (att.get("status") if att else "Not Checked In")

        today_status = {
            "isCheckedIn": is_checked_in,
            "isCompleted": is_completed,
            "checkInTime": att.get("check_in_time") if att else "--",
            "checkOutTime": att.get("check_out_time") if att else "--",
            "workMode": att.get("work_mode", "WFO") if att else "WFO",
            "workingDuration": att.get("duration", "--") if att else "--",
            "status": status_display,
            "checkInTimestamp": att.get("check_in_timestamp") if att else None,
            "checkOutTimestamp": att.get("check_out_timestamp") if att else None,
            "hasCheckInPhoto": bool(att and (att.get("hasCheckInPhoto") or att.get("check_in_photo_key") or att.get("check_in_photo_storage_path"))),
        }

        # Monthly summary
        all_emp_att = FirestoreService.query("attendance", {"employee_id": emp_id})
        monthly_records = []
        for r in all_emp_att:
            d_str = str(r.get("date", ""))
            try:
                ad = date.fromisoformat(d_str)
                if ad.year == today.year and ad.month == today.month:
                    monthly_records.append(r)
            except Exception:
                pass

        days_present = len([r for r in monthly_records if r.get("status") in ["Present", "Late", "Completed"]])
        days_wfo = len([r for r in monthly_records if r.get("work_mode") == "WFO" and r.get("status") in ["Present", "Late", "Completed"]])
        days_wfh = len([r for r in monthly_records if r.get("work_mode") == "WFH" and r.get("status") in ["Present", "Late", "Completed"]])

        # Announcements
        announcements = FirestoreService.query("announcements", {"is_active": True})
        announcements.sort(key=lambda x: str(x.get("date", "")), reverse=True)

        # Meetings
        meetings = FirestoreService.list_all("meetings")
        upcoming_meetings = []
        for m in meetings:
            d_str = str(m.get("date", ""))
            try:
                md = date.fromisoformat(d_str)
                if md >= today:
                    upcoming_meetings.append(m)
            except Exception:
                upcoming_meetings.append(m)
        upcoming_meetings.sort(key=lambda x: (str(x.get("date", "")), str(x.get("time", ""))))

        # Assignments
        assignments = FirestoreService.list_all("work_assignments")

        return {
            "employeeName": emp_name,
            "employeeId": emp_id,
            "department": emp_dept,
            "designation": emp_desig,
            "todayAttendance": today_status,
            "monthlyStats": {
                "daysPresent": days_present,
                "daysWfo": days_wfo,
                "daysWfh": days_wfh,
            },
            "announcements": [format_announcement_response(a) for a in announcements[:5]],
            "meetings": [format_meeting_response(m) for m in upcoming_meetings[:5]],
            "assignments": [format_assignment_response(t) for t in assignments[:5]],
        }

    # PostgreSQL fallback
    att = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee.employee_id, Attendance.date == today)
        .first()
    )
    is_completed = bool(att and att.check_out_time)
    is_checked_in = bool(att and att.check_in_time and not is_completed)
    status_display = "Completed" if is_completed else (att.status if att else "Not Checked In")

    today_status = {
        "isCheckedIn": is_checked_in,
        "isCompleted": is_completed,
        "checkInTime": att.check_in_time if att else "--",
        "checkOutTime": att.check_out_time if att else "--",
        "workMode": att.work_mode if att else "--",
        "workingDuration": att.duration if att else "--",
        "status": status_display,
        "checkInTimestamp": att.check_in_timestamp.isoformat() if att and att.check_in_timestamp else None,
        "checkOutTimestamp": att.check_out_timestamp.isoformat() if att and att.check_out_timestamp else None,
        "hasCheckInPhoto": bool(att and att.check_in_photo_key),
    }

    monthly_records = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee.employee_id,
            extract("year", Attendance.date) == today.year,
            extract("month", Attendance.date) == today.month,
        )
        .all()
    )
    days_present = len([r for r in monthly_records if r.status in ["Present", "Late", "Completed"]])
    days_wfo = len([r for r in monthly_records if r.work_mode == "WFO" and r.status in ["Present", "Late", "Completed"]])
    days_wfh = len([r for r in monthly_records if r.work_mode == "WFH" and r.status in ["Present", "Late", "Completed"]])

    recent_announcements = (
        db.query(Announcement)
        .filter(Announcement.is_active == True)
        .order_by(desc(Announcement.date), desc(Announcement.id))
        .limit(5)
        .all()
    )

    upcoming_meetings = (
        db.query(Meeting)
        .filter(Meeting.date >= today)
        .order_by(Meeting.date.asc(), Meeting.time.asc())
        .limit(5)
        .all()
    )

    assignments = (
        db.query(WorkAssignment)
        .order_by(desc(WorkAssignment.id))
        .limit(5)
        .all()
    )

    return {
        "employeeName": employee.full_name,
        "employeeId": employee.employee_id,
        "department": employee.department,
        "designation": employee.designation,
        "todayAttendance": today_status,
        "monthlyStats": {
            "daysPresent": days_present,
            "daysWfo": days_wfo,
            "daysWfh": days_wfh,
        },
        "announcements": [format_announcement_response(a) for a in recent_announcements],
        "meetings": [format_meeting_response(m) for m in upcoming_meetings],
        "assignments": [format_assignment_response(t) for t in assignments],
    }
