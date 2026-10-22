import random
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.services.firestore_service import firestore_service
from app.dependencies.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/assignments", tags=["Work Assignments"])


class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assignedTo: Optional[str] = None
    assignee: Optional[str] = None
    assignmentType: Optional[str] = "Individual"
    assignment_type: Optional[str] = None
    targetId: Optional[str] = None
    target_id: Optional[str] = None
    deadline: str
    priority: Optional[str] = "High"
    progress: Optional[int] = 0


class AssignmentUpdateProgress(BaseModel):
    progress: int
    status: Optional[str] = None


def format_assignment(task: dict) -> dict:
    mode = task.get("assignment_type") or task.get("assignmentType") or "Individual"
    task_id = task.get("id")
    code = task.get("task_code") or f"TSK-{task_id}"
    deadline_val = task.get("deadline", "")
    if isinstance(deadline_val, str) and "T" in deadline_val:
        deadline_val = deadline_val.split("T")[0]

    return {
        "id": code,
        "taskId": task_id,
        "title": task.get("title", ""),
        "description": task.get("description", ""),
        "assignee": task.get("assigned_to", "Unassigned"),
        "assignedTo": task.get("assigned_to", "Unassigned"),
        "assignedBy": task.get("assigned_by", "Administrator"),
        "assignmentType": mode,
        "assignment_type": mode,
        "targetId": task.get("target_id"),
        "target_id": task.get("target_id"),
        "deadline": deadline_val,
        "priority": task.get("priority", "High"),
        "progress": task.get("progress", 0),
        "status": task.get("status", "In Progress"),
    }


format_assignment_response = format_assignment


@router.get("", response_model=List[dict])
def list_assignments(
    current_user=Depends(get_current_user),
):
    """List work assignments from Firestore. Admins see all tasks; employees see relevant individual and team tasks."""
    all_tasks = firestore_service.list_documents("assignments")
    all_tasks.sort(key=lambda t: str(t.get("created_at", "")), reverse=True)

    if current_user.role == "admin":
        return [format_assignment(t) for t in all_tasks]

    # Resolve employee identity
    emp = None
    emps_by_uid = firestore_service.list_documents("employees", [("firebase_uid", "==", current_user.id)])
    if emps_by_uid:
        emp = emps_by_uid[0]
    else:
        emps_by_email = firestore_service.list_documents("employees", [("email", "==", current_user.email)])
        if emps_by_email:
            emp = emps_by_email[0]

    if not emp:
        return []

    emp_id = str(emp.get("employee_id", ""))
    emp_name = str(emp.get("full_name", "")).strip().lower()

    # Find teams employee belongs to
    all_teams = firestore_service.list_documents("teams")
    member_team_names = []
    member_team_ids = []
    for tm in all_teams:
        m_list = [str(x).strip().lower() for x in tm.get("members", [])]
        if emp_name in m_list or emp_id.lower() in m_list:
            member_team_names.append(str(tm.get("name", "")).strip().lower())
            member_team_ids.append(str(tm.get("id", "")))

    filtered = []
    for t in all_tasks:
        assignee_str = str(t.get("assigned_to", "")).strip().lower()
        t_type = (t.get("assignment_type") or "Individual").capitalize()
        t_target = str(t.get("target_id", "")).strip()

        if t_type == "Individual":
            if (
                t_target == emp_id
                or assignee_str == emp_name
                or assignee_str == emp_id.lower()
                or assignee_str == str(current_user.email).lower()
            ):
                filtered.append(t)
        elif t_type == "Team":
            if t_target in member_team_ids or assignee_str in member_team_names:
                filtered.append(t)
        else:
            if assignee_str == emp_name or assignee_str == emp_id.lower() or assignee_str in member_team_names:
                filtered.append(t)

    return [format_assignment(t) for t in filtered]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_assignment(
    data: AssignmentCreate,
    admin_user=Depends(get_current_admin),
):
    """Delegate work assignment to an individual employee or team (Admin only)."""
    if not data.title or not data.title.strip():
        raise HTTPException(status_code=400, detail="Please enter a work title.")

    if not data.deadline or not data.deadline.strip():
        raise HTTPException(status_code=400, detail="Please select a completion date.")
    try:
        d_date = date.fromisoformat(data.deadline.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid deadline date format (YYYY-MM-DD)")

    raw_priority = (data.priority or "High").strip()
    valid_priorities = ["Low", "Medium", "High"]
    matched_priority = "High"
    for vp in valid_priorities:
        if raw_priority.lower() == vp.lower():
            matched_priority = vp
            break

    raw_mode = (data.assignmentType or data.assignment_type or "Individual").strip()
    mode = "Team" if raw_mode.lower() == "team" else "Individual"

    target_id_stored: Optional[str] = None
    assigned_to_name: str = ""
    raw_target = (data.targetId or data.target_id or data.assignedTo or data.assignee or "").strip()

    if mode == "Individual":
        if not raw_target:
            raise HTTPException(status_code=400, detail="Please select an employee for individual assignment.")

        # Find employee in Firestore
        all_emps = firestore_service.list_documents("employees")
        target_emp = None
        for e in all_emps:
            if (
                str(e.get("employee_id")) == raw_target
                or str(e.get("email", "")).lower() == raw_target.lower()
                or str(e.get("full_name", "")).lower() == raw_target.lower()
                or str(e.get("id")) == raw_target
            ):
                target_emp = e
                break

        if not target_emp:
            raise HTTPException(
                status_code=400,
                detail=f"Selected employee '{raw_target}' not found or inactive. Please select a valid employee.",
            )
        assigned_to_name = target_emp.get("full_name", raw_target)
        target_id_stored = target_emp.get("employee_id")
    else:
        if not raw_target:
            raise HTTPException(status_code=400, detail="Please select a team for team assignment.")

        all_teams = firestore_service.list_documents("teams")
        target_team = None
        for tm in all_teams:
            if (
                str(tm.get("name", "")).lower() == raw_target.lower()
                or str(tm.get("id")) == raw_target
            ):
                target_team = tm
                break

        if not target_team:
            raise HTTPException(
                status_code=400,
                detail=f"Selected team '{raw_target}' not found. Please select an existing active team.",
            )
        assigned_to_name = target_team.get("name", raw_target)
        target_id_stored = str(target_team.get("id"))

    # Admin name resolution
    admin_name = getattr(admin_user, "name", None) or (admin_user.email.split("@")[0].title() if admin_user.email else "Administrator")

    # Generate collision-free task code
    all_codes = {t.get("task_code") for t in firestore_service.list_documents("assignments")}
    code = None
    for _ in range(30):
        candidate = f"TSK-{random.randint(100, 9999)}"
        if candidate not in all_codes:
            code = candidate
            break
    if not code:
        code = f"TSK-{int(datetime.now().timestamp() * 1000) % 100000}"

    now_iso = datetime.now(timezone.utc).isoformat()
    task_doc = {
        "task_code": code,
        "title": data.title.strip(),
        "description": data.description.strip() if data.description else "",
        "assigned_to": assigned_to_name,
        "assigned_by": admin_name,
        "assignment_type": mode,
        "target_id": target_id_stored,
        "deadline": d_date.isoformat(),
        "priority": matched_priority,
        "progress": data.progress or 0,
        "status": "In Progress" if (data.progress or 0) < 100 else "Completed",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    doc_id = firestore_service.create_document("assignments", task_doc)
    task_doc["id"] = doc_id

    # Record audit log
    firestore_service.create_document("audit_logs", {
        "actor_id": admin_user.id,
        "actor_email": admin_user.email,
        "action": "CREATE_ASSIGNMENT",
        "target_type": "assignments",
        "target_id": doc_id,
        "timestamp": now_iso,
    })

    return format_assignment(task_doc)


@router.patch("/{assignment_id}", response_model=dict)
def update_assignment_progress(
    assignment_id: str,
    data: AssignmentUpdateProgress,
    current_user=Depends(get_current_user),
):
    """Update task milestone completion percentage and status."""
    all_tasks = firestore_service.list_documents("assignments")
    target_task = None
    for t in all_tasks:
        if (
            str(t.get("task_code")) == str(assignment_id)
            or str(t.get("id")) == str(assignment_id)
        ):
            target_task = t
            break

    if not target_task:
        raise HTTPException(status_code=404, detail="Work assignment not found")

    new_prog = min(max(data.progress, 0), 100)
    new_status = data.status if data.status else ("Completed" if new_prog >= 100 else "In Progress")

    now_iso = datetime.now(timezone.utc).isoformat()
    updates = {
        "progress": new_prog,
        "status": new_status,
        "updated_at": now_iso,
    }

    firestore_service.update_document("assignments", str(target_task["id"]), updates)
    target_task.update(updates)

    return format_assignment(target_task)
