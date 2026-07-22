from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class LotSummary(BaseModel):
    lot_id: int
    purchase_date: date
    price_per_share: Decimal
    shares_bought: Decimal
    remaining_shares: Decimal
    remaining_cost_basis: Decimal


class AssetSummary(BaseModel):
    total_shares_bought_all_time: Decimal
    total_remaining_shares: Decimal
    total_remaining_cost_basis: Decimal
    average_cost_per_remaining_share: Decimal
    per_lot: list[LotSummary]
