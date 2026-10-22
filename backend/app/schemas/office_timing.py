from typing import Optional, List
from pydantic import BaseModel


class OfficeTimingBase(BaseModel):
    startTime: str = "09:30"
    endTime: str = "18:30"
    graceMinutes: int = 2


class SpecialTimingCreate(BaseModel):
    startTime: str
    endTime: str
    graceMinutes: int = 2
    specialDate: str
    specialOccasion: str


class SpecialTimingResponse(BaseModel):
    id: int
    startTime: str
    endTime: str
    graceMinutes: int
    specialDate: str
    specialOccasion: str


class OfficeTimingsBundle(BaseModel):
    regular: OfficeTimingBase
    specialDays: List[SpecialTimingResponse]
