from decimal import Decimal
from io import BytesIO

import openpyxl

from app.services import excel_import


def _workbook_bytes(header: list[str], rows: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    sheet = wb.active
    sheet.append(header)
    for row in rows:
        sheet.append(row)
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def test_detect_columns_matches_varied_synonyms():
    header = ["Fecha compra", "Valor", "Precio unitario", "Nº acciones", "Importe", "Tipo"]
    column_map = excel_import.detect_columns(header)

    assert column_map["date"] == 0
    assert column_map["asset"] == 1
    assert column_map["price"] == 2
    assert column_map["quantity"] == 3
    assert column_map["amount"] == 4
    assert column_map["operation"] == 5


def test_parse_workbook_derives_missing_field_and_flags_row_type():
    header = ["Fecha", "Activo", "Precio", "Acciones", "Importe", "Tipo"]
    rows = [
        ["01/03/2023", "MSCI World ETF", 100, 10, None, "Compra"],  # amount missing, derivable
        ["02/03/2023", "MSCI World ETF", 50, 4, 200, "Venta"],
        ["not-a-date", "MSCI World ETF", 10, 1, 10, "Compra"],  # bad date
        ["03/03/2023", "MSCI World ETF", 10, 1, 10, "???"],  # unknown operation type
    ]
    parsed = excel_import.parse_file(_workbook_bytes(header, rows), filename="statement.xlsx")

    assert len(parsed) == 4

    row1 = parsed[0]
    assert row1.row_type == "purchase"
    assert row1.amount == Decimal("1000.00")
    assert row1.warnings == []

    row2 = parsed[1]
    assert row2.row_type == "sale"
    assert row2.warnings == []

    row3 = parsed[2]
    assert row3.date is None
    assert "fecha" in row3.warnings[0].lower()

    row4 = parsed[3]
    assert row4.row_type == "unknown"
    assert any("compra o una venta" in w for w in row4.warnings)


def test_match_asset_names_exact_and_fuzzy(db_session, asset):
    rows = excel_import.parse_file(
        _workbook_bytes(
            ["Fecha", "Activo", "Precio", "Acciones", "Importe", "Tipo"],
            [
                ["01/03/2023", "MSCI World ETF", 100, 1, 100, "Compra"],
                ["01/03/2023", "MSCI Word ETF", 100, 1, 100, "Compra"],  # typo, should fuzzy-match
                ["01/03/2023", "Totally Different Fund", 100, 1, 100, "Compra"],
            ],
        ),
        filename="statement.xlsx",
    )

    matches = excel_import.match_asset_names(db_session, asset.user_id, rows)

    exact_row, exact_asset_id, exact_is_new = matches[0]
    assert exact_asset_id == asset.id
    assert exact_is_new is False

    typo_row, typo_asset_id, typo_is_new = matches[1]
    assert typo_asset_id == asset.id
    assert typo_is_new is False

    new_row, new_asset_id, new_is_new = matches[2]
    assert new_asset_id is None
    assert new_is_new is True


def test_parse_file_reads_comma_delimited_csv():
    csv_text = (
        "Fecha,Activo,Precio,Acciones,Importe,Tipo\n"
        "01/03/2023,MSCI World ETF,100.50,10,1005.00,Compra\n"
        "02/03/2023,MSCI World ETF,50.25,4,201.00,Venta\n"
    )
    parsed = excel_import.parse_file(csv_text.encode("utf-8"), filename="statement.csv")

    assert len(parsed) == 2
    assert parsed[0].row_type == "purchase"
    assert parsed[0].price == Decimal("100.50")
    assert parsed[1].row_type == "sale"
    assert parsed[1].amount == Decimal("201.00")


def test_parse_file_reads_semicolon_delimited_csv_with_european_decimals():
    # Common in Spanish bank/broker exports: ";" as the field separator (since "," is
    # already used as the decimal separator) and "," instead of "." for decimals.
    csv_text = (
        "Fecha;Activo;Precio;Acciones;Importe;Tipo\n"
        "01/03/2023;MSCI World ETF;100,50;10;1005,00;Compra\n"
    )
    parsed = excel_import.parse_file(csv_text.encode("utf-8"), filename="statement.csv")

    assert len(parsed) == 1
    assert parsed[0].price == Decimal("100.50")
    assert parsed[0].amount == Decimal("1005.00")
    assert parsed[0].quantity == Decimal("10")


def test_is_supported_filename():
    assert excel_import.is_supported_filename("statement.xlsx") is True
    assert excel_import.is_supported_filename("statement.csv") is True
    assert excel_import.is_supported_filename("statement.CSV") is True
    assert excel_import.is_supported_filename("statement.pdf") is False
    assert excel_import.is_supported_filename(None) is False
