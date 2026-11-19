"""POST /api/score: validates the request against the loaded data and delegates to the scoring engine."""
from fastapi import APIRouter, HTTPException

from ..data import DEFAULT_WEIGHTS, Dataset, get_dataset
from ..models import Campus, ScoreRequest, ScoreResponse
from ..scoring import DISTANCE_KEY, REFERENCE_M2, score_areas

router = APIRouter(tags=["score"])


def resolve(ds: Dataset, campus_id: str, weights: dict[str, float]) -> tuple[Campus, dict[str, float]]:
    """Checks campus and weight keys against the data we have (422 otherwise); empty weights → defaults."""
    campus = next((c for c in ds.campuses if c.id == campus_id), None)
    if campus is None:
        raise HTTPException(status_code=422, detail=f"campus_id desconocido: '{campus_id}'")
    valid_keys = {i.key for i in ds.indicators} | {DISTANCE_KEY}
    unknown = sorted(set(weights) - valid_keys)
    if unknown:
        raise HTTPException(status_code=422, detail=f"Pesos con claves desconocidas: {unknown}. Válidas: {sorted(valid_keys)}")
    return campus, (weights or {k: v for k, v in DEFAULT_WEIGHTS.items() if k in valid_keys})


@router.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    ds = get_dataset()
    campus, req.weights = resolve(ds, req.campus_id, req.weights)
    results = score_areas(ds.areas, ds.indicators, campus, req)
    return ScoreResponse(
        campus_id=campus.id,
        housing_type=req.housing_type,
        reference_m2=REFERENCE_M2[req.housing_type],
        results=results,
    )
