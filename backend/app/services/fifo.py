from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.exceptions import InsufficientSharesError, NotFoundError
from app.models import Sale, SaleConsumption
from app.services.position import get_asset_or_404, remaining_lots

SHARE_QUANT = Decimal("0.000001")
MONEY_QUANT = Decimal("0.01")


def quantize_shares(value: Decimal) -> Decimal:
    return value.quantize(SHARE_QUANT, rounding=ROUND_HALF_UP)


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


@dataclass
class ConsumptionRow:
    purchase_lot_id: int
    purchase_date: date
    lot_price_per_share: Decimal
    shares_consumed: Decimal
    cost_basis: Decimal


@dataclass
class SalePreview:
    shares_to_sell: Decimal
    total_cost_basis: Decimal
    gain_loss: Decimal
    breakdown: list[ConsumptionRow]


def _compute(
    db: Session, asset_id: int, sell_amount: Decimal, sell_price: Decimal, for_update: bool
) -> SalePreview:
    shares_to_sell = quantize_shares(sell_amount / sell_price)
    lots = remaining_lots(db, asset_id, for_update=for_update)

    breakdown: list[ConsumptionRow] = []
    still_needed = shares_to_sell
    for lot, remaining in lots:
        if still_needed <= 0:
            break
        take = quantize_shares(min(remaining, still_needed))
        if take <= 0:
            continue
        cost_basis = quantize_money(take * lot.price_per_share)
        breakdown.append(
            ConsumptionRow(
                purchase_lot_id=lot.id,
                purchase_date=lot.purchase_date,
                lot_price_per_share=lot.price_per_share,
                shares_consumed=take,
                cost_basis=cost_basis,
            )
        )
        still_needed -= take

    if still_needed > 0:
        available = sum((remaining for _, remaining in lots), Decimal(0))
        raise InsufficientSharesError(available_shares=quantize_shares(available), requested_shares=shares_to_sell)

    total_cost_basis = quantize_money(sum((row.cost_basis for row in breakdown), Decimal(0)))
    gain_loss = quantize_money(sell_amount - total_cost_basis)

    return SalePreview(
        shares_to_sell=shares_to_sell,
        total_cost_basis=total_cost_basis,
        gain_loss=gain_loss,
        breakdown=breakdown,
    )


def preview_sale(
    db: Session, asset_id: int, sell_amount: Decimal, sell_price: Decimal, user_id: int
) -> SalePreview:
    get_asset_or_404(db, asset_id, user_id)
    return _compute(db, asset_id, sell_amount, sell_price, for_update=False)


def _add_consumptions(db: Session, sale_id: int, breakdown: list[ConsumptionRow]) -> None:
    for row in breakdown:
        db.add(
            SaleConsumption(
                sale_id=sale_id,
                purchase_lot_id=row.purchase_lot_id,
                shares_consumed=row.shares_consumed,
                cost_basis=row.cost_basis,
                lot_price_per_share_snapshot=row.lot_price_per_share,
            )
        )


def commit_sale(
    db: Session, asset_id: int, sale_date: date, sell_amount: Decimal, sell_price: Decimal, user_id: int
) -> Sale:
    get_asset_or_404(db, asset_id, user_id)
    preview = _compute(db, asset_id, sell_amount, sell_price, for_update=True)

    sale = Sale(
        asset_id=asset_id,
        sale_date=sale_date,
        sell_amount=quantize_money(sell_amount),
        sell_price=sell_price,
        shares_sold=preview.shares_to_sell,
        total_cost_basis=preview.total_cost_basis,
        gain_loss=preview.gain_loss,
    )
    db.add(sale)
    db.flush()

    _add_consumptions(db, sale.id, preview.breakdown)

    db.commit()
    db.refresh(sale)
    return sale


def recompute_sale(
    db: Session,
    asset_id: int,
    sale_id: int,
    sale_date: date,
    sell_amount: Decimal,
    sell_price: Decimal,
    user_id: int,
) -> Sale:
    get_asset_or_404(db, asset_id, user_id)
    sale = db.get(Sale, sale_id)
    if sale is None or sale.asset_id != asset_id:
        raise NotFoundError(f"Venta {sale_id} no encontrada para este activo.")

    for consumption in list(sale.consumptions):
        db.delete(consumption)
    db.flush()

    preview = _compute(db, asset_id, sell_amount, sell_price, for_update=True)

    sale.sale_date = sale_date
    sale.sell_amount = quantize_money(sell_amount)
    sale.sell_price = sell_price
    sale.shares_sold = preview.shares_to_sell
    sale.total_cost_basis = preview.total_cost_basis
    sale.gain_loss = preview.gain_loss

    _add_consumptions(db, sale.id, preview.breakdown)

    db.commit()
    db.refresh(sale)
    return sale
