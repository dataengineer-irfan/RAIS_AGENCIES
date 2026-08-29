from datetime import datetime, timezone
import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.system import DocumentSequence
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.order import Order
from app.models.payment import Payment

class SequenceService:
    @staticmethod
    def get_next_sequence(db: Session, doc_type: str) -> str:
        """
        Generates unique, collision-safe, transactional document numbers:
        INV-YYYYMM-00001
        QUO-YYYYMM-00001
        ORD-YYYYMM-00001
        PAY-YYYYMM-00001
        REC-YYYYMM-00001
        ADJ-YYYYMM-00001
        CUST-0001
        """
        now = datetime.now(timezone.utc)
        current_ym = now.strftime("%Y%m")
        
        # Lock or query sequence record
        seq = db.query(DocumentSequence).filter(DocumentSequence.doc_type == doc_type).with_for_update().first()
        
        # Calculate baseline from actual existing records to guarantee zero uniqueness conflicts
        max_existing = 0
        if doc_type == "CUST":
            cust_codes = db.query(Customer.customer_code).all()
            for (code,) in cust_codes:
                if code and code.startswith("CUST-"):
                    try:
                        num = int(code.split("-")[1])
                        if num > max_existing:
                            max_existing = num
                    except Exception:
                        pass
        elif doc_type == "INV":
            inv_nums = db.query(Invoice.invoice_number).filter(Invoice.invoice_number.like(f"INV-{current_ym}-%")).all()
            for (code,) in inv_nums:
                if code:
                    try:
                        num = int(code.split("-")[-1])
                        if num > max_existing:
                            max_existing = num
                    except Exception:
                        pass
        elif doc_type == "ORD":
            ord_nums = db.query(Order.order_number).filter(Order.order_number.like(f"ORD-{current_ym}-%")).all()
            for (code,) in ord_nums:
                if code:
                    try:
                        num = int(code.split("-")[-1])
                        if num > max_existing:
                            max_existing = num
                    except Exception:
                        pass
        elif doc_type == "PAY":
            pay_nums = db.query(Payment.payment_number).filter(Payment.payment_number.like(f"PAY-{current_ym}-%")).all()
            for (code,) in pay_nums:
                if code:
                    try:
                        num = int(code.split("-")[-1])
                        if num > max_existing:
                            max_existing = num
                    except Exception:
                        pass

        if not seq:
            next_num = max(max_existing + 1, 1)
            seq = DocumentSequence(
                doc_type=doc_type,
                current_year_month=current_ym,
                current_sequence=next_num
            )
            db.add(seq)
            db.flush()
        else:
            if doc_type == "CUST":
                current_val = max(seq.current_sequence, max_existing)
                next_num = current_val + 1
                seq.current_sequence = next_num
            else:
                if seq.current_year_month == current_ym:
                    current_val = max(seq.current_sequence, max_existing)
                    next_num = current_val + 1
                    seq.current_sequence = next_num
                else:
                    seq.current_year_month = current_ym
                    next_num = max(max_existing + 1, 1)
                    seq.current_sequence = next_num
            seq.updated_at = now
            db.flush()
            
        if doc_type == "CUST":
            return f"CUST-{next_num:04d}"
        else:
            return f"{doc_type}-{current_ym}-{next_num:05d}"
