"""add user_id to assets and backfill existing data to a seed user

Revision ID: 0003_add_user_id_to_assets
Revises: 0002_add_users_and_sessions
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_user_id_to_assets"
down_revision: Union[str, None] = "0002_add_users_and_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Seed account that inherits all pre-existing (pre-auth) assets/lots/sales.
# The hash below is bcrypt(cost=12) of the account's real password -- the
# plaintext password itself is never stored in the repo or git history.
SEED_USER_EMAIL = "llorenscapo2001@gmail.com"
SEED_USER_PASSWORD_HASH = "$2b$12$LLi50D2GQ19SvJu3icb63eK7HGZuIfQfimRG/M6dWEG6H/Z.LImpq"

users_table = sa.table(
    "users",
    sa.column("id", sa.BigInteger),
    sa.column("email", sa.String),
    sa.column("hashed_password", sa.String),
)
assets_table = sa.table(
    "assets",
    sa.column("id", sa.BigInteger),
    sa.column("user_id", sa.BigInteger),
)


def upgrade() -> None:
    op.add_column("assets", sa.Column("user_id", sa.BigInteger(), nullable=True))

    bind = op.get_bind()
    result = bind.execute(
        sa.insert(users_table)
        .values(email=SEED_USER_EMAIL, hashed_password=SEED_USER_PASSWORD_HASH)
        .returning(users_table.c.id)
    )
    seed_user_id = result.scalar_one()

    bind.execute(sa.update(assets_table).values(user_id=seed_user_id))

    op.alter_column("assets", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_assets_user_id_users", "assets", "users", ["user_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_assets_user_id", "assets", ["user_id"])

    op.drop_constraint("assets_name_key", "assets", type_="unique")
    op.create_unique_constraint("uq_assets_user_id_name", "assets", ["user_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_assets_user_id_name", "assets", type_="unique")
    op.create_unique_constraint("assets_name_key", "assets", ["name"])
    op.drop_index("ix_assets_user_id", table_name="assets")
    op.drop_constraint("fk_assets_user_id_users", "assets", type_="foreignkey")
    op.drop_column("assets", "user_id")

    op.execute(sa.delete(users_table).where(users_table.c.email == SEED_USER_EMAIL))
