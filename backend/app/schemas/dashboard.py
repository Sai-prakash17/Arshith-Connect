from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.attendance import AttendanceResponse
from app.schemas.meeting import MeetingResponse
from app.schemas.announcement import AnnouncementResponse
from app.schemas.assignment import AssignmentResponse


class AdminDashboardStats(BaseModel):
    totalPresent: int
    wfo: int
    wfh: int
    late: int
    pendingLeaves: int
    thisMonthHolidays: int


class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats
    recentAnnouncements: List[AnnouncementResponse]
    todayMeetings: List[MeetingResponse]
    recentAttendances: List[AttendanceResponse]


class EmployeeDashboardResponse(BaseModel):
    employeeName: str
    employeeId: str
    department: str
    todayAttendance: Dict[str, Any]
    monthlyStats: Dict[str, Any]
    recentAnnouncements: List[AnnouncementResponse]
    upcomingMeetings: List[MeetingResponse]
    activeAssignments: List[AssignmentResponse]
