from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PurchaseLotCreate(BaseModel):
    purchase_date: date
    amount_invested: Decimal = Field(gt=0)
    price_per_share: Decimal = Field(gt=0)
    shares_bought: Decimal = Field(gt=0)


class PurchaseLotUpdate(PurchaseLotCreate):
    pass


class PurchaseLotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    purchase_date: date
    amount_invested: Decimal
    price_per_share: Decimal
    shares_bought: Decimal
    created_at: datetime


class PurchaseLotWithRemaining(PurchaseLotRead):
    remaining_shares: Decimal
    remaining_cost_basis: Decimal
