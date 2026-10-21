from typing import Optional
from pydantic import BaseModel, ConfigDict


class RegistrationRequestUpdate(BaseModel):
    status: Optional[str] = None  # "Approved" or "Rejected"
    reason: Optional[str] = None


class RegistrationRequestResponse(BaseModel):
    id: str
    requestId: int
    name: str
    fullName: str
    employeeId: str
    email: str
    phone: str
    status: str
    requestedDate: str
    rejectionReason: Optional[str] = None
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
