"""
RAIS AGENCIES — Automated Nightly Database Backup Script
Captures a full, audit-proof snapshot of all operational data,
compresses it with gzip, and enforces a strict rolling 30-day retention policy.
"""

import os
import sys
import json
import gzip
import shutil
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure backend path is importable
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load environment variables from backend/.env
from dotenv import load_dotenv
env_path = os.path.join(BACKEND_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import (
    Customer, Product, Category,
    Order, OrderItem,
    Quotation, QuotationItem,
    Invoice, InvoiceItem,
    Payment, PaymentAllocation,
    StockMovement, AuditLog,
    SystemSetting, DocumentSequence,
    User
)

# Custom JSON encoder for SQLAlchemy types
class AlchemyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, bytes):
            return obj.decode("utf-8", errors="ignore")
        return super().default(obj)

def get_backup_directories():
    """
    Returns primary backup directory and any auto-detected cloud sync directories (OneDrive).
    """
    primary_dir = os.path.join(BASE_DIR, "backups")
    os.makedirs(primary_dir, exist_ok=True)
    
    target_dirs = [primary_dir]
    
    # Auto-detect OneDrive if available on Windows
    onedrive_path = os.environ.get("OneDrive") or os.environ.get("OneDriveConsumer")
    if onedrive_path and os.path.exists(onedrive_path):
        onedrive_backup = os.path.join(onedrive_path, "RAIS_Agencies_Backups")
        try:
            os.makedirs(onedrive_backup, exist_ok=True)
            target_dirs.append(onedrive_backup)
        except Exception as e:
            print(f"  [Notice] OneDrive folder not accessible: {e}")
            
    return target_dirs

def serialize_model_instances(query):
    """Converts SQLAlchemy query result to a list of clean dictionaries."""
    rows = []
    for item in query.all():
        data = {}
        for column in item.__table__.columns:
            val = getattr(item, column.name)
            # Mask sensitive passwords in user table
            if column.name == "password_hash":
                data[column.name] = "***MASKED***"
            else:
                data[column.name] = val
        rows.append(data)
    return rows

def purge_old_backups(backup_dir, retention_days=30):
    """Deletes backups older than retention_days (rolling 30-day window)."""
    cutoff_time = datetime.now() - timedelta(days=retention_days)
    removed_count = 0
    retained_count = 0

    if not os.path.exists(backup_dir):
        return 0, 0

    for filename in os.listdir(backup_dir):
        if filename.startswith("rais_backup_") and filename.endswith(".json.gz"):
            file_path = os.path.join(backup_dir, filename)
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            
            if file_mtime < cutoff_time:
                try:
                    os.remove(file_path)
                    removed_count += 1
                except Exception as e:
                    print(f"  [Warning] Could not remove {filename}: {e}")
            else:
                retained_count += 1

    return removed_count, retained_count

def run_backup():
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    timestamp_str = ist_now.strftime("%Y-%m-%d_%H%M%S")
    backup_filename = f"rais_backup_{timestamp_str}.json.gz"
    
    print("=" * 65)
    print(" 🛡️  RAIS AGENCIES — AUTOMATED DATABASE BACKUP")
    print(f" ⏰  Time: {ist_now.strftime('%d-%b-%Y %I:%M:%S %p')} IST")
    print("=" * 65)
    
    # 1. Database Connection
    db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL
    safe_url = db_url.split("@")[-1] if "@" in db_url else "local_sqlite"
    print(f"🔌 Connecting to Database ({safe_url})...")
    
    engine = create_engine(db_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # 2. Extract Data from All Operational Tables
    models_to_backup = [
        ("customers", Customer),
        ("categories", Category),
        ("products", Product),
        ("orders", Order),
        ("order_items", OrderItem),
        ("quotations", Quotation),
        ("quotation_items", QuotationItem),
        ("invoices", Invoice),
        ("invoice_items", InvoiceItem),
        ("payments", Payment),
        ("payment_allocations", PaymentAllocation),
        ("stock_movements", StockMovement),
        ("audit_logs", AuditLog),
        ("system_settings", SystemSetting),
        ("document_sequences", DocumentSequence),
        ("users", User)
    ]

    backup_payload = {
        "metadata": {
            "business": "RAIS AGENCIES Rayachoty",
            "system": "RAIS Management Platform v2.0",
            "created_at_ist": ist_now.strftime("%Y-%m-%d %H:%M:%S IST"),
            "database_host": safe_url,
            "table_summary": {}
        },
        "tables": {}
    }

    total_records = 0
    print("📦 Extracting table records:")
    try:
        for table_name, model_cls in models_to_backup:
            records = serialize_model_instances(db.query(model_cls))
            count = len(records)
            total_records += count
            backup_payload["tables"][table_name] = records
            backup_payload["metadata"]["table_summary"][table_name] = count
            print(f"  • {table_name.ljust(22)} : {str(count).rjust(5)} records")
    finally:
        db.close()

    # 3. Compress & Save
    target_dirs = get_backup_directories()
    primary_dir = target_dirs[0]
    primary_file_path = os.path.join(primary_dir, backup_filename)

    print(f"\n💾 Compressing and saving snapshot ({total_records} total records)...")
    json_bytes = json.dumps(backup_payload, cls=AlchemyEncoder, indent=2).encode("utf-8")
    uncompressed_size_kb = len(json_bytes) / 1024

    with gzip.open(primary_file_path, "wb", compresslevel=9) as f_out:
        f_out.write(json_bytes)

    compressed_size_kb = os.path.getsize(primary_file_path) / 1024
    compression_ratio = (1 - (compressed_size_kb / uncompressed_size_kb)) * 100

    print(f"  ✅ Saved Primary: {primary_file_path}")
    print(f"  📊 Uncompressed: {uncompressed_size_kb:.1f} KB | Compressed: {compressed_size_kb:.1f} KB ({compression_ratio:.1f}% space saved)")

    # 4. Mirror to Cloud Folder (OneDrive) if available
    if len(target_dirs) > 1:
        for cloud_dir in target_dirs[1:]:
            cloud_file = os.path.join(cloud_dir, backup_filename)
            try:
                shutil.copyfile(primary_file_path, cloud_file)
                print(f"  ☁️  Mirrored to Cloud Storage: {cloud_file}")
            except Exception as e:
                print(f"  [Warning] Cloud mirror failed: {e}")

    # 5. Enforce 30-Day Retention Policy
    print("\n🧹 Enforcing Rolling 30-Day Retention Policy:")
    for b_dir in target_dirs:
        purged, kept = purge_old_backups(b_dir, retention_days=30)
        print(f"  • Directory: {b_dir}")
        print(f"    - Purged (>30 days old) : {purged} file(s)")
        print(f"    - Retained (Current)    : {kept} file(s)")

    print("\n" + "=" * 65)
    print(" 🎉  NIGHTLY BACKUP COMPLETED SUCCESSFULLY!")
    print("=" * 65)
    return primary_file_path

if __name__ == "__main__":
    try:
        run_backup()
    except Exception as exc:
        print(f"\n❌ BACKUP FAILED: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
