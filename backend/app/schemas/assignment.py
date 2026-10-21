from typing import Optional
from pydantic import BaseModel, ConfigDict


class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee: Optional[str] = None
    assignedTo: Optional[str] = None
    assignmentType: Optional[str] = None
    assignment_type: Optional[str] = None
    targetId: Optional[str] = None
    target_id: Optional[str] = None
    deadline: str
    priority: Optional[str] = "High"
    progress: Optional[int] = 0


class AssignmentUpdateProgress(BaseModel):
    progress: int
    status: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: str
    taskId: int
    title: str
    description: Optional[str] = None
    assignee: str
    assignedTo: str
    assignedBy: str
    assignmentType: str = "Individual"
    assignment_type: str = "Individual"
    targetId: Optional[str] = None
    target_id: Optional[str] = None
    deadline: str
    priority: str
    progress: int
    status: str

    model_config = ConfigDict(from_attributes=True)
