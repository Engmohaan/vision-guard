# ============================================================
# security.py - Password hashing + JWT auth + role-based dependencies
# ============================================================

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext

import database

SECRET_KEY = os.environ.get("VISIONGUARD_SECRET_KEY", "dev-secret-change-in-production-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12   # 12 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def _resolve_user_from_token(token: Optional[str]):
    if not token:
        raise HTTPException(status_code=401, detail="Ma jirto token - fadlan soo gal (login)")

    payload = decode_token(token)
    if payload is None or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token khaldan ama dhacay - dib u soo gal")

    user = database.get_user_by_username(payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User-ka lama helin")

    return user


def get_current_user(token: str = Depends(oauth2_scheme)):
    """Standard dependency - reads the Bearer token from the Authorization header."""
    return _resolve_user_from_token(token)


def get_current_user_from_query(token: Optional[str] = Query(None)):
    """
    Variant for endpoints consumed by <img src="..."> tags (e.g. the MJPEG
    webcam stream), which cannot set an Authorization header - the frontend
    passes ?token=... instead.
    """
    return _resolve_user_from_token(token)


def get_user_from_token_string(token: Optional[str]):
    """
    Non-raising variant for WebSocket handlers, where raising HTTPException
    doesn't make sense (there's no HTTP response to attach it to) - the
    caller should close the socket with an appropriate code if this
    returns None.
    """
    if not token:
        return None
    payload = decode_token(token)
    if payload is None or "sub" not in payload:
        return None
    return database.get_user_by_username(payload["sub"])


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Kaliya admin ayaa awoodda tan")
    return user
