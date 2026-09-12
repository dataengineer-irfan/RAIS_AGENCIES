@echo off
REM ====================================================================
REM  RAIS AGENCIES — Automated Daily Database Backup Runner
REM ====================================================================
cd /d "%~dp0\.."
python scripts\daily_backup.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backup failed with exit code %ERRORLEVEL% >> backups\backup_error.log
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] Backup completed successfully.
