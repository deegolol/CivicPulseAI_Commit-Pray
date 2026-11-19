"""POST /api/ai/parse and /api/ai/explain: natural-language search and grounded explanations (T11)."""
from fastapi import APIRouter

from ..data import get_dataset
from ..llm import explain_areas, parse_query
from ..models import AiExplainRequest, AiExplainResponse, AiParseRequest, AiParseResponse, ScoreRequest
from ..scoring import score_areas
from .score import resolve

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse", response_model=AiParseResponse)
def parse(req: AiParseRequest) -> AiParseResponse:
    ds = get_dataset()
    default_campus = ds.campuses[0].id if ds.campuses else ""
    return AiParseResponse(**parse_query(req.query, ds.campuses, ds.indicators, default_campus))


@router.post("/explain", response_model=AiExplainResponse)
def explain(req: AiExplainRequest) -> AiExplainResponse:
    ds = get_dataset()
    campus, weights = resolve(ds, req.campus_id, req.weights)
    scored = score_areas(ds.areas, ds.indicators, campus, ScoreRequest(
        campus_id=campus.id, weights=weights, filters=req.filters,
        budget_eur_month=req.budget_eur_month, housing_type=req.housing_type))
    by_id = {r.id: r for r in scored}
    labels = {i.key: (i.label, i.unit) for i in ds.indicators} | {"distance_km": ("Distancia al campus", "km")}
    items = []
    for area_id in req.area_ids:
        r = by_id.get(area_id)
        if r is None:
            continue
        best = sorted(r.breakdown.items(), key=lambda kv: kv[1].contribution, reverse=True)[:3]
        items.append({
            "name": r.name, "district": r.district, "distance_km": r.distance_km,
            "est_rent_eur_month": r.est_rent_eur_month, "fits_budget": r.fits_budget,
            "puntos_fuertes": [{"criterio": labels[k][0], "valor": b.value, "unidad": labels[k][1]} for k, b in best],
            "nota": ds.area(area_id).notes if ds.area(area_id) else {},
        })
    text, engine = explain_areas(items, req.housing_type, req.query)
    return AiExplainResponse(text=text, engine=engine)
