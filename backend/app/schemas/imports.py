from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ImportRowPreview(BaseModel):
    row_number: int
    row_type: Literal["purchase", "sale", "unknown"]
    raw_asset_name: str
    matched_asset_id: int | None
    is_new_asset: bool
    date: date | None
    price: Decimal | None
    quantity: Decimal | None
    amount: Decimal | None
    warnings: list[str]


class ImportConfirmRow(BaseModel):
    row_type: Literal["purchase", "sale"]
    asset_id: int | None = None
    new_asset_name: str | None = None
    date: date
    price: Decimal = Field(gt=0)
    quantity: Decimal = Field(gt=0)
    amount: Decimal = Field(gt=0)

    @model_validator(mode="after")
    def _check_asset_reference(self):
        if self.asset_id is None and not (self.new_asset_name and self.new_asset_name.strip()):
            raise ValueError("Cada fila debe indicar un activo existente o el nombre de uno nuevo.")
        return self


class ImportConfirmRequest(BaseModel):
    rows: list[ImportConfirmRow]


class ImportConfirmResult(BaseModel):
    created_assets: int
    created_lots: int
    created_sales: int
