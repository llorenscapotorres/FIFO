from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PurchaseLot(Base):
    __tablename__ = "purchase_lots"
    __table_args__ = (
        CheckConstraint("amount_invested > 0", name="ck_lot_amount_positive"),
        CheckConstraint("price_per_share > 0", name="ck_lot_price_positive"),
        CheckConstraint("shares_bought > 0", name="ck_lot_shares_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_invested: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    price_per_share: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    shares_bought: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    asset = relationship("Asset", back_populates="lots")
    consumptions = relationship("SaleConsumption", back_populates="purchase_lot")
