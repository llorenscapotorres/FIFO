from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.exceptions import ConflictError, NotFoundError
from app.models import PurchaseLot, SaleConsumption, User
from app.schemas.purchase_lot import PurchaseLotCreate, PurchaseLotRead, PurchaseLotUpdate, PurchaseLotWithRemaining
from app.services import position

router = APIRouter(prefix="/api/assets/{asset_id}/lots", tags=["purchase-lots"])


def _get_lot_or_404(db: Session, asset_id: int, lot_id: int) -> PurchaseLot:
    lot = db.get(PurchaseLot, lot_id)
    if lot is None or lot.asset_id != asset_id:
        raise NotFoundError(f"Compra {lot_id} no encontrada para este activo.")
    return lot


@router.get("", response_model=list[PurchaseLotWithRemaining])
def list_lots(
    asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    position.get_asset_or_404(db, asset_id, current_user.id)
    return position.lots_with_remaining(db, asset_id)


@router.post("", response_model=PurchaseLotRead, status_code=201)
def create_lot(
    asset_id: int,
    payload: PurchaseLotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    position.get_asset_or_404(db, asset_id, current_user.id)
    lot = PurchaseLot(asset_id=asset_id, **payload.model_dump())
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot


@router.put("/{lot_id}", response_model=PurchaseLotRead)
def update_lot(
    asset_id: int,
    lot_id: int,
    payload: PurchaseLotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    position.get_asset_or_404(db, asset_id, current_user.id)
    lot = _get_lot_or_404(db, asset_id, lot_id)
    consumed = position.shares_already_consumed(db, lot_id)
    if payload.shares_bought < consumed:
        raise ConflictError(
            f"No se puede reducir a {payload.shares_bought} acciones: ya se han consumido {consumed} en ventas."
        )
    lot.purchase_date = payload.purchase_date
    lot.amount_invested = payload.amount_invested
    lot.price_per_share = payload.price_per_share
    lot.shares_bought = payload.shares_bought
    db.commit()
    db.refresh(lot)
    return lot


@router.delete("/{lot_id}", status_code=204)
def delete_lot(
    asset_id: int, lot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    position.get_asset_or_404(db, asset_id, current_user.id)
    lot = _get_lot_or_404(db, asset_id, lot_id)
    blocking_sales = db.execute(
        select(SaleConsumption.sale_id).where(SaleConsumption.purchase_lot_id == lot_id).distinct()
    ).scalars().all()
    if blocking_sales:
        raise ConflictError(
            "No se puede borrar esta compra porque ya ha sido usada en una o más ventas.",
            blocking_sale_ids=blocking_sales,
        )
    db.delete(lot)
    db.commit()
