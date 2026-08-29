# RAIS Agencies — Operations, Deployment & Backup Guide

## 1. Prerequisites
- **Operating System**: Windows / Linux / macOS
- **Runtimes**: Python 3.11+ / 3.12, Node.js 18+ / 24
- **Database**: PostgreSQL 15+ (Production) or SQLite (Development)

## 2. Startup Instructions

### 2.1 Backend Server
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Seed authoritative catalogue & initial users
python seed_data.py

# 4. Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at: `http://localhost:8000/api/docs`

### 2.2 Frontend Server
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```
Access the application UI at: `http://localhost:3000`

---

## 3. Seeded Accounts & Credentials

| Role | Username | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `RaisAdmin@2026` | Full platform control, audit viewing, price overrides, user management. |
| **Operator** | `operator` | `RaisOperator@2026` | Billing operations, invoice issuance, recording settlements, customer management. |
| **Viewer** | `viewer` | `RaisViewer@2026` | Read-only analytics, dashboard, product search, statement viewing. |

---

## 4. Backup & Recovery Strategy

### 4.1 Automated PostgreSQL Backup
For Windows/Linux environments running PostgreSQL:
```bash
# Export full transactional backup with timestamp
pg_dump -U postgres -d rais_agencies -F c -b -v -f "rais_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.dump"
```

### 4.2 SQLite Backup (Development/Local)
```powershell
# Copy database file with WAL flush
Copy-Item "backend\rais_agencies.db" -Destination "backups\rais_agencies_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
```

### 4.3 Recovery Procedure
```bash
# Restore from custom dump format
pg_restore -U postgres -d rais_agencies -v "rais_backup_YYYYMMDD.dump"
```
