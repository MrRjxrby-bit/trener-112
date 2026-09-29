from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt
from app.config import settings

ALGORITHM = "HS256"


def hash_password(p: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(p.encode("utf-8")[:72], salt).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8")[:72], h.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    # JWT-стандарт требует, чтобы "sub" был строкой
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None