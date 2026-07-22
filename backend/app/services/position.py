from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exceptions import NotFoundError
from app.models import Asset, PurchaseLot, SaleConsumption

MONEY_QUANT = Decimal("0.01")
SHARE_QUANT = Decimal("0.000001")


def get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise NotFoundError(f"Activo {asset_id} no encontrado.")
    return asset


def remaining_lots(db: Session, asset_id: int, for_update: bool = False) -> list[tuple[PurchaseLot, Decimal]]:
    """Lots for an asset with remaining shares > 0, ordered oldest-first (FIFO order)."""
    consumed_subq = (
        select(
            SaleConsumption.purchase_lot_id,
            func.sum(SaleConsumption.shares_consumed).label("consumed"),
        )
        .group_by(SaleConsumption.purchase_lot_id)
        .subquery()
    )

    query = (
        select(PurchaseLot, func.coalesce(consumed_subq.c.consumed, 0))
        .outerjoin(consumed_subq, consumed_subq.c.purchase_lot_id == PurchaseLot.id)
        .where(PurchaseLot.asset_id == asset_id)
        .order_by(PurchaseLot.purchase_date.asc(), PurchaseLot.id.asc())
    )
    if for_update:
        query = query.with_for_update(of=PurchaseLot)

    result = []
    for lot, consumed in db.execute(query).all():
        remaining = lot.shares_bought - Decimal(consumed)
        if remaining > 0:
            result.append((lot, remaining))
    return result


def shares_already_consumed(db: Session, purchase_lot_id: int) -> Decimal:
    total = db.execute(
        select(func.sum(SaleConsumption.shares_consumed)).where(
            SaleConsumption.purchase_lot_id == purchase_lot_id
        )
    ).scalar_one_or_none()
    return Decimal(total) if total is not None else Decimal(0)


def lot_summaries(db: Session, asset_id: int) -> list[dict]:
    all_lots = db.execute(
        select(PurchaseLot)
        .where(PurchaseLot.asset_id == asset_id)
        .order_by(PurchaseLot.purchase_date.asc(), PurchaseLot.id.asc())
    ).scalars().all()

    remaining_by_id = {lot.id: remaining for lot, remaining in remaining_lots(db, asset_id)}

    summaries = []
    for lot in all_lots:
        remaining_shares = remaining_by_id.get(lot.id, Decimal(0))
        remaining_cost_basis = (remaining_shares * lot.price_per_share).quantize(MONEY_QUANT)
        summaries.append(
            {
                "lot_id": lot.id,
                "purchase_date": lot.purchase_date,
                "price_per_share": lot.price_per_share,
                "shares_bought": lot.shares_bought,
                "remaining_shares": remaining_shares,
                "remaining_cost_basis": remaining_cost_basis,
            }
        )
    return summaries


def list_assets_with_position(db: Session) -> list[dict]:
    assets = db.execute(select(Asset).order_by(Asset.name.asc())).scalars().all()
    result = []
    for asset in assets:
        lots = lot_summaries(db, asset.id)
        total_remaining_shares = sum((lot["remaining_shares"] for lot in lots), Decimal(0))
        total_remaining_cost_basis = sum((lot["remaining_cost_basis"] for lot in lots), Decimal(0))
        result.append(
            {
                "id": asset.id,
                "name": asset.name,
                "created_at": asset.created_at,
                "total_remaining_shares": total_remaining_shares,
                "total_remaining_cost_basis": total_remaining_cost_basis,
            }
        )
    return result


def asset_summary(db: Session, asset_id: int) -> dict:
    get_asset_or_404(db, asset_id)
    lots = lot_summaries(db, asset_id)

    total_shares_bought_all_time = sum((lot["shares_bought"] for lot in lots), Decimal(0))
    total_remaining_shares = sum((lot["remaining_shares"] for lot in lots), Decimal(0))
    total_remaining_cost_basis = sum((lot["remaining_cost_basis"] for lot in lots), Decimal(0))
    average_cost_per_remaining_share = (
        (total_remaining_cost_basis / total_remaining_shares).quantize(SHARE_QUANT)
        if total_remaining_shares > 0
        else Decimal(0)
    )

    return {
        "total_shares_bought_all_time": total_shares_bought_all_time,
        "total_remaining_shares": total_remaining_shares,
        "total_remaining_cost_basis": total_remaining_cost_basis,
        "average_cost_per_remaining_share": average_cost_per_remaining_share,
        "per_lot": lots,
    }
