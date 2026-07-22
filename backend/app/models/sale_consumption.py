from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class SaleConsumption(Base):
    __tablename__ = "sale_consumptions"
    __table_args__ = (
        CheckConstraint("shares_consumed > 0", name="ck_consumption_shares_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_lot_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_lots.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    shares_consumed: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    cost_basis: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    lot_price_per_share_snapshot: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="consumptions")
    purchase_lot = relationship("PurchaseLot", back_populates="consumptions")
