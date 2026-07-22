from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import Asset, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    session = session_local()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def user(db_session):
    user = User(email="tester@example.com", hashed_password="not-a-real-hash")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def asset(db_session, user):
    asset = Asset(name="MSCI World ETF", user_id=user.id)
    db_session.add(asset)
    db_session.commit()
    db_session.refresh(asset)
    return asset


@pytest.fixture()
def make_lot(db_session):
    from app.models import PurchaseLot

    def _make_lot(asset_id, purchase_date, amount_invested, price_per_share, shares_bought):
        lot = PurchaseLot(
            asset_id=asset_id,
            purchase_date=purchase_date,
            amount_invested=Decimal(amount_invested),
            price_per_share=Decimal(price_per_share),
            shares_bought=Decimal(shares_bought),
        )
        db_session.add(lot)
        db_session.commit()
        db_session.refresh(lot)
        return lot

    return _make_lot
