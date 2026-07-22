from decimal import Decimal

from pydantic import BaseModel


class YearlyPnL(BaseModel):
    year: int
    gain_loss: Decimal
    sale_count: int
