import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.domain.enums import UserRole

def test_password_hashing_and_verification():
    plain = "RaisAdmin@2026"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_generation_and_payload():
    user_id = "test-user-uuid-123"
    role = UserRole.ADMIN.value
    token = create_access_token(subject=user_id, role=role)
    
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == role
