from typing import Optional, Any, Dict
from pydantic import BaseModel, EmailStr, ConfigDict


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    fullName: str
    employeeId: str
    email: EmailStr
    phone: Optional[str] = "--"
    password: str
    confirmPassword: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: int
    email: str
    role: str
    name: str
    employeeId: str
    department: Optional[str] = "Operations"
    designation: Optional[str] = "Employee"
    phone: Optional[str] = "--"
    status: Optional[str] = "Active"

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: Dict[str, Any]
