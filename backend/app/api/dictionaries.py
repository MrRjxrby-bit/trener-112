import json
from pathlib import Path
from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user

router = APIRouter()
DATA = Path(__file__).parent.parent / "data"


def _load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


@router.get("/types")
def types(_=Depends(get_current_user)):
    return _load("incident_types.json")["incident_types"]


@router.get("/services")
def services(_=Depends(get_current_user)):
    return _load("services.json")["services"]


@router.get("/signs")
def signs(_=Depends(get_current_user)):
    return _load("feature_signs.json")["signs"]


@router.get("/okrugs")
def okrugs(_=Depends(get_current_user)):
    return _load("regions.json")["okrugs"]