from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.exceptions import NotFoundError
from app.models import Sale
from app.schemas.sale import ConsumptionRead, SaleRead, SaleRequest, SaleWithBreakdown
from app.services import fifo, position

router = APIRouter(prefix="/api/assets/{asset_id}/sales", tags=["sales"])


def _to_breakdown_schema(rows) -> list[ConsumptionRead]:
    return [
        ConsumptionRead(
            purchase_lot_id=row.purchase_lot_id,
            purchase_date=row.purchase_date,
            lot_price_per_share=row.lot_price_per_share,
            shares_consumed=row.shares_consumed,
            cost_basis=row.cost_basis,
        )
        for row in rows
    ]


def _sale_with_breakdown(sale: Sale) -> SaleWithBreakdown:
    breakdown = [
        ConsumptionRead(
            purchase_lot_id=c.purchase_lot_id,
            purchase_date=c.purchase_lot.purchase_date,
            lot_price_per_share=c.lot_price_per_share_snapshot,
            shares_consumed=c.shares_consumed,
            cost_basis=c.cost_basis,
        )
        for c in sale.consumptions
    ]
    return SaleWithBreakdown(
        id=sale.id,
        asset_id=sale.asset_id,
        sale_date=sale.sale_date,
        sell_amount=sale.sell_amount,
        sell_price=sale.sell_price,
        shares_sold=sale.shares_sold,
        total_cost_basis=sale.total_cost_basis,
        gain_loss=sale.gain_loss,
        created_at=sale.created_at,
        breakdown=breakdown,
    )


@router.post("/preview")
def preview_sale(asset_id: int, payload: SaleRequest, db: Session = Depends(get_db)):
    preview = fifo.preview_sale(db, asset_id, payload.sell_amount, payload.sell_price)
    return {
        "shares_to_sell": preview.shares_to_sell,
        "total_cost_basis": preview.total_cost_basis,
        "gain_loss": preview.gain_loss,
        "breakdown": _to_breakdown_schema(preview.breakdown),
    }


@router.post("", response_model=SaleWithBreakdown, status_code=201)
def create_sale(asset_id: int, payload: SaleRequest, db: Session = Depends(get_db)):
    sale = fifo.commit_sale(db, asset_id, payload.sale_date, payload.sell_amount, payload.sell_price)
    return _sale_with_breakdown(sale)


@router.get("", response_model=list[SaleRead])
def list_sales(asset_id: int, db: Session = Depends(get_db)):
    position.get_asset_or_404(db, asset_id)
    sales = db.execute(
        select(Sale).where(Sale.asset_id == asset_id).order_by(Sale.sale_date.desc(), Sale.id.desc())
    ).scalars().all()
    return sales


@router.get("/{sale_id}", response_model=SaleWithBreakdown)
def get_sale(asset_id: int, sale_id: int, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if sale is None or sale.asset_id != asset_id:
        raise NotFoundError(f"Venta {sale_id} no encontrada para este activo.")
    return _sale_with_breakdown(sale)


@router.put("/{sale_id}", response_model=SaleWithBreakdown)
def update_sale(asset_id: int, sale_id: int, payload: SaleRequest, db: Session = Depends(get_db)):
    sale = fifo.recompute_sale(
        db, asset_id, sale_id, payload.sale_date, payload.sell_amount, payload.sell_price
    )
    return _sale_with_breakdown(sale)


@router.delete("/{sale_id}", status_code=204)
def delete_sale(asset_id: int, sale_id: int, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if sale is None or sale.asset_id != asset_id:
        raise NotFoundError(f"Venta {sale_id} no encontrada para este activo.")
    db.delete(sale)
    db.commit()
