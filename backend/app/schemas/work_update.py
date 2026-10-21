from typing import Optional
from pydantic import BaseModel, ConfigDict


class WorkUpdateCreate(BaseModel):
    empName: Optional[str] = None
    employeeName: Optional[str] = None
    employeeId: Optional[str] = None
    updateText: Optional[str] = None
    tasksCompleted: Optional[str] = None
    blockers: Optional[str] = "None"
    tag: Optional[str] = "Operations"


class WorkUpdateResponse(BaseModel):
    id: str
    updateId: int
    emp: str
    employeeName: str
    employeeId: Optional[str] = None
    date: str
    time: str
    tag: str
    text: str
    tasksCompleted: str
    blockers: str

    model_config = ConfigDict(from_attributes=True)
