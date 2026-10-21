from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.db.session import get_db
from app.models.registration_request import RegistrationRequest
from app.models.user import User
from app.models.employee import Employee
from app.schemas.registration_request import RegistrationRequestUpdate, RegistrationRequestResponse
from app.dependencies.auth import get_current_admin
from app.services.firestore_service import FirestoreService

router = APIRouter()


def format_request_response(r: dict) -> dict:
    req_code = r.get("request_code") or r.get("id") or "REQ-0001"
    req_id = r.get("id") or req_code
    full_name = r.get("full_name") or r.get("fullName") or r.get("name") or "Employee"
    emp_id = r.get("employee_id") or r.get("employeeId") or ""
    email = r.get("email") or ""
    phone = r.get("phone") or "--"
    status_str = r.get("status") or "Pending"
    req_date = r.get("requested_date") or r.get("requestedDate") or datetime.now(timezone.utc).date().isoformat()
    if isinstance(req_date, datetime):
        req_date = req_date.date().isoformat()
    elif not isinstance(req_date, str):
        req_date = str(req_date)

    reviewed_at = r.get("reviewed_at") or r.get("reviewedAt")
    if isinstance(reviewed_at, datetime):
        reviewed_at = reviewed_at.isoformat()

    return {
        "id": req_code,
        "requestId": req_id,
        "name": full_name,
        "fullName": full_name,
        "employeeId": emp_id,
        "email": email,
        "phone": phone,
        "status": status_str,
        "requestedDate": req_date,
        "rejectionReason": r.get("rejection_reason") or r.get("rejectionReason"),
        "reviewedBy": r.get("reviewed_by") or r.get("reviewedBy"),
        "reviewedAt": reviewed_at,
    }


@router.get("", response_model=List[dict])
def list_registration_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """List staff signup onboarding requests (Admin only)."""
    if settings.DATABASE_BACKEND == "firebase":
        raw_requests = FirestoreService.list_all("registration_requests")
        filtered = []
        for r in raw_requests:
            st = str(r.get("status", "Pending")).upper()
            if status_filter:
                sf = status_filter.upper()
                if sf == "PENDING" and st != "PENDING":
                    continue
                elif sf == "APPROVED" and st != "APPROVED":
                    continue
                elif sf == "REJECTED" and st != "REJECTED":
                    continue
                elif sf == "PROCESSED" and st == "PENDING":
                    continue
            filtered.append(format_request_response(r))

        filtered.sort(key=lambda x: str(x.get("requestedDate", "")), reverse=True)
        return filtered

    # PostgreSQL fallback
    query = db.query(RegistrationRequest)
    if status_filter:
        sf = status_filter.upper()
        if sf == "PENDING":
            query = query.filter(RegistrationRequest.status == "Pending")
        elif sf in ("PROCESSED", "APPROVED", "REJECTED"):
            if sf == "PROCESSED":
                query = query.filter(RegistrationRequest.status != "Pending")
            elif sf == "APPROVED":
                query = query.filter(RegistrationRequest.status == "Approved")
            elif sf == "REJECTED":
                query = query.filter(RegistrationRequest.status == "Rejected")

    requests = query.order_by(desc(RegistrationRequest.requested_date), desc(RegistrationRequest.id)).all()
    return [
        format_request_response({
            "id": r.id,
            "request_code": r.request_code,
            "full_name": r.full_name,
            "employee_id": r.employee_id,
            "email": r.email,
            "phone": r.phone,
            "status": r.status,
            "requested_date": r.requested_date,
            "rejection_reason": r.rejection_reason,
            "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at,
        })
        for r in requests
    ]


@router.patch("/{request_id}/approve", response_model=dict)
def approve_registration_request(
    request_id: str,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Admin approves pending employee registration request."""
    now_iso = datetime.now(timezone.utc).isoformat()
    admin_email = getattr(admin_user, "email", "admin@arshith.com")
    admin_id = getattr(admin_user, "id", 1)

    if settings.DATABASE_BACKEND == "firebase":
        req = FirestoreService.get_by_id("registration_requests", request_id)
        if not req:
            all_r = FirestoreService.list_all("registration_requests")
            for r in all_r:
                if (
                    str(r.get("request_code")) == request_id
                    or str(r.get("employee_id")) == request_id
                    or str(r.get("id")) == request_id
                ):
                    req = r
                    break

        if not req:
            raise HTTPException(status_code=404, detail="Registration request not found")

        if req.get("status") == "Approved":
            raise HTTPException(status_code=400, detail="This registration request has already been approved")

        doc_key = req.get("request_code") or str(req.get("id"))
        FirestoreService.update("registration_requests", doc_key, {
            "status": "Approved",
            "reviewed_by": admin_email,
            "reviewed_at": now_iso,
            "rejection_reason": None,
        })
        req["status"] = "Approved"
        req["reviewed_by"] = admin_email
        req["reviewed_at"] = now_iso
        req["rejection_reason"] = None

        # Activate linked User in Firestore
        clean_email = str(req.get("email", "")).lower().strip()
        users = FirestoreService.query("users", {"email": clean_email})
        for u in users:
            uid = u.get("id") or u.get("_firestore_id")
            FirestoreService.update("users", uid, {
                "approval_status": "APPROVED",
                "is_active": True,
                "reviewed_by_id": admin_id,
                "reviewed_at": now_iso,
                "rejection_reason": None,
            })

        # Activate linked Employee in Firestore
        emps = FirestoreService.query("employees", {"email": clean_email})
        if not emps and req.get("employee_id"):
            emps = FirestoreService.query("employees", {"employee_id": req.get("employee_id")})
        for e in emps:
            eid = e.get("employee_id") or e.get("id")
            FirestoreService.update("employees", eid, {"status": "Active"})

        FirestoreService.add_audit_log(
            actor_uid=admin_email,
            action="EMPLOYEE_REGISTRATION_APPROVED",
            target_record=req.get("employee_id", request_id),
            metadata={"request_code": doc_key, "email": clean_email},
        )

        return format_request_response(req)

    # PostgreSQL fallback
    req = (
        db.query(RegistrationRequest)
        .filter(
            (RegistrationRequest.request_code == request_id)
            | (RegistrationRequest.employee_id == request_id)
            | (RegistrationRequest.id == int(request_id) if request_id.isdigit() else False)
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Registration request not found")

    if req.status == "Approved":
        raise HTTPException(status_code=400, detail="This registration request has already been approved")

    now = datetime.now(timezone.utc)
    req.status = "Approved"
    req.reviewed_by = admin_email
    req.reviewed_at = now
    req.rejection_reason = None

    clean_email = req.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if user:
        user.approval_status = "APPROVED"
        user.is_active = True
        user.reviewed_by_id = admin_id
        user.reviewed_at = now
        user.rejection_reason = None

    emp = db.query(Employee).filter(
        (Employee.email == clean_email) | (Employee.employee_id == req.employee_id.strip())
    ).first()
    if emp:
        emp.status = "Active"

    db.commit()
    db.refresh(req)
    return format_request_response({
        "id": req.id,
        "request_code": req.request_code,
        "full_name": req.full_name,
        "employee_id": req.employee_id,
        "email": req.email,
        "phone": req.phone,
        "status": req.status,
        "requested_date": req.requested_date,
        "rejection_reason": req.rejection_reason,
        "reviewed_by": req.reviewed_by,
        "reviewed_at": req.reviewed_at,
    })


@router.patch("/{request_id}/reject", response_model=dict)
def reject_registration_request(
    request_id: str,
    data: Optional[RegistrationRequestUpdate] = None,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Admin rejects pending employee registration request."""
    reason = (data.reason if data and data.reason else None) or "Registration rejected by administration."
    now_iso = datetime.now(timezone.utc).isoformat()
    admin_email = getattr(admin_user, "email", "admin@arshith.com")
    admin_id = getattr(admin_user, "id", 1)

    if settings.DATABASE_BACKEND == "firebase":
        req = FirestoreService.get_by_id("registration_requests", request_id)
        if not req:
            all_r = FirestoreService.list_all("registration_requests")
            for r in all_r:
                if (
                    str(r.get("request_code")) == request_id
                    or str(r.get("employee_id")) == request_id
                    or str(r.get("id")) == request_id
                ):
                    req = r
                    break

        if not req:
            raise HTTPException(status_code=404, detail="Registration request not found")

        if req.get("status") == "Rejected":
            raise HTTPException(status_code=400, detail="This registration request has already been rejected")

        doc_key = req.get("request_code") or str(req.get("id"))
        FirestoreService.update("registration_requests", doc_key, {
            "status": "Rejected",
            "reviewed_by": admin_email,
            "reviewed_at": now_iso,
            "rejection_reason": reason,
        })
        req["status"] = "Rejected"
        req["reviewed_by"] = admin_email
        req["reviewed_at"] = now_iso
        req["rejection_reason"] = reason

        clean_email = str(req.get("email", "")).lower().strip()
        users = FirestoreService.query("users", {"email": clean_email})
        for u in users:
            uid = u.get("id") or u.get("_firestore_id")
            FirestoreService.update("users", uid, {
                "approval_status": "REJECTED",
                "is_active": False,
                "reviewed_by_id": admin_id,
                "reviewed_at": now_iso,
                "rejection_reason": reason,
            })

        emps = FirestoreService.query("employees", {"email": clean_email})
        if not emps and req.get("employee_id"):
            emps = FirestoreService.query("employees", {"employee_id": req.get("employee_id")})
        for e in emps:
            eid = e.get("employee_id") or e.get("id")
            FirestoreService.update("employees", eid, {"status": "Inactive"})

        FirestoreService.add_audit_log(
            actor_uid=admin_email,
            action="EMPLOYEE_REGISTRATION_REJECTED",
            target_record=req.get("employee_id", request_id),
            metadata={"request_code": doc_key, "email": clean_email, "reason": reason},
        )

        return format_request_response(req)

    # PostgreSQL fallback
    req = (
        db.query(RegistrationRequest)
        .filter(
            (RegistrationRequest.request_code == request_id)
            | (RegistrationRequest.employee_id == request_id)
            | (RegistrationRequest.id == int(request_id) if request_id.isdigit() else False)
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Registration request not found")

    if req.status == "Rejected":
        raise HTTPException(status_code=400, detail="This registration request has already been rejected")

    now = datetime.now(timezone.utc)
    req.status = "Rejected"
    req.reviewed_by = admin_email
    req.reviewed_at = now
    req.rejection_reason = reason

    clean_email = req.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if user:
        user.approval_status = "REJECTED"
        user.is_active = False
        user.reviewed_by_id = admin_id
        user.reviewed_at = now
        user.rejection_reason = reason

    emp = db.query(Employee).filter(
        (Employee.email == clean_email) | (Employee.employee_id == req.employee_id.strip())
    ).first()
    if emp:
        emp.status = "Inactive"

    db.commit()
    db.refresh(req)
    return format_request_response({
        "id": req.id,
        "request_code": req.request_code,
        "full_name": req.full_name,
        "employee_id": req.employee_id,
        "email": req.email,
        "phone": req.phone,
        "status": req.status,
        "requested_date": req.requested_date,
        "rejection_reason": req.rejection_reason,
        "reviewed_by": req.reviewed_by,
        "reviewed_at": req.reviewed_at,
    })


@router.patch("/{request_id}", response_model=dict)
def update_registration_status(
    request_id: str,
    data: RegistrationRequestUpdate,
    db: Session = Depends(get_db),
    admin_user=Depends(get_current_admin),
):
    """Backward-compatible general status update (calls approve or reject)."""
    if data.status == "Approved":
        return approve_registration_request(request_id=request_id, db=db, admin_user=admin_user)
    elif data.status == "Rejected":
        return reject_registration_request(request_id=request_id, data=data, db=db, admin_user=admin_user)
    else:
        raise HTTPException(status_code=400, detail="Status must be 'Approved' or 'Rejected'")
