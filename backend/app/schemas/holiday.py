from typing import Optional
from pydantic import BaseModel, ConfigDict


class HolidayCreate(BaseModel):
    name: str
    date: str
    description: Optional[str] = "Company observed holiday."
    type: Optional[str] = "National Holiday"


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None


class HolidayResponse(BaseModel):
    id: str
    holidayId: int
    name: str
    date: str
    description: Optional[str] = None
    type: str

    model_config = ConfigDict(from_attributes=True)
