"""Top recommendation and labelled alternatives (T27): "this is your best option, and this is why".

Deterministic and grounded: every reason is built from numbers we already have (the area's values,
how it compares with the other 130 areas, the user's budget and campus). Instant, and never invented.
Reasons are ordered by what the user cares about most (their weights).
"""
from __future__ import annotations

from .data import service_counts
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


def _service_reason(area: Area, total: float) -> str:
    """Show the official breakdown if the dataset includes the two counts."""
    counts = service_counts(area)
    if counts:
        libraries, sports = counts
        facilities = []
        if sports:
            label = "equipamiento deportivo municipal" if sports == 1 else "equipamientos deportivos municipales"
            facilities.append(f"{sports} {label}")
        if libraries:
            facilities.append("1 biblioteca" if libraries == 1 else f"{libraries} bibliotecas")
        return f"{' y '.join(facilities)} en el barrio"
    return f"{_fmt(total)} equipamientos del catálogo de bibliotecas y deporte en el barrio"


def build_recommendation(results: list[ScoreResult], areas: list[Area], indicators: list[Indicator],
                         req: ScoreRequest) -> Recommendation | None:
    candidates = [r for r in results if not r.excluded]
    if not candidates:
        return None
    best = candidates[0]
    area = next(a for a in areas if a.id == best.id)
    # Same scale as the scoring engine (0..1 and summing 1 would break the thresholds below): clamp only.
    weights = {k: min(max(float(w), 0.0), 1.0) for k, w in req.weights.items()}
    if weights and not any(weights.values()):
        weights = {k: 1.0 for k in weights}
    all_vals = {i.key: [a.values[i.key] for a in areas if a.values.get(i.key) is not None] for i in indicators}
    timed = best.travel_min is not None
    distances = [(r.travel_min if timed and r.travel_min is not None else r.distance_km) for r in results]
    mode_es = "en transporte público" if req.travel_mode == "transit" else "en coche"
    reasons: list[tuple[float, str]] = []  # (priority, text)
    caveats: list[str] = []  # trade-offs for criteria with high priority

    # Price: only official figures, said exactly as published (never our own estimate)
    if weights.get("rent_eur_m2", 0) > 0:
        rent = area.values.get("rent_eur_m2")
        pct = _share_better(rent, all_vals.get("rent_eur_m2", []), False) if rent is not None else 0
        if best.rent_median_eur_month is not None and req.housing_type == "flat":
            text = f"Pisos en {best.district}: alquiler mediano oficial de {_fmt(best.rent_median_eur_month)} €/mes (contratos 2024)"
            if req.budget_eur_month and best.fits_budget:
                text += ", dentro de tu presupuesto"
            reasons.append((10.0 if best.fits_budget else weights.get("rent_eur_m2", 0.3) + 1, text))
        elif pct >= 50:
            reasons.append((weights.get("rent_eur_m2", 0.3) + 1,
                            ("Uno de los barrios con el alquiler más barato de Madrid" if pct >= 75 else "Alquiler más barato que en la mitad de Madrid")
                            + " (precio oficial por m², contratos 2024)"))

    # Distance to campus
    pos = _rank_among(distances[results.index(best)], distances)
    if timed:
        other = f"{_fmt(best.car_min)} min en coche" if req.travel_mode == "transit" else f"{_fmt(best.transit_min)} min en transporte público"
        text = f"A {_fmt(best.travel_min)} min de tu campus {mode_es} ({other})"
    else:
        text = f"A {_fmt(best.distance_km, 1)} km de tu campus"
    text += f", entre las {max(5, (pos + 4) // 5 * 5)} zonas más cercanas" if pos <= 20 else ""
    if weights.get("distance_km", 0) > 0:
        reasons.append((weights["distance_km"] + (0.25 if pos <= 10 else 0.1 if pos <= 20 else 0), text))

    # Air quality (NO2, lower is better)
    no2 = area.values.get("air_no2")
    if no2 is not None and weights.get("air_no2", 0) > 0:
        pct = _share_better(no2, all_vals.get("air_no2", []), False)
        if pct >= 50:
            reasons.append((weights.get("air_no2", 0.2) + pct / 400, "Buena calidad del aire en comparación con otros barrios"))
        elif weights.get("air_no2", 0) >= 0.6:
            caveats.append("Hay barrios de Madrid con mejor calidad del aire")

    # Metro
    transit = area.values.get("transit_stops")
    if transit is not None and transit > 0 and weights.get("transit_stops", 0) > 0:
        pct = _share_better(transit, all_vals.get("transit_stops", []), True)
        if pct >= 50:
            reasons.append((weights.get("transit_stops", 0.2) + pct / 400, "Buena cobertura de metro dentro del barrio"))
        elif weights.get("transit_stops", 0) >= 0.6:
            caveats.append("La cobertura de metro es limitada frente a otros barrios")
    elif weights.get("transit_stops", 0) >= 0.6:
        caveats.append("No hay estaciones de metro dentro del barrio")

    # Services
    services = area.values.get("services_count")
    services_weight = weights.get("services_count", 0)
    if services and services_weight > 0:
        pct = _share_better(services, all_vals.get("services_count", []), True)
        if pct >= 50 or services_weight >= 0.6:
            reasons.append((weights.get("services_count", 0.2) + pct / 400, _service_reason(area, services)))
    sports_weight = weights.get("sports_count", 0)
    combined_said = any(text == _service_reason(area, services) for _, text in reasons) if services else False
    for key, singular, plural in (
        ("sports_count", "equipamiento deportivo municipal", "equipamientos deportivos municipales"),
        ("libraries_count", "biblioteca", "bibliotecas"),
    ):
        count = area.values.get(key)
        weight = weights.get(key, 0)
        if count and weight > 0 and not combined_said:
            reasons.append((weight, f"{_fmt(count)} {singular if count == 1 else plural} en el barrio"))
    if max(services_weight, sports_weight) >= 0.6:
        caveats.insert(0, "Si buscas un gimnasio, comprueba la oferta en la zona. El dato deportivo cubre equipamientos municipales.")

    reasons.sort(key=lambda r: r[0], reverse=True)
    headline = f"{best.name} es la zona que mejor encaja con lo que buscas"
    if timed and best.travel_min is not None and best.travel_min > 45 and weights.get("distance_km", 0) >= 0.6:
        caveats.append(f"Son {_fmt(best.travel_min)} min hasta tu campus {mode_es}")
    if weights.get("rent_eur_m2", 0) > 0:
        caveats.append("El precio exacto de cada piso está en los anuncios: el dato oficial es de contratos firmados en 2024")
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
    out["closest"] = min(ok, key=lambda r: (r.travel_min if r.travel_min is not None else r.distance_km, -r.score)).id
    air = [r for r in ok if values[r.id].get("air_no2") is not None]
    if air:
        out["cleanest_air"] = min(air, key=lambda r: (values[r.id]["air_no2"], -r.score)).id
    metro = [r for r in ok if values[r.id].get("transit_stops")]
    if metro:
        out["best_transit"] = max(metro, key=lambda r: (values[r.id]["transit_stops"], r.score)).id
    return out
