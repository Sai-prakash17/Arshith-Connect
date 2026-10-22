import re
from datetime import datetime, date, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from pydantic import BaseModel

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.firebase import verify_credentials_with_firebase, update_admin_password_in_firebase
from app.core.exceptions import DuplicateFieldsException
from app.db.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.registration_request import RegistrationRequest
from app.schemas.auth import LoginRequest, AdminLoginRequest, RegisterRequest, Token, UserProfileResponse
from app.dependencies.auth import get_current_user, get_current_admin
from app.services.firestore_service import FirestoreService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def normalize_phone_digits(phone: Optional[str]) -> str:
    """Normalize phone input by trimming whitespace and removing non-digit / non-+ characters."""
    if not phone:
        return ""
    p = phone.strip()
    if p in ("", "--"):
        return ""
    return re.sub(r"[^\d+]", "", p)


def is_same_phone(p1: str, p2: str) -> bool:
    """Check if two phone representations refer to the same phone number."""
    if not p1 or not p2:
        return False
    c1 = re.sub(r"[^\d+]", "", p1.strip())
    c2 = re.sub(r"[^\d+]", "", p2.strip())
    if not c1 or not c2 or c1 in ("--", "") or c2 in ("--", ""):
        return False
    if c1 == c2:
        return True

    # Digits only comparison
    d1 = re.sub(r"\D", "", c1)
    d2 = re.sub(r"\D", "", c2)
    if not d1 or not d2:
        return False
    if d1 == d2:
        return True

    if len(d1) >= 10 and len(d2) >= 10:
        if d1[-10:] == d2[-10:]:
            return True

    return False


@router.post("/login", response_model=Token)
def login_employee(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate an employee with email and password via Firestore or PostgreSQL."""
    clean_email = login_data.email.lower().strip()

    if settings.DATABASE_BACKEND == "firebase":
        # Block admin accounts from logging in through employee portal
        if clean_email == "admin@arshith.com":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin credentials cannot be used to log in through Employee Login. Please use the Admin Login page.",
            )

        users = FirestoreService.query("users", {"email": clean_email})
        user = users[0] if users else None

        # Verify password via Firebase Authentication REST API or local hashed password
        fb_result = verify_credentials_with_firebase(clean_email, login_data.password)
        password_valid = False
        if fb_result:
            password_valid = True
            if user:
                FirestoreService.update("users", user.get("id"), {
                    "hashed_password": get_password_hash(login_data.password),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        elif user and user.get("hashed_password") and verify_password(login_data.password, user["hashed_password"]):
            password_valid = True

        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid employee email or password.",
            )

        role = str(user.get("role", "employee")).strip().lower() if user else "employee"
        if role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin credentials cannot be used to log in through Employee Login. Please use the Admin Login page.",
            )

        raw_status = (user.get("approval_status") if user else None) or (user.get("status") if user else None) or "approved"
        approval_status = str(raw_status).strip().upper()
        if approval_status == "PENDING":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your registration is pending Admin approval. Please wait until your account is approved.",
            )
        if approval_status == "REJECTED":
            detail = "Your registration request was not approved. Please contact company administration."
            if user and user.get("rejection_reason"):
                detail += f" Reason: {user['rejection_reason']}"
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

        is_active = user.get("is_active", True) if user else True
        if not is_active or approval_status not in ["APPROVED", "ACTIVE"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is currently inactive. Please contact administration.",
            )

        emps = FirestoreService.query("employees", {"email": clean_email})
        if not emps and user and user.get("id"):
            emps = FirestoreService.query("employees", {"user_id": user["id"]})
        emp = emps[0] if emps else None

        if emp and emp.get("status") != "Active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is currently inactive. Please contact administration.",
            )

        emp_id = (emp.get("employee_id") or emp.get("employeeId")) if emp else "EMP-001"
        emp_name = (emp.get("full_name") or emp.get("fullName")) if emp else clean_email.split("@")[0]
        emp_dept = emp.get("department", "Operations") if emp else "Operations"
        emp_uid = (fb_result.get("uid") if fb_result else None) or (user.get("id") if user else None) or "EMP-001"

        token = create_access_token(
            subject=str(emp_uid),
            role="employee",
            extra_claims={
                "email": clean_email,
                "employeeId": emp_id,
                "name": emp_name,
            },
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "employee",
            "user": {
                "id": emp_uid,
                "name": emp_name,
                "fullName": emp_name,
                "employeeId": emp_id,
                "email": clean_email,
                "role": "employee",
                "department": emp_dept,
            },
        }

    # PostgreSQL fallback
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid employee email or password.",
        )

    if user.role == "admin" or user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin credentials cannot be used to log in through Employee Login. Please use the Admin Login page.",
        )

    if user.approval_status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration is pending Admin approval. Please wait until your account is approved.",
        )
    if user.approval_status == "REJECTED":
        detail = "Your registration request was not approved. Please contact company administration."
        if user.rejection_reason:
            detail += f" Reason: {user.rejection_reason}"
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    if not user.is_active or user.approval_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently inactive. Please contact administration.",
        )

    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not emp:
        emp = db.query(Employee).filter(Employee.email == user.email).first()

    if emp and emp.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently inactive. Please contact administration.",
        )

    emp_id = emp.employee_id if emp else "EMP-001"
    emp_name = emp.full_name if emp else user.email.split("@")[0]
    emp_dept = emp.department if emp else "Operations"

    token = create_access_token(
        subject=str(user.id),
        role="employee",
        extra_claims={
            "email": user.email,
            "employeeId": emp_id,
            "name": emp_name,
        },
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "employee",
        "user": {
            "id": user.id,
            "name": emp_name,
            "fullName": emp_name,
            "employeeId": emp_id,
            "email": user.email,
            "role": "employee",
            "department": emp_dept,
        },
    }


@router.post("/admin-login", response_model=Token)
def login_admin(login_data: AdminLoginRequest, db: Session = Depends(get_db)):
    """Authenticate administrator credentials via Firebase Authentication / Firestore or PostgreSQL."""
    clean_email = login_data.email.lower().strip()

    if settings.DATABASE_BACKEND == "firebase":
        fb_result = verify_credentials_with_firebase(clean_email, login_data.password)

        users = FirestoreService.query("users", {"email": clean_email})
        admins = FirestoreService.query("admins", {"email": clean_email})

        admin_doc = admins[0] if admins else None
        if not admin_doc:
            for a in FirestoreService.list_all("admins"):
                if str(a.get("email", "")).lower().strip() == clean_email:
                    admin_doc = a
                    break

        user = users[0] if users else None

        # Check if email belongs to an employee (and NOT an admin)
        if not admin_doc and (user and str(user.get("role", "")).lower() == "employee"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee credentials cannot be used to log in through Admin Login. Please use the Employee Login page.",
            )
        if not admin_doc and not user:
            emps = FirestoreService.query("employees", {"email": clean_email})
            if emps:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Employee credentials cannot be used to log in through Admin Login. Please use the Employee Login page.",
                )

        password_valid = False
        if fb_result:
            password_valid = True
            if user:
                FirestoreService.update("users", user.get("id"), {
                    "hashed_password": get_password_hash(login_data.password),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        elif user and user.get("hashed_password") and verify_password(login_data.password, user["hashed_password"]):
            password_valid = True

        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrator credentials",
            )

        role = ""
        if admin_doc:
            role = str(admin_doc.get("role", "admin")).strip().lower()
        elif user:
            role = str(user.get("role", "")).strip().lower()

        if role == "employee":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee credentials cannot be used to log in through Admin Login. Please use the Employee Login page.",
            )
        if role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This account does not possess administrator privileges.",
            )

        if user and not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator account is inactive.",
            )

        admin_name = (admin_doc.get("name") if admin_doc else None) or (user.get("name") if user else None) or "Administrator"
        admin_uid = (fb_result.get("uid") if fb_result else None) or (admin_doc.get("id") if admin_doc else None) or (user.get("id") if user else None) or "ezvZfsphCqUpkgvu18ldvi7XW9D2"

        token = create_access_token(
            subject=str(admin_uid),
            role="admin",
            extra_claims={
                "email": clean_email,
                "employeeId": "ADM-001",
                "name": admin_name,
            },
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "admin",
            "user": {
                "id": admin_uid,
                "name": admin_name,
                "fullName": admin_name,
                "employeeId": "ADM-001",
                "email": clean_email,
                "role": "admin",
                "department": "Operations",
            },
        }

    # PostgreSQL fallback
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials",
        )

    if user.role == "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee credentials cannot be used to log in through Admin Login. Please use the Employee Login page.",
        )
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This account does not possess administrator privileges.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator account is inactive.",
        )

    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    emp_name = emp.full_name if emp else "Administrator"
    emp_id = emp.employee_id if emp else "ADM-001"

    token = create_access_token(
        subject=str(user.id),
        role="admin",
        extra_claims={
            "email": user.email,
            "employeeId": emp_id,
            "name": emp_name,
        },
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "admin",
        "user": {
            "id": user.id,
            "name": emp_name,
            "fullName": emp_name,
            "employeeId": emp_id,
            "email": user.email,
            "role": "admin",
            "department": "Operations",
        },
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_employee(data: RegisterRequest, db: Session = Depends(get_db)):
    """Self-registration for new employees (creates pending User, Employee, and RegistrationRequest)."""
    clean_emp_id = data.employeeId.strip().upper()
    clean_email = data.email.lower().strip()
    clean_phone = normalize_phone_digits(data.phone)
    phone_digits = re.sub(r"\D", "", clean_phone)

    errors = {}

    if settings.DATABASE_BACKEND == "firebase":
        all_emps = FirestoreService.list_all("employees")
        all_users = FirestoreService.list_all("users")

        # 1. Independent check: Employee ID
        for e in all_emps:
            eid = str(e.get("employee_id") or e.get("employeeId") or "").strip().upper()
            if eid == clean_emp_id:
                errors["employee_id"] = "This Employee ID already exists."
                break

        # 2. Independent check: Email address
        for e in all_emps:
            if str(e.get("email", "")).strip().lower() == clean_email:
                errors["email"] = "This email address is already registered."
                break
        if "email" not in errors:
            for u in all_users:
                if str(u.get("email", "")).strip().lower() == clean_email:
                    errors["email"] = "This email address is already registered."
                    break

        # 3. Independent check: Phone number
        if clean_phone:
            for e in all_emps:
                ep = str(e.get("phone", "")).strip()
                if is_same_phone(clean_phone, ep):
                    errors["phone"] = "This phone number is already registered."
                    break

        if errors:
            raise DuplicateFieldsException(errors=errors)

        # Create new user in PENDING approval state
        now_iso = datetime.now(timezone.utc).isoformat()
        user_id = int(datetime.now(timezone.utc).timestamp() * 1000)

        user_doc = {
            "id": user_id,
            "email": clean_email,
            "hashed_password": get_password_hash(data.password),
            "role": "employee",
            "is_active": False,
            "approval_status": "PENDING",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        FirestoreService.save("users", user_id, user_doc)

        emp_doc = {
            "id": user_id,
            "employee_id": clean_emp_id,
            "user_id": user_id,
            "full_name": data.fullName.strip(),
            "email": clean_email,
            "phone": clean_phone if clean_phone else "--",
            "department": "Operations",
            "designation": "Operations Associate",
            "status": "Pending",
            "shift": "General (09:30 AM - 06:30 PM)",
            "location": "HQ Office",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        FirestoreService.save("employees", clean_emp_id, emp_doc)

        req_code = f"REQ-{datetime.now().strftime('%Y%m%d%H%M%S')[-4:]}"
        reg_req = {
            "id": user_id,
            "request_code": req_code,
            "full_name": data.fullName.strip(),
            "employee_id": clean_emp_id,
            "email": clean_email,
            "phone": clean_phone if clean_phone else "--",
            "status": "Pending",
            "requested_date": date.today().isoformat(),
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        FirestoreService.save("registration_requests", req_code, reg_req)

        FirestoreService.add_audit_log(
            actor_uid=clean_email,
            action="EMPLOYEE_REGISTRATION_SUBMITTED",
            target_record=clean_emp_id,
            metadata={"request_code": req_code, "status": "Pending"},
        )

        return {
            "success": True,
            "message": "Your registration request has been submitted successfully. Please wait for Admin approval before logging in.",
            "status": "PENDING",
            "employeeId": clean_emp_id,
        }

    # PostgreSQL fallback
    existing_emp_by_id = (
        db.query(Employee)
        .filter(func.upper(func.trim(Employee.employee_id)) == clean_emp_id)
        .first()
    )
    if existing_emp_by_id:
        errors["employee_id"] = "This Employee ID already exists."

    existing_emp_by_email = (
        db.query(Employee)
        .filter(func.lower(func.trim(Employee.email)) == clean_email)
        .first()
    )
    existing_user_by_email = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == clean_email)
        .first()
    )
    if existing_emp_by_email or existing_user_by_email:
        errors["email"] = "This email address is already registered."

    if clean_phone:
        all_phones = (
            db.query(Employee.phone)
            .filter(
                Employee.phone.isnot(None),
                Employee.phone != "--",
                Employee.phone != "",
            )
            .all()
        )
        for (ep,) in all_phones:
            if is_same_phone(clean_phone, ep):
                errors["phone"] = "This phone number is already registered."
                break

    if errors:
        raise DuplicateFieldsException(errors=errors)

    try:
        new_user = User(
            email=clean_email,
            hashed_password=get_password_hash(data.password),
            role="employee",
            is_active=False,
            approval_status="PENDING",
        )
        db.add(new_user)
        db.flush()

        new_emp = Employee(
            employee_id=clean_emp_id,
            user_id=new_user.id,
            full_name=data.fullName.strip(),
            email=clean_email,
            phone=clean_phone if clean_phone else "--",
            department="Operations",
            designation="Operations Associate",
            status="Pending",
        )
        db.add(new_emp)

        req_code = f"REQ-{datetime.now().strftime('%Y%m%d%H%M%S')[-4:]}"
        reg_req = RegistrationRequest(
            request_code=req_code,
            full_name=data.fullName.strip(),
            employee_id=clean_emp_id,
            email=clean_email,
            phone=clean_phone if clean_phone else "--",
            status="Pending",
        )
        db.add(reg_req)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateFieldsException(errors={"employee_id": "This Employee ID already exists."})

    return {
        "success": True,
        "message": "Your registration request has been submitted successfully. Please wait for Admin approval before logging in.",
        "status": "PENDING",
        "employeeId": clean_emp_id,
    }


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve currently authenticated user's profile."""
    email = getattr(current_user, "email", "")
    user_id = getattr(current_user, "id", None)
    role = getattr(current_user, "role", "employee")

    if settings.DATABASE_BACKEND == "firebase":
        emps = FirestoreService.query("employees", {"email": email})
        if not emps and user_id:
            emps = FirestoreService.query("employees", {"user_id": user_id})
        emp = emps[0] if emps else {}

        name = emp.get("full_name") or emp.get("fullName") or email.split("@")[0]
        emp_id = emp.get("employee_id") or emp.get("employeeId") or "EMP-001"
        dept = emp.get("department", "Operations")
        desig = emp.get("designation", "Employee")
        phone = emp.get("phone", "--")
        emp_status = emp.get("status", "Active")

        return {
            "id": user_id,
            "email": email,
            "role": role,
            "name": name,
            "employeeId": emp_id,
            "department": dept,
            "designation": desig,
            "phone": phone,
            "status": emp_status,
        }

    # PostgreSQL fallback
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        emp = db.query(Employee).filter(Employee.email == current_user.email).first()

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "name": emp.full_name if emp else current_user.email.split("@")[0],
        "employeeId": emp.employee_id if emp else "EMP-001",
        "department": emp.department if emp else "Operations",
        "designation": emp.designation if emp else "Employee",
        "phone": emp.phone if emp else "--",
        "status": emp.status if emp else "Active",
    }


@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    """Log out active session."""
    return {"success": True, "message": "Logged out successfully."}


class ChangeAdminPasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/admin/change-password")
def change_admin_password(
    data: ChangeAdminPasswordRequest,
    current_admin=Depends(get_current_admin),
):
    """
    Authorized endpoint for administrators to update their Firebase Authentication and database credentials.
    Strictly protected: requires valid administrator session token.
    """
    admin_email = getattr(current_admin, "email", "admin@arshith.com")
    admin_uid = getattr(current_admin, "id", None) or "ezvZfsphCqUpkgvu18ldvi7XW9D2"

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )

    # 1. Verify current credentials against Firebase Auth or hashed password
    valid = False
    fb_check = verify_credentials_with_firebase(admin_email, data.current_password)
    if fb_check:
        valid = True
    elif getattr(current_admin, "hashed_password", None) and verify_password(data.current_password, current_admin.hashed_password):
        valid = True

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    # 2. Update password in Firebase Authentication using Admin SDK
    target_uid = str(admin_uid)
    fb_updated = update_admin_password_in_firebase(target_uid, data.new_password)

    # 3. Synchronize password hash in Firestore users collection
    now_iso = datetime.now(timezone.utc).isoformat()
    new_hash = get_password_hash(data.new_password)

    if settings.DATABASE_BACKEND == "firebase":
        FirestoreService.save("users", target_uid, {
            "id": target_uid,
            "email": admin_email,
            "role": "admin",
            "is_active": True,
            "approval_status": "APPROVED",
            "hashed_password": new_hash,
            "updated_at": now_iso,
        })
        for u in FirestoreService.query("users", {"email": admin_email}):
            FirestoreService.update("users", u.get("id"), {
                "hashed_password": new_hash,
                "updated_at": now_iso,
            })

    return {
        "success": True,
        "message": "Administrator password updated successfully in Firebase Authentication and database.",
        "firebase_auth_synced": fb_updated,
    }
