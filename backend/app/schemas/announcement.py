from typing import Optional, List, Union
from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    message: str
    author: Optional[str] = "Admin Office"
    priority: Optional[str] = "Normal"  # "Normal", "High", "Urgent"
    announcement_type: Optional[str] = None
    announcementType: Optional[str] = None
    type: Optional[str] = None
    recipient_type: Optional[str] = None
    recipientType: Optional[str] = None
    recipients: Optional[List[str]] = None
    recipient_ids: Optional[Union[List[str], str]] = None
    recipientIds: Optional[Union[List[str], str]] = None

    model_config = ConfigDict(extra="allow")


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    author: Optional[str] = None
    priority: Optional[str] = None
    announcement_type: Optional[str] = None
    announcementType: Optional[str] = None
    type: Optional[str] = None
    recipient_type: Optional[str] = None
    recipientType: Optional[str] = None
    recipients: Optional[List[str]] = None
    recipient_ids: Optional[Union[List[str], str]] = None
    recipientIds: Optional[Union[List[str], str]] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(extra="allow")


class AnnouncementResponse(BaseModel):
    id: str
    announcementId: int
    title: str
    message: str
    author: str
    date: str
    priority: str
    type: str = "General"
    announcement_type: str = "General"
    announcementType: str = "General"
    recipient_type: str = "All Employees"
    recipientType: str = "All Employees"
    recipient_ids: Optional[List[str]] = None
    recipientIds: Optional[List[str]] = None
    recipients: Optional[List[str]] = None
    isActive: bool

    model_config = ConfigDict(from_attributes=True, extra="allow")
