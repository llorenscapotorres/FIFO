"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "purchase_lots",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("asset_id", sa.BigInteger(), sa.ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("amount_invested", sa.Numeric(18, 2), nullable=False),
        sa.Column("price_per_share", sa.Numeric(18, 6), nullable=False),
        sa.Column("shares_bought", sa.Numeric(18, 6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount_invested > 0", name="ck_lot_amount_positive"),
        sa.CheckConstraint("price_per_share > 0", name="ck_lot_price_positive"),
        sa.CheckConstraint("shares_bought > 0", name="ck_lot_shares_positive"),
    )
    op.create_index("ix_purchase_lots_asset_id", "purchase_lots", ["asset_id"])
    op.create_index(
        "ix_purchase_lots_asset_date_id", "purchase_lots", ["asset_id", "purchase_date", "id"]
    )

    op.create_table(
        "sales",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("asset_id", sa.BigInteger(), sa.ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("sell_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("sell_price", sa.Numeric(18, 6), nullable=False),
        sa.Column("shares_sold", sa.Numeric(18, 6), nullable=False),
        sa.Column("total_cost_basis", sa.Numeric(18, 2), nullable=False),
        sa.Column("gain_loss", sa.Numeric(18, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("sell_amount > 0", name="ck_sale_amount_positive"),
        sa.CheckConstraint("sell_price > 0", name="ck_sale_price_positive"),
        sa.CheckConstraint("shares_sold > 0", name="ck_sale_shares_positive"),
    )
    op.create_index("ix_sales_asset_id", "sales", ["asset_id"])

    op.create_table(
        "sale_consumptions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("sale_id", sa.BigInteger(), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "purchase_lot_id",
            sa.BigInteger(),
            sa.ForeignKey("purchase_lots.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("shares_consumed", sa.Numeric(18, 6), nullable=False),
        sa.Column("cost_basis", sa.Numeric(18, 2), nullable=False),
        sa.Column("lot_price_per_share_snapshot", sa.Numeric(18, 6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("shares_consumed > 0", name="ck_consumption_shares_positive"),
    )
    op.create_index("ix_sale_consumptions_sale_id", "sale_consumptions", ["sale_id"])
    op.create_index("ix_sale_consumptions_purchase_lot_id", "sale_consumptions", ["purchase_lot_id"])


def downgrade() -> None:
    op.drop_table("sale_consumptions")
    op.drop_table("sales")
    op.drop_table("purchase_lots")
    op.drop_table("assets")
