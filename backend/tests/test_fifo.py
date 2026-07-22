from datetime import date
from decimal import Decimal

import pytest

from app.exceptions import InsufficientSharesError
from app.services import fifo, position


def test_single_lot_sale_computes_gain(db_session, asset, make_lot):
    make_lot(asset.id, date(2024, 1, 1), "1000.00", "100.000000", "10.000000")

    preview = fifo.preview_sale(db_session, asset.id, Decimal("700"), Decimal("140"))

    assert preview.shares_to_sell == Decimal("5.000000")
    assert preview.total_cost_basis == Decimal("500.00")
    assert preview.gain_loss == Decimal("200.00")
    assert len(preview.breakdown) == 1


def test_multi_lot_sale_spans_lots_oldest_first(db_session, asset, make_lot):
    make_lot(asset.id, date(2024, 1, 1), "1000.00", "100.000000", "10.000000")
    make_lot(asset.id, date(2024, 6, 1), "1000.00", "120.000000", "8.333333")

    preview = fifo.preview_sale(db_session, asset.id, Decimal("1200"), Decimal("100"))

    assert preview.shares_to_sell == Decimal("12.000000")
    assert len(preview.breakdown) == 2
    assert preview.breakdown[0].shares_consumed == Decimal("10.000000")
    assert preview.breakdown[1].shares_consumed == Decimal("2.000000")
    assert preview.total_cost_basis == Decimal("1240.00")
    assert preview.gain_loss == Decimal("-40.00")


def test_exact_lot_exhaustion_leaves_next_lot_untouched(db_session, asset, make_lot):
    lot1 = make_lot(asset.id, date(2024, 1, 1), "1000.00", "100.000000", "10.000000")
    make_lot(asset.id, date(2024, 6, 1), "1000.00", "120.000000", "8.333333")

    sale = fifo.commit_sale(db_session, asset.id, date(2024, 7, 1), Decimal("1000"), Decimal("100"))

    assert sale.gain_loss == Decimal("0.00")
    assert len(sale.consumptions) == 1
    assert sale.consumptions[0].purchase_lot_id == lot1.id

    lots = position.lot_summaries(db_session, asset.id)
    assert lots[0]["remaining_shares"] == Decimal("0.000000")
    assert lots[1]["remaining_shares"] == Decimal("8.333333")


def test_insufficient_shares_raises(db_session, asset, make_lot):
    make_lot(asset.id, date(2024, 1, 1), "1000.00", "100.000000", "10.000000")

    with pytest.raises(InsufficientSharesError):
        fifo.preview_sale(db_session, asset.id, Decimal("3000"), Decimal("100"))


def test_fractional_shares_round_trip_consistently(db_session, asset, make_lot):
    make_lot(asset.id, date(2024, 1, 1), "100.00", "33.330000", "3.000300")

    preview = fifo.preview_sale(db_session, asset.id, Decimal("50"), Decimal("33.33"))

    # shares quantized to 6dp, money to 2dp, and breakdown must sum exactly to total
    assert preview.shares_to_sell == Decimal("1.500150")
    assert sum((row.cost_basis for row in preview.breakdown), Decimal(0)) == preview.total_cost_basis


def test_committed_sale_persists_and_frees_shares_on_delete(db_session, asset, make_lot):
    make_lot(asset.id, date(2024, 1, 1), "1000.00", "100.000000", "10.000000")

    sale = fifo.commit_sale(db_session, asset.id, date(2024, 2, 1), Decimal("500"), Decimal("100"))
    lots = position.lot_summaries(db_session, asset.id)
    assert lots[0]["remaining_shares"] == Decimal("5.000000")

    db_session.delete(sale)
    db_session.commit()

    lots = position.lot_summaries(db_session, asset.id)
    assert lots[0]["remaining_shares"] == Decimal("10.000000")


def test_recompute_sale_updates_allocation(db_session, asset, make_lot):
    make_lot(asset.id, date(2024, 1, 1), "1000.00", "100.000000", "10.000000")

    sale = fifo.commit_sale(db_session, asset.id, date(2024, 2, 1), Decimal("500"), Decimal("100"))
    assert sale.shares_sold == Decimal("5.000000")

    updated = fifo.recompute_sale(
        db_session, asset.id, sale.id, date(2024, 2, 2), Decimal("800"), Decimal("100")
    )
    assert updated.shares_sold == Decimal("8.000000")
    assert updated.total_cost_basis == Decimal("800.00")

    lots = position.lot_summaries(db_session, asset.id)
    assert lots[0]["remaining_shares"] == Decimal("2.000000")
