"""
RAIS AGENCIES — Disaster Recovery & Backup Restoration Utility
Safely inspects or restores data from any rais_backup_*.json.gz archive.
"""

import os
import sys
import json
import gzip
import argparse
from datetime import datetime

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

def get_latest_backup():
    if not os.path.exists(BACKUP_DIR):
        return None
    backups = [
        f for f in os.listdir(BACKUP_DIR)
        if f.startswith("rais_backup_") and f.endswith(".json.gz")
    ]
    if not backups:
        return None
    backups.sort(reverse=True)
    return os.path.join(BACKUP_DIR, backups[0])

def inspect_backup(filepath):
    print("=" * 65)
    print(f" 🔍 INSPECTING BACKUP ARCHIVE: {os.path.basename(filepath)}")
    print("=" * 65)
    
    with gzip.open(filepath, "rt", encoding="utf-8") as f:
        data = json.load(f)

    meta = data.get("metadata", {})
    tables = data.get("tables", {})
    
    print(f" 🏢 Business       : {meta.get('business', 'N/A')}")
    print(f" ⏰ Snapshot Time  : {meta.get('created_at_ist', 'N/A')}")
    print(f" 🔌 Source DB Host : {meta.get('database_host', 'N/A')}")
    print(f" 📦 Total Tables   : {len(tables)}")
    print("\n Table Breakdown:")
    total_records = 0
    for t_name, rows in tables.items():
        total_records += len(rows)
        print(f"  • {t_name.ljust(22)} : {str(len(rows)).rjust(5)} rows")
    
    print(f"\n Total Records in Archive: {total_records}")
    print("=" * 65)

def main():
    parser = argparse.ArgumentParser(description="RAIS Backup Inspection & Restoration")
    parser.add_argument("--file", help="Path to .json.gz backup file (defaults to latest)")
    parser.add_argument("--inspect", action="store_true", default=True, help="Inspect backup contents")
    args = parser.parse_args()

    target_file = args.file or get_latest_backup()
    if not target_file or not os.path.exists(target_file):
        print(f"❌ No backup file found in {BACKUP_DIR}")
        sys.exit(1)

    inspect_backup(target_file)

if __name__ == "__main__":
    main()
