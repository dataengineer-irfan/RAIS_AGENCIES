from datetime import date, datetime
from zoneinfo import ZoneInfo

# Authoritative business timezone for RAIS AGENCIES (Rayachoty, Andhra Pradesh, India)
IST = ZoneInfo("Asia/Kolkata")

def get_ist_now() -> datetime:
    """Return the current datetime in Indian Standard Time (Asia/Kolkata, UTC+5:30)."""
    return datetime.now(IST)

def get_ist_today() -> date:
    """Return the current calendar date in Indian Standard Time (Asia/Kolkata, UTC+5:30)."""
    return datetime.now(IST).date()
