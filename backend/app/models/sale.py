from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("sell_amount > 0", name="ck_sale_amount_positive"),
        CheckConstraint("sell_price > 0", name="ck_sale_price_positive"),
        CheckConstraint("shares_sold > 0", name="ck_sale_shares_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    sell_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    sell_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    shares_sold: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    total_cost_basis: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    gain_loss: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    asset = relationship("Asset", back_populates="sales")
    consumptions = relationship(
        "SaleConsumption", back_populates="sale", cascade="all, delete-orphan", passive_deletes=True
    )
