"""POST /api/score: validates the request against the loaded data and delegates to the scoring engine."""
from fastapi import APIRouter, HTTPException

from ..data import DEFAULT_WEIGHTS, get_dataset
from ..models import ScoreRequest, ScoreResponse
from ..scoring import DISTANCE_KEY, REFERENCE_M2, score_areas

router = APIRouter(tags=["score"])


@router.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    ds = get_dataset()
    campus = next((c for c in ds.campuses if c.id == req.campus_id), None)
    if campus is None:
        raise HTTPException(status_code=422, detail=f"campus_id desconocido: '{req.campus_id}'")

    valid_keys = {i.key for i in ds.indicators} | {DISTANCE_KEY}
    unknown = sorted(set(req.weights) - valid_keys)
    if unknown:
        raise HTTPException(status_code=422, detail=f"Pesos con claves desconocidas: {unknown}. Válidas: {sorted(valid_keys)}")
    if not req.weights:
        req.weights = {k: v for k, v in DEFAULT_WEIGHTS.items() if k in valid_keys}

    results = score_areas(ds.areas, ds.indicators, campus, req)
    return ScoreResponse(
        campus_id=campus.id,
        housing_type=req.housing_type,
        reference_m2=REFERENCE_M2[req.housing_type],
        results=results,
    )
