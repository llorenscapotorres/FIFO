from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import SESSION_COOKIE_NAME, get_current_user
from app.exceptions import ConflictError, UnauthorizedError
from app.models import User
from app.schemas.user import LoginRequest, UserCreate, UserRead
from app.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_MAX_AGE_SECONDS = settings.session_ttl_days * 24 * 60 * 60


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: UserCreate, response: Response, db: Session = Depends(get_db)):
    auth_service.validate_password_strength(payload.password)

    email = payload.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise ConflictError("Ya existe una cuenta con ese email.")

    user = User(email=email, hashed_password=auth_service.hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    session = auth_service.create_session(db, user)
    _set_session_cookie(response, session.token)
    return user


@router.post("/login", response_model=UserRead)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not auth_service.verify_password(payload.password, user.hashed_password):
        raise UnauthorizedError("Email o contraseña incorrectos.")

    session = auth_service.create_session(db, user)
    _set_session_cookie(response, session.token)
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        auth_service.delete_session(db, token)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
