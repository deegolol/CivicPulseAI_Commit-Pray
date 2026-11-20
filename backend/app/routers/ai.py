"""POST /api/ai/parse and /api/ai/explain: natural-language search and grounded explanations (T11)."""
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request

from ..data import get_dataset
from ..net import client_ip
from ..llm import explain_areas, parse_query
from ..models import AiExplainRequest, AiExplainResponse, AiParseRequest, AiParseResponse, ScoreRequest
from ..scoring import score_areas
from .score import resolve

_hits: dict[str, deque] = defaultdict(deque)
_hits_lock = threading.Lock()


def rate_limit(request: Request) -> None:
    """Per-IP sliding window (default 30 requests/min) so nobody can burn the team's OpenAI credit."""
    limit = int(os.getenv("AI_RATE_PER_MIN", "30"))
    ip = client_ip(request)
    now = time.monotonic()
    with _hits_lock:
        q = _hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="Demasiadas búsquedas seguidas. Espera un minuto y vuelve a probar.")
        q.append(now)


def reset_rate_limit() -> None:  # used by tests
    with _hits_lock:
        _hits.clear()


router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(rate_limit)])


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
        budget_eur_month=req.budget_eur_month, housing_type=req.housing_type, travel_mode=req.travel_mode),
        ds.travel.get(campus.id), ds.rents | ds.barrio_rents)
    by_id = {r.id: r for r in scored}
    labels = {i.key: (i.label, i.unit) for i in ds.indicators} | {"distance_km": ("Tiempo al campus", "min")}
    items = []
    for area_id in req.area_ids:
        r = by_id.get(area_id)
        if r is None:
            continue
        best = sorted(r.breakdown.items(), key=lambda kv: kv[1].contribution, reverse=True)[:3]
        timed = r.travel_min is not None
        labels["distance_km"] = ("Tiempo al campus", "min") if timed else ("Distancia al campus en línea recta", "km")
        items.append({
            "name": r.name, "district": r.district,
            **({"min_transporte_publico": r.transit_min, "min_coche": r.car_min} if timed else
               {"distancia_en_linea_recta_km": r.distance_km}),
            # Whole-flat rent only for flat searches: next to a room price it would confuse the student.
            **({"alquiler_piso_al_mes": r.rent_median_eur_month} if req.housing_type == "flat" else {}),
            "fits_budget": r.fits_budget,
            "puntos_fuertes": [{"criterio": labels[k][0], "valor": b.value, "unidad": labels[k][1]} for k, b in best],
            "nota": ds.area(area_id).notes if ds.area(area_id) else {},
        })
    text, engine = explain_areas(items, req.housing_type, req.query)
    return AiExplainResponse(text=text, engine=engine)
