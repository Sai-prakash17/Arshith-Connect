from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.services.firestore_service import firestore_service
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/work-updates", tags=["Work Updates"])


class WorkUpdateCreate(BaseModel):
    employeeName: Optional[str] = None
    empName: Optional[str] = None
    employeeId: Optional[str] = None
    tasksCompleted: Optional[str] = None
    updateText: Optional[str] = None
    tag: Optional[str] = "Operations"
    blockers: Optional[str] = "None"


def format_work_update(u: dict) -> dict:
    u_id = u.get("id")
    code = u.get("update_code") or f"UPD-{u_id}"
    date_val = u.get("date", "")
    if isinstance(date_val, str) and "T" in date_val:
        date_val = date_val.split("T")[0]

    tasks = u.get("tasks_completed") or u.get("text") or ""
    return {
        "id": code,
        "updateId": u_id,
        "emp": u.get("employee_name", ""),
        "employeeName": u.get("employee_name", ""),
        "employeeId": u.get("employee_id") or "--",
        "date": date_val,
        "time": u.get("time") or "Today",
        "tag": u.get("tag", "Operations"),
        "text": tasks,
        "tasksCompleted": tasks,
        "blockers": u.get("blockers") or "None",
    }


format_work_update_response = format_work_update


@router.get("", response_model=List[dict])
def list_work_updates(
    tag: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """Retrieve daily standup logs and sprint activity from Firestore."""
    filters = []
    if tag and tag.upper() != "ALL":
        filters.append(("tag", "==", tag))

    updates = firestore_service.list_documents("work_updates", filters if filters else None)
    updates.sort(key=lambda u: (str(u.get("date", "")), str(u.get("created_at", ""))), reverse=True)
    return [format_work_update(u) for u in updates]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def submit_work_update(
    data: WorkUpdateCreate,
    current_user=Depends(get_current_user),
):
    """Post daily accomplishments and sprint blocker reports."""
    # Resolve employee profile
    emp = None
    emps_by_uid = firestore_service.list_documents("employees", [("firebase_uid", "==", current_user.id)])
    if emps_by_uid:
        emp = emps_by_uid[0]
    else:
        emps_by_email = firestore_service.list_documents("employees", [("email", "==", current_user.email)])
        if emps_by_email:
            emp = emps_by_email[0]

    name = data.employeeName or data.empName or (emp.get("full_name") if emp else current_user.email.split("@")[0])
    emp_id = data.employeeId or (emp.get("employee_id") if emp else None)
    text = (data.tasksCompleted or data.updateText or "").strip()

    if not text:
        raise HTTPException(status_code=400, detail="Work update text is required.")

    code = f"UPD-{datetime.now().strftime('%Y%m%d%H%M%S')[-4:]}"
    now_time = datetime.now().strftime("%I:%M %p")
    now_iso = datetime.now(timezone.utc).isoformat()

    doc_data = {
        "update_code": code,
        "employee_id": emp_id,
        "employee_name": name,
        "date": date.today().isoformat(),
        "time": now_time,
        "tag": data.tag or "Operations",
        "tasks_completed": text,
        "blockers": data.blockers.strip() if data.blockers else "None",
        "created_at": now_iso,
    }

    doc_id = firestore_service.create_document("work_updates", doc_data)
    doc_data["id"] = doc_id

    return format_work_update(doc_data)
