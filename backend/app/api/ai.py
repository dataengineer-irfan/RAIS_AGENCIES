from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.models.user import User
from app.ai.semantic_engine import SemanticAIEngine
from app.ai.knowledge import RAIS_KNOWLEDGE_BASE
from app.api.deps import require_any_authenticated

router = APIRouter(prefix="/ai", tags=["Semantic AI Assistant"])

@router.post("/query")
def query_ai_assistant(
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    query_text = payload.get("query", "").strip()
    if not query_text:
        return {"answer": "Please ask a question regarding RAIS Agencies operations, catalogue, invoices, or revenue.", "intent": "EMPTY"}

    result = SemanticAIEngine.process_query(
        db=db,
        query=query_text,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return result

@router.get("/knowledge")
def get_business_knowledge(
    current_user: User = Depends(require_any_authenticated)
):
    return RAIS_KNOWLEDGE_BASE
