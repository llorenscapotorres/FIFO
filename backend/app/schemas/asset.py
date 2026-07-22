from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class AssetUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime


class AssetWithPosition(AssetRead):
    total_remaining_shares: Decimal
    total_remaining_cost_basis: Decimal
