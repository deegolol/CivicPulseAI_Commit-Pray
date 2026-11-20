"""Scoring engine: ranks areas for a student given their campus, budget and priorities.

How a score is built (this is what we explain to the jury):
1. Every indicator is turned into a percentile across ALL areas (0..1, where 1 is always "best"
   (inverted when lower is better, e.g. rent or NO2). Missing values count as the city median.
2. `distance_km` ("Cercanía") is a virtual indicator: real door-to-door minutes to the campus by public
   transport (CRTM timetables) or by car (OSRM), whichever the user chose (`travel_mode`). Straight-line
   distance is only a fallback when the travel-time file hasn't been built.
3. The user's weights are renormalized to sum 1; score = Σ normalized × weight × 100 (0..100).
4. Price: we never invent one. For a whole flat we show the official monthly rent of the district exactly as
   SERPAVI publishes it (median and 25th–75th percentiles of 2024 contracts). There is no official figure
   for rooms or studios, so those get no number: the exact price lives in the live listings we link to.
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
    """Percentile rank to 0..1 (1 = best): "better than X % of Madrid's neighbourhoods".

    We use ranks instead of min-max because a few extreme areas (e.g. the city centre has 10x more Metro
    stations per km² than a typical neighbourhood) squashed everybody else near 0 with min-max.
    None → city median. Ties share the same value. All equal → 1.0 (the indicator doesn't discriminate).
    """
    present = [v for v in values if v is not None]
    if not present:
        return [1.0 for _ in values]
    fill = median(present)
    filled = [fill if v is None else v for v in values]
    if max(filled) == min(filled):
        return [1.0 for _ in filled]
    order = sorted(filled)
    n = len(order)
    first: dict[float, int] = {}
    last: dict[float, int] = {}
    for i, v in enumerate(order):
        first.setdefault(v, i)
        last[v] = i
    ranks = [((first[v] + last[v]) / 2) / (n - 1) for v in filled]  # 0 = lowest value, 1 = highest
    return ranks if higher_is_better else [1.0 - r for r in ranks]


def normalize_weights(weights: dict[str, float]) -> dict[str, float]:
    """Clamp to 0..1 and make them sum 1. If all are 0, every given indicator weighs the same."""
    clamped = {k: min(max(float(w), 0.0), 1.0) for k, w in weights.items()}
    total = sum(clamped.values())
    if total == 0:
        return {k: 1 / len(clamped) for k in clamped} if clamped else {}
    return {k: w / total for k, w in clamped.items()}


def district_id(area: Area) -> str:
    """Area ids are '<district 2 digits><barrio 1 digit>' (e.g. 011 = Palacio, district 01 Centro)."""
    return area.id[:2]


def official_figures(area: Area, rents: dict) -> tuple[dict, str]:
    """Barrio figures when we have them (SERPAVI sections), else the district's. Returns (figures, where)."""
    own = rents.get(area.id)
    if own and own.get("median"):
        return own, area.name
    return rents.get(district_id(area)) or {}, area.district


def official_rent(area: Area, rents: dict, housing_type: str) -> tuple[int | None, str]:
    """(monthly € you'd pay, how we know it). Only a published official figure, never a calculation of ours.
    `rents` maps area ids (barrio level) and/or district ids ("01".."21") to SERPAVI figures."""
    official, where = official_figures(area, rents)
    if housing_type == "flat" and official.get("median"):
        return official["median"], f"Alquiler mensual mediano de pisos en {where} (contratos 2024, SERPAVI · Ministerio de Vivienda)"
    return None, "No hay dato oficial de precio para habitaciones ni estudios: mira el precio exacto en los anuncios"


def score_areas(areas: list[Area], indicators: list[Indicator], campus: Campus, req: ScoreRequest,
                travel: dict | None = None, rents: dict | None = None) -> list[ScoreResult]:
    """Rank `areas` for this request. `req.weights` keys must already be validated (indicator keys or distance_km).
    `travel` = travel times for THIS campus {area_id: {transit_min, car_min, car_km}}; `rents` = official rents by district."""
    if not areas:
        return []
    travel = travel or {}
    rents = rents or {}
    times = [travel.get(a.id) or {} for a in areas]
    have_times = bool(travel) and all(t.get("transit_min") is not None and t.get("car_min") is not None for t in times)
    mode_key = "transit_min" if req.travel_mode == "transit" else "car_min"
    straight = [haversine_km(a.centroid, campus.coords) for a in areas]
    distances = [t.get("car_km") or d for t, d in zip(times, straight)]  # by road when known
    proximity = [float(t[mode_key]) for t in times] if have_times else straight
    direction = {i.key: i.higher_is_better for i in indicators} | {DISTANCE_KEY: False}
    weights = normalize_weights(req.weights)

    raw: dict[str, list[float | None]] = {
        key: (proximity if key == DISTANCE_KEY else [a.values.get(key) for a in areas]) for key in weights
    }
    norm = {key: normalize(vals, direction[key]) for key, vals in raw.items()}

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
        est_rent, rent_basis = official_rent(area, rents, req.housing_type)
        official = official_figures(area, rents)[0]
        travel_min = times[idx].get(mode_key)
        budget = req.budget_eur_month
        fits = (est_rent <= budget) if (budget is not None and est_rent is not None) else None
        affordable = round(budget / rent, 1) if (budget is not None and rent) else None

        f = req.filters
        no2 = area.values.get("air_no2")
        transit = area.values.get("transit_stops")
        excluded = (
            (f.max_rent_eur_m2 is not None and rent is not None and rent > f.max_rent_eur_m2)
            or (f.max_distance_km is not None and distances[idx] > f.max_distance_km)
            or (f.max_travel_min is not None and travel_min is not None and travel_min > f.max_travel_min)
            or (f.only_within_budget and fits is False)
            # A minimum only makes sense where an official price exists (flats); never empty a room search.
            or (f.min_budget_eur_month is not None and est_rent is not None and est_rent < f.min_budget_eur_month)
            or (f.max_air_no2 is not None and (no2 is None or no2 > f.max_air_no2))
            or (f.min_transit_stops is not None and (transit is None or transit < f.min_transit_stops))
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
                transit_min=times[idx].get("transit_min"),
                car_min=times[idx].get("car_min"),
                travel_min=travel_min,
                est_rent_eur_month=est_rent,
                rent_median_eur_month=official.get("median"),
                rent_p25_eur_month=official.get("p25"),
                rent_p75_eur_month=official.get("p75"),
                rent_basis=rent_basis,
                fits_budget=fits,
                affordable_m2=affordable,
                listing_links=build_listing_links(area.district, budget, req.housing_type),
                breakdown=breakdown,
            )
        )

    results.sort(key=lambda r: (r.excluded, -r.score, r.travel_min if r.travel_min is not None else r.distance_km))
    for rank, r in enumerate(results, start=1):
        r.rank = rank
    return results[: req.limit]
