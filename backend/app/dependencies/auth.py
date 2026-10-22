from typing import Optional, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.core.firebase import verify_firebase_token
from app.db.session import get_db
from app.services.firestore_service import FirestoreService

security_scheme = HTTPBearer(auto_error=False)


class DictEntity:
    """Wrapper that permits attribute-style and dict-style access to Firestore documents."""
    def __init__(self, data: dict):
        self._data = dict(data)
        for k, v in self._data.items():
            setattr(self, k, v)
        # Ensure common alternate naming aliases
        if "id" not in self._data and "_firestore_id" in self._data:
            self.id = self._data["_firestore_id"]
        if "employee_id" in self._data and "employeeId" not in self._data:
            self.employeeId = self._data["employee_id"]
        elif "employeeId" in self._data and "employee_id" not in self._data:
            self.employee_id = self._data["employeeId"]
        if "full_name" in self._data and "fullName" not in self._data:
            self.fullName = self._data["full_name"]
            self.name = self._data["full_name"]
        elif "fullName" in self._data and "full_name" not in self._data:
            self.full_name = self._data["fullName"]
            self.name = self._data["fullName"]

    def __getitem__(self, key: str) -> Any:
        return self._data.get(key)

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def to_dict(self) -> dict:
        return dict(self._data)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Any:
    """Validate Bearer JWT token (FastAPI JWT or Firebase ID Token) and return authenticated User."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user_id = None
    token_role = None
    email = None

    # 1. Attempt decoding as local application JWT
    payload = decode_access_token(token)
    if payload:
        user_id = payload.get("sub")
        token_role = payload.get("role")
        email = payload.get("email")
    else:
        # 2. Attempt decoding as Firebase Authentication ID token
        fb_token = verify_firebase_token(token)
        if fb_token:
            user_id = fb_token.get("uid")
            email = fb_token.get("email")
            token_role = fb_token.get("role") or ("admin" if fb_token.get("admin") else "employee")

    if not user_id and not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired or is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Resolve User via Firestore if DATABASE_BACKEND == "firebase"
    if settings.DATABASE_BACKEND == "firebase":
        user_data = None
        if user_id:
            user_data = FirestoreService.get_by_id("users", user_id)
        if not user_data and email:
            matches = FirestoreService.query("users", {"email": email.lower().strip()})
            if matches:
                user_data = matches[0]

        # Also search Firestore 'admins' collection if not in users
        if not user_data:
            if user_id:
                user_data = FirestoreService.get_by_id("admins", user_id)
            if not user_data and email:
                matches = FirestoreService.query("admins", {"email": email.lower().strip()})
                if matches:
                    user_data = matches[0]
            if user_data:
                user_data = dict(user_data)
                user_data["role"] = "admin"
                user_data["is_active"] = True
                user_data["approval_status"] = "APPROVED"
                if "id" not in user_data and "_firestore_id" in user_data:
                    user_data["id"] = user_data["_firestore_id"]

        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with this token was not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = DictEntity(user_data)
    else:
        # Fallback to PostgreSQL
        from app.models.user import User as PgUser
        try:
            uid = int(user_id) if user_id and str(user_id).isdigit() else None
        except Exception:
            uid = None

        user = db.query(PgUser).filter(PgUser.id == uid).first() if uid else None
        if not user and email:
            user = db.query(PgUser).filter(PgUser.email == email.lower().strip()).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with this token was not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Validate role (case-insensitive)
    role = str(getattr(user, "role", "employee")).strip().lower()
    if token_role and str(token_role).strip().lower() != role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token role does not match account privileges",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate approval status for employees
    approval_status = str(getattr(user, "approval_status", "APPROVED")).strip().upper()
    if role == "employee" and approval_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending Admin approval or was rejected",
        )

    is_active = getattr(user, "is_active", True)
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated or is unapproved",
        )

    return user


def get_current_admin(
    current_user: Any = Depends(get_current_user),
) -> Any:
    """Verify administrator authorization."""
    role = str(getattr(current_user, "role", "")).strip().lower()
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to perform this action",
        )
    return current_user


def get_current_employee(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Get active Employee entity for the authenticated user."""
    role = str(getattr(current_user, "role", "")).strip().lower()
    if role != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee privileges required. Administrator accounts cannot access employee-specific resources.",
        )

    user_id = getattr(current_user, "id", None)
    email = getattr(current_user, "email", "")

    if settings.DATABASE_BACKEND == "firebase":
        emp_data = None
        if user_id:
            matches = FirestoreService.query("employees", {"user_id": user_id})
            if matches:
                emp_data = matches[0]
        if not emp_data and email:
            matches = FirestoreService.query("employees", {"email": email.lower().strip()})
            if matches:
                emp_data = matches[0]

        if not emp_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee record not found for authenticated user",
            )

        employee = DictEntity(emp_data)
    else:
        from app.models.employee import Employee as PgEmployee
        employee = db.query(PgEmployee).filter(PgEmployee.user_id == user_id).first() if user_id else None
        if not employee:
            employee = db.query(PgEmployee).filter(PgEmployee.email == email).first()

        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee record not found for authenticated user",
            )

    status_val = getattr(employee, "status", "Active")
    if status_val != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee profile is not active or pending approval",
        )

    return employee
