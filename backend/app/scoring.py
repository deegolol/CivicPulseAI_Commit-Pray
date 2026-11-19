"""Scoring engine: ranks areas for a student given their campus, budget and priorities.

How a score is built (this is what we explain to the jury):
1. Every indicator is min-max normalized across ALL areas to 0..1, where 1 is always "best"
   (inverted when lower is better, e.g. rent or NO2). Missing values count as the city median.
2. `distance_km` is a virtual indicator: straight-line distance (haversine) from the area centroid to the campus.
3. The user's weights are renormalized to sum 1; score = Σ normalized × weight × 100 (0..100).
4. Budget: estimated monthly rent = official €/m² × reference m² of the housing type. It is an estimate
   from official data, not a listing price.
5. Filters never change other areas' scores: they only mark areas as `excluded` (score 0, ranked last).

Pure functions only: no I/O, no FastAPI, so it is easy to test.
"""
from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from statistics import median

from .listings import build_listing_links
from .models import Area, BreakdownItem, Campus, Indicator, ScoreRequest, ScoreResult

DISTANCE_KEY = "distance_km"
RENT_KEY = "rent_eur_m2"

# Reference surface per person used to estimate the monthly rent (documented assumption):
# a room in a shared flat ≈ 25 m² share of the flat, a studio ≈ 35 m², a whole flat ≈ 60 m².
REFERENCE_M2 = {"room": 25, "studio": 35, "flat": 60}

EARTH_RADIUS_KM = 6371.0


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance in km between two [lon, lat] points."""
    lon1, lat1, lon2, lat2 = map(radians, (a[0], a[1], b[0], b[1]))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(h))


def normalize(values: list[float | None], higher_is_better: bool) -> list[float]:
    """Min-max to 0..1 (1 = best). None → city median. All equal → 1.0 (the indicator doesn't discriminate)."""
    present = [v for v in values if v is not None]
    if not present:
        return [1.0 for _ in values]
    fill = median(present)
    filled = [fill if v is None else v for v in values]
    lo, hi = min(filled), max(filled)
    if hi == lo:
        return [1.0 for _ in filled]
    scaled = [(v - lo) / (hi - lo) for v in filled]
    return scaled if higher_is_better else [1.0 - s for s in scaled]


def normalize_weights(weights: dict[str, float]) -> dict[str, float]:
    """Clamp to 0..1 and make them sum 1. If all are 0, every given indicator weighs the same."""
    clamped = {k: min(max(float(w), 0.0), 1.0) for k, w in weights.items()}
    total = sum(clamped.values())
    if total == 0:
        return {k: 1 / len(clamped) for k in clamped} if clamped else {}
    return {k: w / total for k, w in clamped.items()}


def score_areas(areas: list[Area], indicators: list[Indicator], campus: Campus, req: ScoreRequest) -> list[ScoreResult]:
    """Rank `areas` for this request. `req.weights` keys must already be validated (indicator keys or distance_km)."""
    if not areas:
        return []
    distances = [haversine_km(a.centroid, campus.coords) for a in areas]
    direction = {i.key: i.higher_is_better for i in indicators} | {DISTANCE_KEY: False}
    weights = normalize_weights(req.weights)

    raw: dict[str, list[float | None]] = {
        key: (distances if key == DISTANCE_KEY else [a.values.get(key) for a in areas]) for key in weights
    }
    norm = {key: normalize(vals, direction[key]) for key, vals in raw.items()}
    ref_m2 = REFERENCE_M2[req.housing_type]

    results: list[ScoreResult] = []
    for idx, area in enumerate(areas):
        breakdown = {
            key: BreakdownItem(
                value=None if raw[key][idx] is None else round(raw[key][idx], 2),
                normalized=round(norm[key][idx], 3),
                weight=round(w, 3),
                contribution=round(norm[key][idx] * w * 100, 1),
            )
            for key, w in weights.items()
        }
        score = round(sum(norm[key][idx] * w for key, w in weights.items()) * 100, 1)

        rent = area.values.get(RENT_KEY)
        est_rent = round(rent * ref_m2) if rent is not None else None
        budget = req.budget_eur_month
        fits = (est_rent <= budget) if (budget is not None and est_rent is not None) else None
        affordable = round(budget / rent, 1) if (budget is not None and rent) else None

        f = req.filters
        excluded = (
            (f.max_rent_eur_m2 is not None and rent is not None and rent > f.max_rent_eur_m2)
            or (f.max_distance_km is not None and distances[idx] > f.max_distance_km)
            or (f.only_within_budget and fits is False)
        )
        results.append(
            ScoreResult(
                id=area.id,
                name=area.name,
                district=area.district,
                rank=0,
                score=0.0 if excluded else score,
                excluded=bool(excluded),
                distance_km=round(distances[idx], 2),
                est_rent_eur_month=est_rent,
                fits_budget=fits,
                affordable_m2=affordable,
                listing_links=build_listing_links(area.district, budget, req.housing_type),
                breakdown=breakdown,
            )
        )

    results.sort(key=lambda r: (r.excluded, -r.score, r.distance_km))
    for rank, r in enumerate(results, start=1):
        r.rank = rank
    return results[: req.limit]
