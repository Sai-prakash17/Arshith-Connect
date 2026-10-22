from typing import Dict, Any, Optional
from fastapi import HTTPException, status


class DuplicateFieldsException(HTTPException):
    """Exception raised when employee registration encounters duplicate unique fields."""

    def __init__(
        self,
        errors: Dict[str, str],
        detail: str = "Employee registration failed due to duplicate fields.",
    ):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
        self.errors = errors
