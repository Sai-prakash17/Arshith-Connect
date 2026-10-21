from typing import Optional, List, Union
from pydantic import BaseModel, ConfigDict


class MeetingCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    start_time: Optional[str] = None
    startTime: Optional[str] = None
    end_time: Optional[str] = None
    endTime: Optional[str] = None
    duration: Optional[str] = "30 mins"
    organizer: Optional[str] = None
    organizer_id: Optional[str] = None
    organizerId: Optional[str] = None
    host: Optional[str] = None
    platform: Optional[str] = "Google Meet"
    link: Optional[str] = "https://meet.google.com/new"
    attendees: Optional[int] = None
    description: Optional[str] = "General discussion."
    room: Optional[str] = "Virtual Room A"
    recipient_type: Optional[str] = None
    recipientType: Optional[str] = None
    recipients: Optional[List[str]] = None
    recipient_ids: Optional[Union[List[str], str]] = None
    recipientIds: Optional[Union[List[str], str]] = None

    model_config = ConfigDict(extra="allow")


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    start_time: Optional[str] = None
    startTime: Optional[str] = None
    end_time: Optional[str] = None
    endTime: Optional[str] = None
    duration: Optional[str] = None
    organizer: Optional[str] = None
    organizer_id: Optional[str] = None
    organizerId: Optional[str] = None
    host: Optional[str] = None
    platform: Optional[str] = None
    link: Optional[str] = None
    attendees: Optional[int] = None
    description: Optional[str] = None
    room: Optional[str] = None
    status: Optional[str] = None
    recipient_type: Optional[str] = None
    recipientType: Optional[str] = None
    recipients: Optional[List[str]] = None
    recipient_ids: Optional[Union[List[str], str]] = None
    recipientIds: Optional[Union[List[str], str]] = None

    model_config = ConfigDict(extra="allow")


class MeetingResponse(BaseModel):
    id: str
    meetingId: int
    title: str
    date: str
    time: str
    start_time: Optional[str] = None
    startTime: Optional[str] = None
    end_time: Optional[str] = None
    endTime: Optional[str] = None
    duration: str
    organizer: str
    organizer_id: Optional[str] = None
    organizerId: Optional[str] = None
    host: str
    platform: str
    link: str
    attendees: int
    description: Optional[str] = None
    room: str
    status: str
    recipient_type: Optional[str] = "All Employees"
    recipientType: Optional[str] = "All Employees"
    recipient_ids: Optional[List[str]] = None
    recipientIds: Optional[List[str]] = None
    recipients: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")
