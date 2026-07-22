from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SaleRequest(BaseModel):
    sale_date: date
    sell_amount: Decimal = Field(gt=0)
    sell_price: Decimal = Field(gt=0)


class ConsumptionRead(BaseModel):
    purchase_lot_id: int
    purchase_date: date
    lot_price_per_share: Decimal
    shares_consumed: Decimal
    cost_basis: Decimal


class SalePreviewRead(BaseModel):
    shares_to_sell: Decimal
    total_cost_basis: Decimal
    gain_loss: Decimal
    breakdown: list[ConsumptionRead]


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    sale_date: date
    sell_amount: Decimal
    sell_price: Decimal
    shares_sold: Decimal
    total_cost_basis: Decimal
    gain_loss: Decimal
    created_at: datetime


class SaleWithBreakdown(SaleRead):
    breakdown: list[ConsumptionRead]
