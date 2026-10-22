import os
from datetime import datetime, date, timezone
from typing import List, Optional, Any
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.firebase import is_firebase_live, get_storage_bucket
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.attendance_photo import AttendancePhoto
from app.models.employee import Employee
from app.models.office_timing import OfficeTiming
from app.models.user import User
from app.schemas.attendance import (
    AttendanceRecordUpdate,
    AttendanceTodayStatusResponse,
    OfficeLocationResponse,
    LocationValidationRequest,
)
from app.dependencies.auth import get_current_user, get_current_admin, get_current_employee
from app.services.attendance_service import (
    get_attendance_today,
    get_attendance_now,
    format_duration_str,
    validate_and_save_attendance_photo,
    upload_to_firebase_storage,
    resolve_photo_path,
    cleanup_photo_file,
    calculate_haversine_distance_meters,
    verify_wfo_geofence,
    get_employee_authorized_work_mode,
)
from app.services.firestore_service import FirestoreService

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def format_attendance_response(att: Any, emp: Optional[Any] = None) -> dict:
    """Format attendance record from either dict (Firestore) or ORM model (PostgreSQL)."""
    if isinstance(att, dict):
        emp_id = att.get("employee_id") or att.get("employeeId") or ""
        emp_name = att.get("employeeName") or att.get("name")
        if not emp_name:
            if isinstance(emp, dict):
                emp_name = emp.get("name") or emp.get("full_name") or emp.get("fullName")
            elif emp is not None:
                emp_name = getattr(emp, "name", None) or getattr(emp, "full_name", None)
        if not emp_name:
            emp_name = "Employee"

        emp_dept = att.get("department")
        if not emp_dept:
            if isinstance(emp, dict):
                emp_dept = emp.get("department")
            elif emp is not None:
                emp_dept = getattr(emp, "department", None)
        if not emp_dept:
            emp_dept = "Operations"

        date_val = att.get("date", "")
        if isinstance(date_val, (date, datetime)):
            date_str = date_val.isoformat()
            weekday_name = date_val.strftime("%A")
        else:
            date_str = str(date_val)
            try:
                weekday_name = date.fromisoformat(date_str).strftime("%A")
            except Exception:
                weekday_name = ""

        storage_path = (
            att.get("checkInPhotoPath")
            or att.get("check_in_photo_storage_path")
            or att.get("checkInPhotoStoragePath")
            or att.get("check_in_photo_key")
        )

        has_photo = bool(
            att.get("hasCheckInPhoto")
            or storage_path
            or att.get("check_in_photo_url")
            or att.get("checkInPhotoUrl")
            or att.get("photoUrl")
        )

        photo_url = att.get("check_in_photo_url") or att.get("checkInPhotoUrl") or att.get("photoUrl")
        if not photo_url and has_photo:
            photo_url = f"/api/attendance/{att.get('id')}/photo/check-in"

        emp_uid = att.get("employee_uid") or att.get("employeeUid")
        if not emp_uid and isinstance(emp, dict):
            emp_uid = emp.get("uid") or emp.get("id")

        return {
            "id": att.get("id"),
            "employeeId": emp_id,
            "employeeName": emp_name,
            "department": emp_dept,
            "date": date_str,
            "day": weekday_name,
            "checkIn": att.get("check_in_time") or att.get("checkIn") or "--",
            "checkOut": att.get("check_out_time") or att.get("checkOut") or "--",
            "workMode": att.get("work_mode") or att.get("workMode") or "WFO",
            "status": att.get("status", "Present"),
            "duration": att.get("duration") or "--",
            "isLate": bool(att.get("is_late") or att.get("isLate")),
            "checkInLatitude": att.get("check_in_latitude") or att.get("checkInLatitude"),
            "checkInLongitude": att.get("check_in_longitude") or att.get("checkInLongitude"),
            "checkInLocationAccuracy": att.get("check_in_location_accuracy") or att.get("checkInLocationAccuracy"),
            "checkOutLatitude": att.get("check_out_latitude") or att.get("checkOutLatitude"),
            "checkOutLongitude": att.get("check_out_longitude") or att.get("checkOutLongitude"),
            "hasCheckInPhoto": has_photo,
            "hasCheckOutPhoto": bool(att.get("hasCheckOutPhoto") or att.get("check_out_photo_key")),
            "checkInPhotoPath": storage_path,
            "photoPath": storage_path,
            "checkInPhotoUrl": photo_url,
            "photoUrl": photo_url,
            "employeeUid": emp_uid,
        }

    # SQLAlchemy model handling
    emp_name = emp.full_name if emp else (att.employee.full_name if att.employee else "Employee")
    emp_dept = emp.department if emp else (att.employee.department if att.employee else "Operations")
    weekday_name = att.date.strftime("%A") if att.date else ""

    return {
        "id": att.id,
        "employeeId": att.employee_id,
        "employeeName": emp_name,
        "department": emp_dept,
        "date": att.date.isoformat() if att.date else "",
        "day": weekday_name,
        "checkIn": att.check_in_time or "--",
        "checkOut": att.check_out_time or "--",
        "workMode": att.work_mode,
        "status": att.status,
        "duration": att.duration or "--",
        "isLate": att.is_late,
        "checkInLatitude": att.check_in_latitude,
        "checkInLongitude": att.check_in_longitude,
        "checkInLocationAccuracy": att.check_in_location_accuracy,
        "checkOutLatitude": att.check_out_latitude,
        "checkOutLongitude": att.check_out_longitude,
        "hasCheckInPhoto": bool(
            att.check_in_photo_data is not None
            or att.check_in_photo_key
            or (hasattr(att, "photos") and bool(att.photos))
        ),
        "hasCheckOutPhoto": bool(
            att.check_out_photo_data is not None
            or att.check_out_photo_key
        ),
    }


def is_checkin_late(now: datetime, db: Session) -> bool:
    """Check if check-in time is past office start time + grace period in configured timezone."""
    if settings.DATABASE_BACKEND == "firebase":
        timings = FirestoreService.query("office_timings", {"timing_type": "REGULAR"})
        timing = timings[0] if timings else {}
        start_str = timing.get("start_time", "09:30")
        grace = timing.get("grace_minutes", 2)
    else:
        timing = db.query(OfficeTiming).filter(OfficeTiming.timing_type == "REGULAR").first()
        start_str = timing.start_time if timing else "09:30"
        grace = timing.grace_minutes if timing else 2

    try:
        sh, sm = [int(p) for p in start_str.split(":")]
        cutoff_minutes = sh * 60 + sm + grace
        current_minutes = now.hour * 60 + now.minute
        return current_minutes > cutoff_minutes
    except Exception:
        return (now.hour * 60 + now.minute) > (9 * 60 + 32)


@router.get("", response_model=List[dict])
@router.get("/records", response_model=List[dict])
def get_attendance_records(
    search: Optional[str] = Query(None),
    workMode: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    record_date: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all attendance records with optional search and filters via Firestore or PostgreSQL."""
    if settings.DATABASE_BACKEND == "firebase":
        records = FirestoreService.list_all("attendance")
        all_emps = {}
        for e in FirestoreService.list_all("employees"):
            for k in ("employee_id", "employeeId", "id", "uid"):
                val = e.get(k)
                if val:
                    all_emps[str(val)] = e

        filtered = []
        for r in records:
            emp_id = r.get("employee_id") or r.get("employeeId") or r.get("employee_uid") or r.get("employeeUid")
            emp = all_emps.get(str(emp_id), {}) if emp_id else {}
            emp_name = (
                r.get("employeeName")
                or r.get("name")
                or emp.get("name")
                or emp.get("full_name")
                or emp.get("fullName")
                or ""
            )
            emp_dept = r.get("department") or emp.get("department") or ""

            if search:
                s = search.strip().lower()
                if not (s in emp_name.lower() or s in str(emp_id).lower() or s in emp_dept.lower()):
                    continue

            if workMode and workMode not in ["ALL", "All Modes", "All"]:
                if str(r.get("work_mode", "")).strip().upper() != workMode.strip().upper():
                    continue

            if status_filter and status_filter.upper() != "ALL":
                if str(r.get("status", "")).strip().lower() != status_filter.strip().lower():
                    continue

            if record_date:
                if str(r.get("date", "")).strip() != record_date.strip():
                    continue

            filtered.append(format_attendance_response(r, emp))

        filtered.sort(key=lambda x: str(x.get("date", "")), reverse=True)
        return filtered

    # PostgreSQL fallback
    query = db.query(Attendance).join(Employee, Attendance.employee_id == Employee.employee_id)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(s),
                Employee.employee_id.ilike(s),
                Employee.department.ilike(s),
            )
        )
    if workMode and workMode not in ["ALL", "All Modes", "All"]:
        query = query.filter(Attendance.work_mode == workMode.strip())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Attendance.status.ilike(status_filter.strip()))
    if record_date:
        try:
            d = date.fromisoformat(record_date)
            query = query.filter(Attendance.date == d)
        except ValueError:
            pass

    records = query.order_by(desc(Attendance.date), desc(Attendance.id)).all()
    return [format_attendance_response(r) for r in records]


@router.get("/me", response_model=List[dict])
def get_my_attendance_history(
    month: Optional[str] = Query(None),
    workMode: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    employee=Depends(get_current_employee),
):
    """Get personal attendance records for the authenticated employee."""
    emp_id = getattr(employee, "employee_id", None) or getattr(employee, "employeeId", None)

    if settings.DATABASE_BACKEND == "firebase":
        records = FirestoreService.query("attendance", {"employee_id": emp_id})
        filtered = []
        for r in records:
            if workMode and workMode != "All":
                if str(r.get("work_mode", "")).strip().upper() != workMode.strip().upper():
                    continue
            filtered.append(format_attendance_response(r, employee))
        filtered.sort(key=lambda x: str(x.get("date", "")), reverse=True)
        return filtered

    # PostgreSQL fallback
    query = db.query(Attendance).filter(Attendance.employee_id == emp_id)
    if workMode and workMode != "All":
        query = query.filter(Attendance.work_mode == workMode)

    records = query.order_by(desc(Attendance.date), desc(Attendance.id)).all()
    return [format_attendance_response(r, employee) for r in records]


@router.get("/office-location", response_model=OfficeLocationResponse)
def get_office_location():
    """
    Authoritative company office location and geofence parameters.
    Reads dynamically from Firestore office_config or falls back to backend settings.
    """
    if settings.DATABASE_BACKEND == "firebase":
        conf = FirestoreService.get_by_id("office_config", "main_office")
        if conf:
            return OfficeLocationResponse(
                officeName=conf.get("officeName", settings.COMPANY_OFFICE_NAME or "HQ Office"),
                address=conf.get("officeAddress", settings.COMPANY_OFFICE_ADDRESS or "Bengaluru, Karnataka"),
                latitude=conf.get("latitude", settings.COMPANY_OFFICE_LATITUDE),
                longitude=conf.get("longitude", settings.COMPANY_OFFICE_LONGITUDE),
                radiusMeters=conf.get("radiusMeters", settings.OFFICE_GEOFENCE_RADIUS_METERS),
                maxAccuracyMeters=conf.get("maxAccuracyMeters", settings.MAX_GPS_ACCURACY_METERS),
                timezone=conf.get("timezone", settings.ATTENDANCE_TIMEZONE),
            )

    return OfficeLocationResponse(
        officeName=settings.COMPANY_OFFICE_NAME,
        address=settings.COMPANY_OFFICE_ADDRESS,
        latitude=settings.COMPANY_OFFICE_LATITUDE,
        longitude=settings.COMPANY_OFFICE_LONGITUDE,
        radiusMeters=settings.OFFICE_GEOFENCE_RADIUS_METERS,
        maxAccuracyMeters=settings.MAX_GPS_ACCURACY_METERS,
        timezone=settings.ATTENDANCE_TIMEZONE,
    )


@router.post("/validate-location")
def validate_location(
    data: LocationValidationRequest,
    db: Session = Depends(get_db),
    employee=Depends(get_current_employee),
):
    """
    Authoritative backend pre-validation of employee GPS coordinates against configured office geofence.
    """
    target_mode = (data.workMode or "WFO").strip().upper()
    if "WFH" in target_mode:
        target_mode = "WFH"
    elif "WFO" in target_mode:
        target_mode = "WFO"
    else:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "valid": False,
                "code": "INVALID_WORK_MODE",
                "message": "Invalid work mode. Supported values are 'WFO' and 'WFH'.",
            },
        )

    if target_mode == "WFH":
        return {
            "valid": True,
            "workMode": "WFH",
            "isInsideOffice": True,
            "message": "Work From Home attendance permitted without office geofence restriction.",
            "distanceMeters": None,
            "allowedRadiusMeters": settings.OFFICE_GEOFENCE_RADIUS_METERS,
        }

    if data.latitude is None or data.longitude is None or data.accuracy is None:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "valid": False,
                "code": "MISSING_COORDINATES",
                "message": "GPS coordinates are required for Work From Office (WFO) verification.",
                "workMode": "WFO",
            },
        )

    report = verify_wfo_geofence(data.latitude, data.longitude, data.accuracy)
    if not report["valid"]:
        if report["code"] == "OUTSIDE_OFFICE_GEOFENCE":
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "valid": False,
                    "code": "OUTSIDE_OFFICE_GEOFENCE",
                    "message": report["message"],
                    "distanceMeters": report["distanceMeters"],
                    "allowedRadiusMeters": report["allowedRadiusMeters"],
                    "workMode": "WFO",
                },
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "valid": False,
                    "code": report["code"],
                    "message": report["message"],
                    "accuracy": report["accuracy"],
                    "maxAllowedAccuracy": report["maxAllowedAccuracy"],
                    "workMode": "WFO",
                },
            )

    return {
        "valid": True,
        "workMode": "WFO",
        "isInsideOffice": True,
        "distanceMeters": report["distanceMeters"],
        "allowedRadiusMeters": report["allowedRadiusMeters"],
        "message": report["message"],
    }


@router.get("/today", response_model=AttendanceTodayStatusResponse)
@router.get("/today-status", response_model=AttendanceTodayStatusResponse)
def get_today_attendance_status(
    db: Session = Depends(get_db),
    employee=Depends(get_current_employee),
):
    """Retrieve today's live check-in and punch state for the logged-in employee."""
    emp_id = getattr(employee, "employee_id", None) or getattr(employee, "employeeId", None)
    today = get_attendance_today()
    today_iso = today.isoformat()

    auth_mode = "WFO"
    try:
        auth_mode = get_employee_authorized_work_mode(employee)
    except Exception:
        auth_mode = "WFO"

    if settings.DATABASE_BACKEND == "firebase":
        records = FirestoreService.query("attendance", {"employee_id": emp_id, "date": today_iso})
        record = records[0] if records else None

        if not record:
            return AttendanceTodayStatusResponse(
                id=None,
                hasRecord=False,
                isCheckedIn=False,
                isCompleted=False,
                checkInTime="--",
                checkOutTime="--",
                workMode=auth_mode,
                authorizedWorkMode=auth_mode,
                workingDuration="--",
                status="Not Checked In",
                date=today_iso,
                isLate=False,
                checkInTimestamp=None,
                checkOutTimestamp=None,
                checkInLatitude=None,
                checkInLongitude=None,
                checkInLocationAccuracy=None,
                hasCheckInPhoto=False,
                hasCheckOutPhoto=False,
                canCheckIn=True,
                canCheckOut=False,
            )

        is_completed = bool(record.get("check_out_time"))
        is_checked_in = bool(record.get("check_in_time") and not is_completed)
        status_display = "Completed" if is_completed else record.get("status", "Present")

        return AttendanceTodayStatusResponse(
            id=record.get("id"),
            hasRecord=True,
            isCheckedIn=is_checked_in,
            isCompleted=is_completed,
            checkInTime=record.get("check_in_time") or "--",
            checkOutTime=record.get("check_out_time") or "--",
            workMode=record.get("work_mode", auth_mode),
            authorizedWorkMode=auth_mode,
            workingDuration=record.get("duration") or "--",
            status=status_display,
            date=today_iso,
            isLate=bool(record.get("is_late")),
            checkInTimestamp=record.get("check_in_timestamp"),
            checkOutTimestamp=record.get("check_out_timestamp"),
            checkInLatitude=record.get("check_in_latitude"),
            checkInLongitude=record.get("check_in_longitude"),
            hasCheckInPhoto=bool(
                record.get("hasCheckInPhoto")
                or record.get("check_in_photo_key")
                or record.get("check_in_photo_storage_path")
                or record.get("check_in_photo_url")
            ),
            hasCheckOutPhoto=bool(record.get("hasCheckOutPhoto") or record.get("check_out_photo_key")),
            canCheckIn=False,
            canCheckOut=is_checked_in,
        )

    # PostgreSQL fallback
    record = (
        db.query(Attendance)
        .filter(Attendance.employee_id == emp_id, Attendance.date == today)
        .first()
    )

    if not record:
        return AttendanceTodayStatusResponse(
            id=None,
            hasRecord=False,
            isCheckedIn=False,
            isCompleted=False,
            checkInTime="--",
            checkOutTime="--",
            workMode=auth_mode,
            authorizedWorkMode=auth_mode,
            workingDuration="--",
            status="Not Checked In",
            date=today_iso,
            isLate=False,
            checkInTimestamp=None,
            checkOutTimestamp=None,
            checkInLatitude=None,
            checkInLongitude=None,
            checkInLocationAccuracy=None,
            hasCheckInPhoto=False,
            hasCheckOutPhoto=False,
            canCheckIn=True,
            canCheckOut=False,
        )

    is_completed = bool(record.check_out_time)
    is_checked_in = bool(record.check_in_time and not is_completed)
    status_display = "Completed" if is_completed else record.status

    return AttendanceTodayStatusResponse(
        id=record.id,
        hasRecord=True,
        isCheckedIn=is_checked_in,
        isCompleted=is_completed,
        checkInTime=record.check_in_time or "--",
        checkOutTime=record.check_out_time or "--",
        workMode=record.work_mode,
        authorizedWorkMode=auth_mode,
        workingDuration=record.duration or "--",
        status=status_display,
        date=today_iso,
        isLate=record.is_late,
        checkInTimestamp=record.check_in_timestamp.isoformat() if record.check_in_timestamp else None,
        checkOutTimestamp=record.check_out_timestamp.isoformat() if record.check_out_timestamp else None,
        checkInLatitude=record.check_in_latitude,
        checkInLongitude=record.check_in_longitude,
        hasCheckInPhoto=bool(
            record.check_in_photo_data is not None
            or record.check_in_photo_key
            or (hasattr(record, "photos") and bool(record.photos))
        ),
        hasCheckOutPhoto=bool(record.check_out_photo_data is not None or record.check_out_photo_key),
        canCheckIn=False,
        canCheckOut=is_checked_in,
    )


@router.post("/check-in", status_code=status.HTTP_200_OK)
async def check_in(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Record daily attendance punch-in.
    Validates work mode, geofence (for WFO), camera photo upload to Cloud Storage,
    and commits record and photo metadata to Cloud Firestore.
    """
    user_role = getattr(current_user, "role", "employee")
    user_id = getattr(current_user, "id", None)
    user_email = getattr(current_user, "email", "")

    # 1. Parse request (multipart/form-data or json)
    content_type = request.headers.get("content-type", "").lower()
    photo_file = None
    lat_val = None
    lon_val = None
    acc_val = None
    requested_work_mode = None
    param_emp_id = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        photo_file = form.get("photo") or form.get("file") or form.get("image") or form.get("photo_data") or form.get("photoData")
        lat_val = form.get("latitude")
        lon_val = form.get("longitude")
        acc_val = form.get("accuracy")
        requested_work_mode = form.get("workMode")
        param_emp_id = form.get("employeeId")
    else:
        try:
            body = await request.json()
            photo_file = (
                body.get("photo")
                or body.get("image")
                or body.get("photoData")
                or body.get("photo_data")
                or body.get("photoBase64")
                or body.get("file")
            )
            lat_val = body.get("latitude")
            lon_val = body.get("longitude")
            acc_val = body.get("accuracy")
            requested_work_mode = body.get("workMode")
            param_emp_id = body.get("employeeId")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request format. Expected multipart/form-data or application/json.",
            )

    # 2. Resolve employee identity
    emp_id = None
    emp = None
    if settings.DATABASE_BACKEND == "firebase":
        if user_role == "employee":
            emps = FirestoreService.query("employees", {"email": user_email})
            if not emps and user_id:
                emps = FirestoreService.query("employees", {"user_id": user_id})
            if not emps and user_id:
                doc = FirestoreService.get_by_id("employees", str(user_id))
                if doc:
                    emps = [doc]
            if not emps:
                raise HTTPException(status_code=404, detail="Employee profile not found.")
            emp = emps[0]
            emp_id = emp.get("employee_id") or emp.get("employeeId")
            emp_uid = str(emp.get("uid") or emp.get("id") or user_id or emp_id)
        elif user_role == "admin" and param_emp_id:
            emp_id = str(param_emp_id).strip()
            emps = FirestoreService.query("employees", {"employee_id": emp_id})
            if not emps:
                emps = FirestoreService.query("employees", {"employeeId": emp_id})
            emp = emps[0] if emps else None
            emp_uid = str(emp.get("uid") or emp.get("id") or emp_id) if emp else emp_id
        else:
            raise HTTPException(status_code=403, detail="Employee access required to punch attendance.")
    else:
        if user_role == "employee":
            emp = db.query(Employee).filter(Employee.user_id == user_id).first()
            if not emp:
                emp = db.query(Employee).filter(Employee.email == user_email).first()
            if not emp:
                raise HTTPException(status_code=404, detail="Employee profile not found.")
            emp_id = emp.employee_id
            emp_uid = str(emp.user_id or emp_id)
        elif user_role == "admin" and param_emp_id:
            emp_id = str(param_emp_id).strip()
            emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
            emp_uid = str(emp.user_id or emp_id) if emp else emp_id
        else:
            raise HTTPException(status_code=403, detail="Employee access required to punch attendance.")

    if not emp_id or not emp:
        raise HTTPException(status_code=404, detail="Target employee could not be identified.")

    # 3. Work mode resolution
    work_mode = "WFO"
    if requested_work_mode:
        clean_req_mode = str(requested_work_mode).strip().upper()
        if "WFH" in clean_req_mode:
            work_mode = "WFH"
        elif "WFO" in clean_req_mode:
            work_mode = "WFO"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_WORK_MODE", "message": "Invalid work mode. Must be 'WFO' or 'WFH'."},
            )

    today = get_attendance_today()
    today_iso = today.isoformat()
    now_local = get_attendance_now()
    now_utc = datetime.now(timezone.utc)
    time_str = now_local.strftime("%I:%M %p")

    # 4. Daily lock validation
    if settings.DATABASE_BACKEND == "firebase":
        existing_records = FirestoreService.query("attendance", {"employee_id": emp_id, "date": today_iso})
        existing = existing_records[0] if existing_records else None
    else:
        existing = db.query(Attendance).filter(Attendance.employee_id == emp_id, Attendance.date == today).first()

    if existing:
        chk_out = existing.get("check_out_time") if isinstance(existing, dict) else existing.check_out_time
        chk_in = existing.get("check_in_time") if isinstance(existing, dict) else existing.check_in_time
        st = existing.get("status") if isinstance(existing, dict) else existing.status
        if chk_out or st == "Completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attendance already completed for today. New check-in is not permitted until tomorrow.",
            )
        if chk_in:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already checked in for today.",
            )

    # 5. GPS location validation
    lat, lon, acc = None, None, None
    if work_mode == "WFO":
        if lat_val is None or lon_val is None or acc_val is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GPS coordinates (latitude, longitude, accuracy) are required for Work From Office (WFO) check-in.",
            )
        try:
            lat = float(lat_val)
            lon = float(lon_val)
            acc = float(acc_val)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Latitude, longitude, and accuracy must be valid decimal numbers.",
            )

        geofence_report = verify_wfo_geofence(lat, lon, acc)
        if not geofence_report["valid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN if geofence_report["code"] == "OUTSIDE_OFFICE_GEOFENCE" else status.HTTP_400_BAD_REQUEST,
                detail=geofence_report,
            )
    else:
        if lat_val is not None and lon_val is not None and str(lat_val).strip() != "":
            try:
                lat = float(lat_val)
                lon = float(lon_val)
                acc = float(acc_val) if acc_val is not None else 0.0
            except (ValueError, TypeError):
                pass

    # 6. Validate photograph
    if photo_file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance selfie photograph is strictly required for check-in verification.",
        )

    storage_key, photo_bytes, photo_mime = await validate_and_save_attendance_photo(
        photo_file,
        photo_type="check_in",
        attendance_date=today,
    )

    # 7. Evaluate lateness
    late = is_checkin_late(now_local, db)
    att_status = "Late" if late else "Present"

    # 8. Upload to Cloud Storage for Firebase and persist in Cloud Firestore
    emp_name = (
        emp.get("name") or emp.get("full_name") or emp.get("fullName") or "Employee"
    ) if isinstance(emp, dict) else getattr(emp, "name", getattr(emp, "full_name", "Employee"))
    emp_dept = emp.get("department", "Operations") if isinstance(emp, dict) else getattr(emp, "department", "Operations")

    if settings.DATABASE_BACKEND == "firebase":
        record_id = f"{emp_id}_{today_iso}"

        # Upload photo to Firebase Storage
        storage_path, photo_url = upload_to_firebase_storage(
            photo_bytes=photo_bytes,
            mime_type=photo_mime,
            employee_id=emp_id,
            attendance_record_id=record_id,
            photo_type="check-in",
            employee_uid=emp_uid,
            attendance_date=today_iso,
        )

        attendance_doc = {
            "id": record_id,
            "employee_id": emp_id,
            "employeeId": emp_id,
            "employee_uid": emp_uid,
            "employeeUid": emp_uid,
            "employeeName": emp_name,
            "name": emp_name,
            "department": emp_dept,
            "date": today_iso,
            "check_in_time": time_str,
            "check_in_timestamp": now_utc.isoformat(),
            "work_mode": work_mode,
            "status": att_status,
            "is_late": late,
            "duration": "In Progress",
            "check_in_latitude": lat,
            "check_in_longitude": lon,
            "check_in_location_accuracy": acc,
            "office_location_verified": (work_mode == "WFO"),
            "check_in_photo_key": storage_key,
            "check_in_photo_storage_path": storage_path,
            "checkInPhotoPath": storage_path,
            "check_in_photo_url": photo_url,
            "checkInPhotoUrl": photo_url,
            "photoUrl": photo_url,
            "imageUploadStatus": "SUCCESS",
            "imageUploadTimestamp": now_utc.isoformat(),
            "hasCheckInPhoto": True,
            "hasCheckOutPhoto": False,
            "created_at": now_utc.isoformat(),
            "updated_at": now_utc.isoformat(),
        }
        FirestoreService.save("attendance", record_id, attendance_doc)

        # Record photo document in attendance_photos
        photo_doc = {
            "id": f"PHOTO_{record_id}_check_in",
            "attendance_id": record_id,
            "employee_id": emp_id,
            "employee_uid": emp_uid,
            "photo_type": "check_in",
            "mime_type": photo_mime,
            "file_size_bytes": len(photo_bytes),
            "storage_path": storage_path,
            "storage_url": photo_url,
            "created_at": now_utc.isoformat(),
        }
        FirestoreService.save("attendance_photos", f"PHOTO_{record_id}_check_in", photo_doc)

        FirestoreService.add_audit_log(
            actor_uid=emp_id,
            action="ATTENDANCE_CHECK_IN",
            target_record=record_id,
            metadata={"work_mode": work_mode, "status": att_status, "photo_uploaded": True, "storage_path": storage_path},
        )

        return {
            "id": record_id,
            "success": True,
            "message": f"Checked in successfully as {work_mode} ({att_status})",
            "checkIn": time_str,
            "checkInTime": time_str,
            "workMode": work_mode,
            "status": att_status,
            "isLate": late,
            "timestamp": now_utc.isoformat(),
            "hasCheckInPhoto": True,
            "photoUrl": photo_url,
            "checkInLatitude": lat,
            "checkInLongitude": lon,
            "checkInLocationAccuracy": acc,
            "canCheckIn": False,
            "canCheckOut": True,
            "attendance": attendance_doc,
        }

    # PostgreSQL fallback
    try:
        if existing:
            existing.check_in_time = time_str
            existing.check_in_timestamp = now_utc
            existing.check_in_photo_key = storage_key
            existing.check_in_photo_data = photo_bytes
            existing.check_in_photo_mime = photo_mime
            existing.check_in_latitude = lat
            existing.check_in_longitude = lon
            existing.check_in_location_accuracy = acc
            existing.work_mode = work_mode
            existing.status = att_status
            existing.is_late = late
            existing.duration = "In Progress"
            record = existing
        else:
            record = Attendance(
                employee_id=emp_id,
                date=today,
                check_in_time=time_str,
                check_in_timestamp=now_utc,
                check_in_photo_key=storage_key,
                check_in_photo_data=photo_bytes,
                check_in_photo_mime=photo_mime,
                check_in_latitude=lat,
                check_in_longitude=lon,
                check_in_location_accuracy=acc,
                work_mode=work_mode,
                status=att_status,
                is_late=late,
                duration="In Progress",
            )
            db.add(record)

        db.flush()
        db.commit()
        db.refresh(record)

        return {
            "id": record.id,
            "success": True,
            "message": f"Checked in successfully as {work_mode} ({att_status})",
            "checkIn": time_str,
            "checkInTime": time_str,
            "workMode": work_mode,
            "status": att_status,
            "isLate": late,
            "timestamp": now_utc.isoformat(),
            "hasCheckInPhoto": True,
            "checkInLatitude": lat,
            "checkInLongitude": lon,
            "checkInLocationAccuracy": acc,
            "canCheckIn": False,
            "canCheckOut": True,
        }
    except Exception as e:
        db.rollback()
        cleanup_photo_file(storage_key)
        logger.error(f"Error persisting check-in for {emp_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction failed during attendance record creation.",
        )


@router.post("/check-out", status_code=status.HTTP_200_OK)
async def check_out(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Record daily attendance punch-out and lock attendance for the remainder of today.
    """
    user_role = getattr(current_user, "role", "employee")
    user_id = getattr(current_user, "id", None)
    user_email = getattr(current_user, "email", "")

    emp_id = None
    if settings.DATABASE_BACKEND == "firebase":
        if user_role == "employee":
            emps = FirestoreService.query("employees", {"email": user_email})
            if not emps and user_id:
                emps = FirestoreService.query("employees", {"user_id": user_id})
            emp = emps[0] if emps else None
            emp_id = emp.get("employee_id") if emp else None
        elif user_role == "admin":
            try:
                body = await request.json()
                emp_id = body.get("employeeId")
            except Exception:
                pass
    else:
        if user_role == "employee":
            emp = db.query(Employee).filter(Employee.user_id == user_id).first()
            if not emp:
                emp = db.query(Employee).filter(Employee.email == user_email).first()
            emp_id = emp.employee_id if emp else None
        elif user_role == "admin":
            try:
                body = await request.json()
                emp_id = body.get("employeeId")
            except Exception:
                pass

    if not emp_id:
        raise HTTPException(status_code=400, detail="Employee ID could not be determined.")

    today = get_attendance_today()
    today_iso = today.isoformat()
    now_local = get_attendance_now()
    now_utc = datetime.now(timezone.utc)
    out_time_str = now_local.strftime("%I:%M %p")

    if settings.DATABASE_BACKEND == "firebase":
        records = FirestoreService.query("attendance", {"employee_id": emp_id, "date": today_iso})
        record = records[0] if records else None
        if not record or not record.get("check_in_time"):
            raise HTTPException(status_code=400, detail="Cannot check out without an active check-in for today.")
        if record.get("check_out_time"):
            raise HTTPException(status_code=409, detail="Attendance already locked and checked out for today.")

        duration_str = "Completed"
        in_ts_str = record.get("check_in_timestamp")
        if in_ts_str:
            try:
                in_dt = datetime.fromisoformat(in_ts_str)
                dur_secs = int((now_utc - in_dt).total_seconds())
                duration_str = format_duration_str(dur_secs)
            except Exception:
                pass

        doc_id = record.get("id") or f"{emp_id}_{today_iso}"
        FirestoreService.update("attendance", doc_id, {
            "check_out_time": out_time_str,
            "check_out_timestamp": now_utc.isoformat(),
            "duration": duration_str,
            "status": "Completed",
        })

        FirestoreService.add_audit_log(
            actor_uid=emp_id,
            action="ATTENDANCE_CHECK_OUT",
            target_record=doc_id,
            metadata={"check_out": out_time_str, "duration": duration_str},
        )

        return {
            "id": doc_id,
            "success": True,
            "message": f"Checked out successfully at {out_time_str}. Daily duration: {duration_str}",
            "checkOut": out_time_str,
            "checkOutTime": out_time_str,
            "duration": duration_str,
            "status": "Completed",
            "canCheckIn": False,
            "canCheckOut": False,
            "attendance": record,
        }

    # PostgreSQL fallback
    record = db.query(Attendance).filter(Attendance.employee_id == emp_id, Attendance.date == today).first()
    if not record or not record.check_in_time:
        raise HTTPException(status_code=400, detail="Cannot check out without an active check-in for today.")
    if record.check_out_time:
        raise HTTPException(status_code=409, detail="Attendance already locked and checked out for today.")

    duration_str = "Completed"
    if record.check_in_timestamp:
        dur_secs = int((now_utc - record.check_in_timestamp).total_seconds())
        duration_str = format_duration_str(dur_secs)

    record.check_out_time = out_time_str
    record.check_out_timestamp = now_utc
    record.duration = duration_str
    record.status = "Completed"
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "success": True,
        "message": f"Checked out successfully at {out_time_str}. Daily duration: {duration_str}",
        "checkOut": out_time_str,
        "checkOutTime": out_time_str,
        "duration": duration_str,
        "status": "Completed",
        "canCheckIn": False,
        "canCheckOut": False,
    }


@router.get("/{attendance_id}/photo")
@router.get("/{attendance_id}/photo/{photo_type}")
def get_attendance_photo(
    attendance_id: str,
    photo_type: str = "check-in",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve attendance photo with strict caller authorization.
    Serves from Cloud Storage for Firebase, local storage, or database bytes.
    """
    caller_role = getattr(current_user, "role", "employee")
    caller_email = getattr(current_user, "email", "")

    if settings.DATABASE_BACKEND == "firebase":
        rec = FirestoreService.get_by_id("attendance", attendance_id)
        if not rec:
            all_att = FirestoreService.list_all("attendance")
            for a in all_att:
                if str(a.get("id")) == str(attendance_id):
                    rec = a
                    break
        if not rec:
            raise HTTPException(status_code=404, detail="Attendance record not found.")

        # Permission check: Caller must be admin or the owner
        record_emp_id = rec.get("employee_id")
        if caller_role != "admin":
            emps = FirestoreService.query("employees", {"email": caller_email})
            if not emps or emps[0].get("employee_id") != record_emp_id:
                raise HTTPException(status_code=403, detail="Forbidden: You cannot view other employees' photos.")

        # 1. Check if Cloud Storage has the photo
        storage_path = rec.get("check_in_photo_storage_path") or rec.get("checkInPhotoStoragePath")
        if is_firebase_live() and storage_path:
            bucket = get_storage_bucket()
            if bucket:
                try:
                    blob = bucket.blob(storage_path)
                    if blob.exists():
                        photo_bytes = blob.download_as_bytes()
                        return Response(
                            content=photo_bytes,
                            media_type="image/jpeg",
                            headers={"Cache-Control": "private, max-age=3600"},
                        )
                except Exception as e:
                    logger.warning(f"Failed to stream from Cloud Storage: {e}")

        # 2. Check local file storage fallback
        storage_key = rec.get("check_in_photo_key")
        if storage_key:
            try:
                abs_path, mime_type = resolve_photo_path(storage_key)
                return FileResponse(abs_path, media_type=mime_type, headers={"Cache-Control": "private, max-age=3600"})
            except Exception:
                pass

        # Check rec_dir
        base = get_attendance_storage_dir()
        candidate = os.path.join(base, str(record_emp_id), str(attendance_id), f"{photo_type}.jpg")
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})

        raise HTTPException(status_code=404, detail="Attendance photo not found.")

    # PostgreSQL fallback
    record = (
        db.query(Attendance)
        .filter(Attendance.id == int(attendance_id) if attendance_id.isdigit() else False)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    if caller_role != "admin":
        emp = db.query(Employee).filter(Employee.email == caller_email).first()
        if not emp or record.employee_id != emp.employee_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot view other employees' photos.")

    if record.check_in_photo_data:
        return Response(
            content=record.check_in_photo_data,
            media_type=record.check_in_photo_mime or "image/jpeg",
            headers={"Cache-Control": "private, max-age=3600"},
        )

    if record.check_in_photo_key:
        abs_path, mime_type = resolve_photo_path(record.check_in_photo_key)
        return FileResponse(abs_path, media_type=mime_type, headers={"Cache-Control": "private, max-age=3600"})

    raise HTTPException(status_code=404, detail="No photo recorded for this attendance entry.")


@router.patch("/{record_id}", response_model=dict)
def update_attendance_record(
    record_id: str,
    data: AttendanceRecordUpdate,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Edit attendance record details (Admin only)."""
    if settings.DATABASE_BACKEND == "firebase":
        rec = FirestoreService.get_by_id("attendance", record_id)
        if not rec:
            all_att = FirestoreService.list_all("attendance")
            for a in all_att:
                if str(a.get("id")) == str(record_id):
                    rec = a
                    break
        if not rec:
            raise HTTPException(status_code=404, detail="Attendance record not found.")

        updates = {}
        if data.status:
            updates["status"] = data.status
            updates["is_late"] = data.status.lower() == "late"
        if data.workMode:
            updates["work_mode"] = data.workMode
        if data.checkIn:
            updates["check_in_time"] = data.checkIn
        if data.checkOut:
            updates["check_out_time"] = data.checkOut

        doc_key = rec.get("id") or record_id
        FirestoreService.update("attendance", doc_key, updates)
        rec.update(updates)
        return format_attendance_response(rec)

    # PostgreSQL fallback
    record = (
        db.query(Attendance)
        .filter(Attendance.id == int(record_id) if record_id.isdigit() else False)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    if data.status:
        record.status = data.status
        record.is_late = data.status.lower() == "late"
    if data.workMode:
        record.work_mode = data.workMode
    if data.checkIn:
        record.check_in_time = data.checkIn
    if data.checkOut:
        record.check_out_time = data.checkOut

    db.commit()
    db.refresh(record)
    return format_attendance_response(record)


@router.get("/summary")
def get_attendance_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get headline attendance summary metrics for today."""
    today = get_attendance_today()
    today_iso = today.isoformat()

    if settings.DATABASE_BACKEND == "firebase":
        records = FirestoreService.query("attendance", {"date": today_iso})
        total_present = len([r for r in records if r.get("status") in ["Present", "Late", "Completed"]])
        wfo = len([r for r in records if r.get("work_mode") == "WFO" and r.get("status") in ["Present", "Late", "Completed"]])
        wfh = len([r for r in records if r.get("work_mode") == "WFH" and r.get("status") in ["Present", "Late", "Completed"]])
        late = len([r for r in records if r.get("is_late") or r.get("status") == "Late"])
        return {
            "totalPresent": total_present,
            "wfo": wfo,
            "wfh": wfh,
            "late": late,
        }

    # PostgreSQL fallback
    records = db.query(Attendance).filter(Attendance.date == today).all()
    total_present = len([r for r in records if r.status in ["Present", "Late", "Completed"]])
    wfo = len([r for r in records if r.work_mode == "WFO" and r.status in ["Present", "Late", "Completed"]])
    wfh = len([r for r in records if r.work_mode == "WFH" and r.status in ["Present", "Late", "Completed"]])
    late = len([r for r in records if r.is_late or r.status == "Late"])

    return {
        "totalPresent": total_present,
        "wfo": wfo,
        "wfh": wfh,
        "late": late,
    }
