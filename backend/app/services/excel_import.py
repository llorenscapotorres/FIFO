import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher, get_close_matches
from io import BytesIO

import openpyxl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Asset

SHARE_QUANT = Decimal("0.000001")
MONEY_QUANT = Decimal("0.01")

FUZZY_COLUMN_CUTOFF = 0.72
FUZZY_ASSET_CUTOFF = 0.8

# Column headers vary a lot between brokers/banks, so each field is matched against a
# set of common synonyms (in Spanish and English) rather than an exact/fixed name.
FIELD_ALIASES: dict[str, set[str]] = {
    "date": {
        "fecha", "fecha compra", "fecha venta", "fecha operacion", "fecha de la operacion",
        "date", "dia", "fecha valor",
    },
    "asset": {
        "activo", "valor", "ticker", "nombre", "producto", "instrumento", "symbol",
        "security", "empresa", "descripcion",
    },
    "price": {
        "precio", "precio unitario", "precio por accion", "precio compra", "precio venta",
        "price", "cotizacion", "precio de compra", "precio de venta", "precio ejecucion",
    },
    "quantity": {
        "acciones", "cantidad", "numero de acciones", "n acciones", "nº acciones", "shares",
        "titulos", "unidades", "quantity", "num acciones", "num titulos",
    },
    "amount": {
        "importe", "total", "importe invertido", "importe total", "efectivo", "amount",
        "valor efectivo", "total invertido", "importe operacion", "importe bruto",
    },
    "operation": {
        "tipo", "operacion", "tipo operacion", "type", "compra venta", "movimiento",
        "tipo movimiento",
    },
}

BUY_KEYWORDS = {"compra", "buy", "purchase", "alta"}
SELL_KEYWORDS = {"venta", "sell", "sale", "baja"}


def _normalize(text) -> str:
    text = str(text or "").strip().lower()
    text = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def detect_columns(header_row: list) -> dict[str, int]:
    """Map each known field to a column index by matching header text against synonyms."""
    normalized_headers = [_normalize(cell) for cell in header_row]
    normalized_aliases = {field_name: {_normalize(a) for a in aliases} for field_name, aliases in FIELD_ALIASES.items()}

    column_map: dict[str, int] = {}
    used_columns: set[int] = set()

    # Pass 1: exact match after normalization.
    for field_name, aliases in normalized_aliases.items():
        for idx, header in enumerate(normalized_headers):
            if idx in used_columns or not header:
                continue
            if header in aliases:
                column_map[field_name] = idx
                used_columns.add(idx)
                break

    # Pass 2: substring containment, either direction.
    for field_name, aliases in normalized_aliases.items():
        if field_name in column_map:
            continue
        for idx, header in enumerate(normalized_headers):
            if idx in used_columns or not header:
                continue
            if any(alias in header or header in alias for alias in aliases):
                column_map[field_name] = idx
                used_columns.add(idx)
                break

    # Pass 3: fuzzy fallback for typos/abbreviations.
    for field_name, aliases in normalized_aliases.items():
        if field_name in column_map:
            continue
        best_idx, best_ratio = None, 0.0
        for idx, header in enumerate(normalized_headers):
            if idx in used_columns or not header:
                continue
            ratio = max((SequenceMatcher(None, header, alias).ratio() for alias in aliases), default=0.0)
            if ratio > best_ratio:
                best_ratio, best_idx = ratio, idx
        if best_idx is not None and best_ratio >= FUZZY_COLUMN_CUTOFF:
            column_map[field_name] = best_idx
            used_columns.add(best_idx)

    return column_map


def _to_decimal(value) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value).strip().replace("€", "").replace(" ", "")
    if not text:
        return None
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _to_date(value) -> date_type | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date_type):
        return value
    text = str(value).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _detect_row_type(value) -> str | None:
    if value is None:
        return None
    text = _normalize(value)
    if any(keyword in text for keyword in BUY_KEYWORDS):
        return "purchase"
    if any(keyword in text for keyword in SELL_KEYWORDS):
        return "sale"
    return None


@dataclass
class ParsedRow:
    row_number: int
    row_type: str  # "purchase" | "sale" | "unknown"
    raw_asset_name: str
    date: date_type | None
    price: Decimal | None
    quantity: Decimal | None
    amount: Decimal | None
    warnings: list[str] = field(default_factory=list)


def parse_workbook(file_bytes: bytes) -> list[ParsedRow]:
    workbook = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True, read_only=True)
    sheet = workbook.worksheets[0]

    rows_iter = sheet.iter_rows(values_only=True)
    header_row = next(rows_iter, None)
    if header_row is None:
        return []

    column_map = detect_columns(list(header_row))

    def cell(raw_row, field_name: str):
        idx = column_map.get(field_name)
        if idx is None or idx >= len(raw_row):
            return None
        return raw_row[idx]

    parsed: list[ParsedRow] = []
    for row_number, raw_row in enumerate(rows_iter, start=2):
        if raw_row is None or all(value is None for value in raw_row):
            continue

        warnings: list[str] = []

        parsed_date = _to_date(cell(raw_row, "date"))
        if parsed_date is None:
            warnings.append("No se pudo interpretar la fecha.")

        raw_asset_value = cell(raw_row, "asset")
        raw_asset_name = str(raw_asset_value).strip() if raw_asset_value is not None else ""
        if not raw_asset_name:
            warnings.append("Falta el nombre del activo.")

        price = _to_decimal(cell(raw_row, "price"))
        quantity = _to_decimal(cell(raw_row, "quantity"))
        amount = _to_decimal(cell(raw_row, "amount"))

        if price is None and quantity and amount:
            price = (amount / quantity).quantize(SHARE_QUANT) if quantity != 0 else None
        if quantity is None and price and amount:
            quantity = (amount / price).quantize(SHARE_QUANT) if price != 0 else None
        if amount is None and price and quantity:
            amount = (price * quantity).quantize(MONEY_QUANT)

        if price is None or quantity is None or amount is None:
            warnings.append("Faltan datos de precio/cantidad/importe (se necesitan al menos dos de los tres).")

        row_type = _detect_row_type(cell(raw_row, "operation")) or "unknown"
        if row_type == "unknown":
            warnings.append("No se pudo determinar si es una compra o una venta.")

        parsed.append(
            ParsedRow(
                row_number=row_number,
                row_type=row_type,
                raw_asset_name=raw_asset_name,
                date=parsed_date,
                price=price,
                quantity=quantity,
                amount=amount,
                warnings=warnings,
            )
        )

    return parsed


def match_asset_names(
    db: Session, user_id: int, rows: list[ParsedRow]
) -> list[tuple[ParsedRow, int | None, bool]]:
    """For each row, try to match its raw asset text against the user's existing assets."""
    existing_assets = db.execute(select(Asset).where(Asset.user_id == user_id)).scalars().all()
    normalized_lookup = {_normalize(a.name): a for a in existing_assets}

    results: list[tuple[ParsedRow, int | None, bool]] = []
    for row in rows:
        normalized_name = _normalize(row.raw_asset_name)
        matched_asset = normalized_lookup.get(normalized_name) if normalized_name else None
        if matched_asset is None and normalized_name:
            close = get_close_matches(normalized_name, normalized_lookup.keys(), n=1, cutoff=FUZZY_ASSET_CUTOFF)
            if close:
                matched_asset = normalized_lookup[close[0]]
        results.append((row, matched_asset.id if matched_asset else None, matched_asset is None))
    return results
