"""Top recommendation and labelled alternatives (T27): "this is your best option, and this is why".

Deterministic and grounded: every reason is built from numbers we already have (the area's values,
how it compares with the other 130 areas, the user's budget and campus). Instant, and never invented.
Reasons are ordered by what the user cares about most (their weights).
"""
from __future__ import annotations

from .models import Area, Indicator, Recommendation, ScoreRequest, ScoreResult

HOUSING_ES = {"room": "una habitación", "studio": "un estudio", "flat": "un piso"}


def _fmt(n: float, decimals: int = 0) -> str:
    """Spanish number format: 1.234,5"""
    s = f"{n:,.{decimals}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def _share_better(value: float, others: list[float], higher_is_better: bool) -> int:
    """% of areas that this value beats (0..100)."""
    if not others:
        return 0
    beaten = sum(1 for o in others if (value > o if higher_is_better else value < o))
    return round(100 * beaten / len(others))


def _rank_among(value: float, others: list[float]) -> int:
    """1-based position when sorted ascending (1 = smallest)."""
    return 1 + sum(1 for o in others if o < value)


def build_recommendation(results: list[ScoreResult], areas: list[Area], indicators: list[Indicator],
                         req: ScoreRequest) -> Recommendation | None:
    candidates = [r for r in results if not r.excluded]
    if not candidates:
        return None
    best = candidates[0]
    area = next(a for a in areas if a.id == best.id)
    weights = {k: w for k, w in req.weights.items()}
    all_vals = {i.key: [a.values[i.key] for a in areas if a.values.get(i.key) is not None] for i in indicators}
    distances = [r.distance_km for r in results]
    reasons: list[tuple[float, str]] = []  # (priority, text)
    caveats: list[str] = []  # honest trade-offs on things the user said matter (weight ≥ 0.6)

    # Price (always first when the user gave a budget)
    if best.est_rent_eur_month is not None:
        housing = HOUSING_ES.get(req.housing_type, "una vivienda")
        if req.budget_eur_month and best.fits_budget:
            spare = round(req.budget_eur_month - best.est_rent_eur_month)
            text = f"~{_fmt(best.est_rent_eur_month)} €/mes por {housing}: te sobran ~{_fmt(spare)} € de tu presupuesto"
            reasons.append((10.0, text))
        else:
            rent = area.values.get("rent_eur_m2")
            pct = _share_better(rent, all_vals.get("rent_eur_m2", []), False) if rent is not None else 0
            text = f"~{_fmt(best.est_rent_eur_month)} €/mes por {housing}" + (f", más barato que el {pct} % de Madrid" if pct >= 50 else "")
            reasons.append((weights.get("rent_eur_m2", 0.3) + 1, text))

    # Distance to campus
    pos = _rank_among(best.distance_km, distances)
    text = f"A {_fmt(best.distance_km, 1)} km de tu campus" + (f", entre las {max(5, (pos + 4) // 5 * 5)} zonas más cercanas" if pos <= 20 else "")
    reasons.append((weights.get("distance_km", 0.6) + (0.25 if pos <= 10 else 0.1 if pos <= 20 else 0), text))

    # Air quality (NO2, lower is better)
    no2 = area.values.get("air_no2")
    if no2 is not None:
        pct = _share_better(no2, all_vals.get("air_no2", []), False)
        if pct >= 50:
            reasons.append((weights.get("air_no2", 0.2) + pct / 400, f"Aire más limpio que el {pct} % de los barrios (NO₂ {_fmt(no2, 1)} µg/m³)"))
        elif weights.get("air_no2", 0) >= 0.6:
            caveats.append(f"El aire es mejorable: NO₂ {_fmt(no2, 1)} µg/m³, peor que en el {100 - pct} % de los barrios")

    # Metro
    transit = area.values.get("transit_stops")
    if transit is not None and transit > 0:
        pct = _share_better(transit, all_vals.get("transit_stops", []), True)
        if pct >= 50:
            reasons.append((weights.get("transit_stops", 0.2) + pct / 400, f"Bien comunicada: más estaciones de metro por km² que el {pct} % de los barrios"))
        elif weights.get("transit_stops", 0) >= 0.6:
            caveats.append(f"Poco metro: menos estaciones por km² que el {100 - pct} % de los barrios")
    elif weights.get("transit_stops", 0) >= 0.6:
        caveats.append("No hay estaciones de metro dentro del barrio")

    # Services
    services = area.values.get("services_count")
    if services:
        pct = _share_better(services, all_vals.get("services_count", []), True)
        if pct >= 50:
            reasons.append((weights.get("services_count", 0.2) + pct / 400, f"{_fmt(services)} bibliotecas y polideportivos municipales en el barrio"))

    reasons.sort(key=lambda r: r[0], reverse=True)
    headline = f"{best.name} es la zona que mejor encaja con lo que buscas"
    if best.distance_km > 8 and weights.get("distance_km", 0) >= 0.6:
        caveats.append(f"Está a {_fmt(best.distance_km, 1)} km de tu campus: cuenta con el transporte")
    if area.notes.get("rent_eur_m2"):
        caveats.append("El precio es una estimación con la mediana oficial de su distrito")
    return Recommendation(area_id=best.id, name=best.name, district=best.district,
                          headline=headline, reasons=[t for _, t in reasons[:4]], caveats=caveats[:2])


def build_highlights(results: list[ScoreResult], areas: list[Area]) -> dict[str, str]:
    """Labelled alternatives among the non-excluded areas: cheapest, closest, cleanest air, best metro."""
    ok = [r for r in results if not r.excluded]
    if not ok:
        return {}
    values = {a.id: a.values for a in areas}
    out: dict[str, str] = {}
    priced = [r for r in ok if r.est_rent_eur_month is not None]
    if priced:
        out["cheapest"] = min(priced, key=lambda r: (r.est_rent_eur_month, -r.score)).id
    out["closest"] = min(ok, key=lambda r: r.distance_km).id
    air = [r for r in ok if values[r.id].get("air_no2") is not None]
    if air:
        out["cleanest_air"] = min(air, key=lambda r: (values[r.id]["air_no2"], -r.score)).id
    metro = [r for r in ok if values[r.id].get("transit_stops")]
    if metro:
        out["best_transit"] = max(metro, key=lambda r: (values[r.id]["transit_stops"], r.score)).id
    return out
