from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.exceptions import ConflictError
from app.models import Asset, PurchaseLot
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate, AssetWithPosition
from app.schemas.position import AssetSummary
from app.services import position

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=list[AssetWithPosition])
def list_assets(db: Session = Depends(get_db)):
    return position.list_assets_with_position(db)


@router.post("", response_model=AssetRead, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    asset = Asset(name=payload.name.strip())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    return position.get_asset_or_404(db, asset_id)


@router.put("/{asset_id}", response_model=AssetRead)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = position.get_asset_or_404(db, asset_id)
    asset.name = payload.name.strip()
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = position.get_asset_or_404(db, asset_id)
    has_lots = db.execute(select(PurchaseLot.id).where(PurchaseLot.asset_id == asset_id).limit(1)).first()
    if has_lots:
        raise ConflictError("No se puede borrar un activo que tiene compras registradas. Borra antes sus compras.")
    db.delete(asset)
    db.commit()


@router.get("/{asset_id}/summary", response_model=AssetSummary)
def get_asset_summary(asset_id: int, db: Session = Depends(get_db)):
    return position.asset_summary(db, asset_id)
