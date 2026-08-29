import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "RAIS Agencies Business Management Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "rais-agencies-production-secret-key-super-secure-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Database
    DATABASE_URL: str = "sqlite:///./rais_agencies.db"
    
    # Company Profile (Authoritative RAIS Agencies details)
    COMPANY_NAME: str = "RAIS AGENCIES"
    COMPANY_TAGLINE: str = "Wholesale Frozen Food Products & Packaging Solutions"
    COMPANY_ADDRESS: str = "Near Reddies Colony, Rayachoty - 516269"
    COMPANY_PHONE_PRIMARY: str = "9347453135"
    COMPANY_PHONE_SECONDARY: str = "9573261696"
    COMPANY_EMAIL: str = "orders@raisagencies.com"
    COMPANY_GSTIN: str = "37AABCR1234F1Z8"
    DEFAULT_CURRENCY: str = "INR"
    DEFAULT_CURRENCY_SYMBOL: str = "₹"
    
    # AI Engine
    AI_PROVIDER: str = "semantic_engine"
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
