from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.system import DocumentSequence

class SequenceService:
    @staticmethod
    def get_next_sequence(db: Session, doc_type: str) -> str:
        """
        Generates unique, collision-safe, transactional document numbers:
        INV-YYYYMM-00001
        QUO-YYYYMM-00001
        ORD-YYYYMM-00001
        PAY-YYYYMM-00001
        CUST-0001
        """
        now = datetime.now(timezone.utc)
        current_ym = now.strftime("%Y%m")
        
        # Lock or query sequence record
        seq = db.query(DocumentSequence).filter(DocumentSequence.doc_type == doc_type).with_for_update().first()
        
        if not seq:
            seq = DocumentSequence(
                doc_type=doc_type,
                current_year_month=current_ym,
                current_sequence=1
            )
            db.add(seq)
            db.flush()
            next_num = 1
        else:
            if doc_type == "CUST":
                # Continuous customer sequence
                seq.current_sequence += 1
                next_num = seq.current_sequence
            else:
                if seq.current_year_month == current_ym:
                    seq.current_sequence += 1
                    next_num = seq.current_sequence
                else:
                    seq.current_year_month = current_ym
                    seq.current_sequence = 1
                    next_num = 1
            seq.updated_at = now
            db.flush()
            
        if doc_type == "CUST":
            return f"CUST-{next_num:04d}"
        else:
            return f"{doc_type}-{current_ym}-{next_num:05d}"
