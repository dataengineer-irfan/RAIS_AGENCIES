from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: str
    username: Optional[str] = None
    user_role: Optional[str] = None
    entity_name: str
    entity_id: str
    action: str
    before_state: Optional[str] = None
    after_state: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SystemSettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SystemSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None
