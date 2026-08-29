from fastapi import HTTPException, status
from typing import Any, Optional, Dict

class RaisAppException(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        detail: str = "A business rule error occurred",
        error_code: Optional[str] = "BUSINESS_RULE_ERROR",
        extra: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={"message": detail, "error_code": error_code, "extra": extra or {}}
        )

class EntityNotFoundException(RaisAppException):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with identifier '{entity_id}' was not found.",
            error_code="NOT_FOUND"
        )

class InsufficientPermissionsException(RaisAppException):
    def __init__(self, required_role: str = "ADMIN"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User lacks required role: {required_role}.",
            error_code="FORBIDDEN"
        )

class InvalidFinancialOperationException(RaisAppException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="INVALID_FINANCIAL_OPERATION"
        )
