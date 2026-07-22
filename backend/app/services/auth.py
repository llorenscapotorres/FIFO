import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import ValidationError
from app.models import User, UserSession

SESSION_TOKEN_BYTES = 32
SPECIAL_CHARS = set(string.punctuation)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise ValidationError("La contraseña debe tener al menos 8 caracteres.")
    if not any(char in SPECIAL_CHARS for char in password):
        raise ValidationError(
            "La contraseña debe incluir al menos un carácter especial (no solo letras o solo números)."
        )


def create_session(db: Session, user: User) -> UserSession:
    token = secrets.token_urlsafe(SESSION_TOKEN_BYTES)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    session = UserSession(token=token, user_id=user.id, expires_at=expires_at)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, token: str) -> None:
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if session is not None:
        db.delete(session)
        db.commit()
