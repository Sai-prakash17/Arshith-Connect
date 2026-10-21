from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LeaveCreateRequest(BaseModel):
    employeeId: Optional[str] = None
    employee_id: Optional[str] = None
    employeeName: Optional[str] = None
    employee_name: Optional[str] = None
    leaveType: Optional[str] = None
    leave_type: Optional[str] = None
    type: Optional[str] = None
    startDate: Optional[str] = None
    start_date: Optional[str] = None
    from_date: Optional[str] = None
    endDate: Optional[str] = None
    end_date: Optional[str] = None
    to_date: Optional[str] = None
    daysCount: Optional[int] = None
    days_count: Optional[int] = None
    days: Optional[int] = None
    durationType: Optional[str] = None
    duration_type: Optional[str] = None
    leaveDate: Optional[str] = None
    leave_date: Optional[str] = None
    startTime: Optional[str] = None
    start_time: Optional[str] = None
    endTime: Optional[str] = None
    end_time: Optional[str] = None
    hoursCount: Optional[float] = None
    hours_count: Optional[float] = None
    hours: Optional[float] = None
    reason: str


class LeaveStatusUpdateRequest(BaseModel):
    status: str  # "Approved" or "Rejected"
    rejectionRemarks: Optional[str] = None
    rejection_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None


class LeaveResponse(BaseModel):
    id: str
    request_id: Optional[str] = None
    requestId: Optional[str] = None
    leaveId: Optional[int] = None
    leave_id: Optional[int] = None
    employeeId: Optional[str] = None
    employee_id: Optional[str] = None
    employeeName: Optional[str] = None
    employee_name: Optional[str] = None
    leaveType: Optional[str] = None
    leave_type: Optional[str] = None
    type: Optional[str] = None
    startDate: Optional[str] = None
    start_date: Optional[str] = None
    from_date: Optional[str] = None
    fromDate: Optional[str] = None
    endDate: Optional[str] = None
    end_date: Optional[str] = None
    to_date: Optional[str] = None
    toDate: Optional[str] = None
    daysCount: Optional[int] = None
    days_count: Optional[int] = None
    days: Optional[int] = None
    duration_type: Optional[str] = "Full-Day Leave"
    durationType: Optional[str] = "Full-Day Leave"
    start_time: Optional[str] = None
    startTime: Optional[str] = None
    end_time: Optional[str] = None
    endTime: Optional[str] = None
    hours_count: Optional[float] = None
    hoursCount: Optional[float] = None
    hours: Optional[float] = None
    duration_display: Optional[str] = None
    durationDisplay: Optional[str] = None
    reason: str
    status: str
    requestDate: Optional[str] = None
    appliedDate: Optional[str] = None
    applied_date: Optional[str] = None
    applied_on: Optional[str] = None
    appliedOn: Optional[str] = None
    reviewedBy: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    approvedAt: Optional[str] = None
    rejectionRemarks: Optional[str] = None
    rejection_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")
