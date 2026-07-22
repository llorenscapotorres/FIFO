from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.report import YearlyPnL
from app.services import position

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/yearly-pnl", response_model=list[YearlyPnL])
def get_yearly_pnl(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return position.yearly_pnl(db, current_user.id)
