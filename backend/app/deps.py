from datetime import datetime, timezone

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.exceptions import UnauthorizedError
from app.models import User, UserSession

SESSION_COOKIE_NAME = "session_token"


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise UnauthorizedError("No has iniciado sesión.")

    session = db.query(UserSession).filter(UserSession.token == token).first()
    if session is None or session.expires_at < datetime.now(timezone.utc):
        raise UnauthorizedError("Tu sesión ha expirado. Inicia sesión de nuevo.")

    return session.user
