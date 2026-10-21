from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    teamName: str
    department: Optional[str] = "Operations"
    description: Optional[str] = None
    leader: Optional[str] = None
    members: Optional[List[str]] = []  # List of employee IDs or names


class TeamUpdate(BaseModel):
    teamName: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    leader: Optional[str] = None
    members: Optional[List[str]] = None


class TeamResponse(BaseModel):
    id: int
    name: str
    department: str
    description: Optional[str] = None
    leader: Optional[str] = None
    members: List[str]
    memberCount: int

    model_config = ConfigDict(from_attributes=True)
