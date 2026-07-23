from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Asset, PurchaseLot, User
from app.schemas.imports import ImportConfirmRequest, ImportConfirmResult, ImportRowPreview
from app.services import excel_import, fifo

router = APIRouter(prefix="/api/imports/excel", tags=["imports"])


@router.post("/preview", response_model=list[ImportRowPreview])
async def preview_excel_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await file.read()
    parsed_rows = excel_import.parse_workbook(file_bytes)
    matches = excel_import.match_asset_names(db, current_user.id, parsed_rows)

    return [
        ImportRowPreview(
            row_number=row.row_number,
            row_type=row.row_type,
            raw_asset_name=row.raw_asset_name,
            matched_asset_id=matched_asset_id,
            is_new_asset=is_new,
            date=row.date,
            price=row.price,
            quantity=row.quantity,
            amount=row.amount,
            warnings=row.warnings,
        )
        for row, matched_asset_id, is_new in matches
    ]


@router.post("/confirm", response_model=ImportConfirmResult)
def confirm_excel_import(
    payload: ImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Process oldest-first so each sale is matched against the purchase lots that
    # would genuinely have existed for it at that point in time (real FIFO order).
    ordered_rows = sorted(payload.rows, key=lambda row: row.date)

    created_assets = 0
    created_lots = 0
    created_sales = 0
    asset_id_by_new_name: dict[str, int] = {}

    for row in ordered_rows:
        asset_id = row.asset_id
        if asset_id is None:
            new_name = row.new_asset_name.strip()
            asset_id = asset_id_by_new_name.get(new_name)
            if asset_id is None:
                asset = Asset(name=new_name, user_id=current_user.id)
                db.add(asset)
                db.flush()
                asset_id = asset.id
                asset_id_by_new_name[new_name] = asset_id
                created_assets += 1

        if row.row_type == "purchase":
            lot = PurchaseLot(
                asset_id=asset_id,
                purchase_date=row.date,
                amount_invested=row.amount,
                price_per_share=row.price,
                shares_bought=row.quantity,
            )
            db.add(lot)
            db.flush()
            created_lots += 1
        else:
            fifo.commit_sale(db, asset_id, row.date, row.amount, row.price, current_user.id)
            created_sales += 1

    db.commit()
    return ImportConfirmResult(
        created_assets=created_assets, created_lots=created_lots, created_sales=created_sales
    )
