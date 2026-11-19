"""Scoring engine tests: normalization, weights, nulls, budget, filters and ranking (CONTRACTS §4.6)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Area, Campus, Indicator, ScoreFilters, ScoreRequest
from app.scoring import haversine_km, normalize, normalize_weights, score_areas

client = TestClient(app)

IND = [
    Indicator(key="rent_eur_m2", label="Alquiler", unit="€/m²", higher_is_better=False, source="t"),
    Indicator(key="transit_stops", label="Transporte", unit="n", higher_is_better=True, source="t"),
]
CAMPUS = Campus(id="c", name="Campus", coords=(-3.70, 40.40))
AREAS = [
    Area(id="cheap", name="Barata", district="D1", centroid=(-3.70, 40.41), values={"rent_eur_m2": 10.0, "transit_stops": 10.0}),
    Area(id="mid", name="Media", district="D1", centroid=(-3.70, 40.45), values={"rent_eur_m2": 15.0, "transit_stops": None}),
    Area(id="pricey", name="Cara", district="D2", centroid=(-3.70, 40.50), values={"rent_eur_m2": 20.0, "transit_stops": 30.0}),
]


def req(**kw) -> ScoreRequest:
    return ScoreRequest(campus_id="c", **kw)


def test_haversine_one_degree_latitude_is_about_111_km():
    assert haversine_km((-3.7, 40.0), (-3.7, 41.0)) == pytest.approx(111.2, abs=0.2)


def test_normalize_inverts_when_lower_is_better_and_fills_nulls_with_median():
    assert normalize([10, 15, 20], higher_is_better=False) == [1.0, 0.5, 0.0]
    assert normalize([10, None, 30], higher_is_better=True) == [0.0, 0.5, 1.0]
    assert normalize([5, 5], higher_is_better=True) == [1.0, 1.0]


def test_percentile_is_robust_to_outliers():
    """A typical value must not be crushed by one extreme (the old Metro problem)."""
    values = [0.0, 0.5, 0.8, 1.0, 1.7, 8.2]
    norm = normalize(values, higher_is_better=True)
    assert norm[2] == 0.4 and norm[-1] == 1.0  # 0.8 st/km² is mid-table, not ~0.1 as with min-max
    assert normalize([1, 1, 3], higher_is_better=True) == [0.25, 0.25, 1.0]  # ties share the average rank


def test_weights_are_clamped_and_renormalized():
    assert normalize_weights({"a": 2, "b": 1}) == {"a": 0.5, "b": 0.5}
    assert normalize_weights({"a": 0.3, "b": 0.1}) == pytest.approx({"a": 0.75, "b": 0.25})
    assert normalize_weights({"a": 0, "b": 0}) == {"a": 0.5, "b": 0.5}


def test_rent_only_ranks_cheapest_first_with_full_breakdown():
    res = score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}))
    assert [r.id for r in res] == ["cheap", "mid", "pricey"]
    assert [r.rank for r in res] == [1, 2, 3]
    top = res[0]
    assert top.score == 100.0
    assert top.breakdown["rent_eur_m2"].value == 10.0
    assert top.breakdown["rent_eur_m2"].contribution == 100.0


def test_distance_is_a_virtual_indicator():
    res = score_areas(AREAS, IND, CAMPUS, req(weights={"distance_km": 1}))
    assert res[0].id == "cheap" and res[0].distance_km < res[-1].distance_km


RENTS = {"ch": {"median": 900, "p25": 700, "p75": 1100}, "mi": {"median": 1200, "p25": 900, "p75": 1500}}
TRAVEL = {"cheap": {"transit_min": 40, "car_min": 10, "car_km": 2.0},
          "mid": {"transit_min": 20, "car_min": 15, "car_km": 6.0},
          "pricey": {"transit_min": 60, "car_min": 25, "car_km": 12.0}}


def test_price_is_only_the_official_figure_never_our_estimate():
    flat = {r.id: r for r in score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}, budget_eur_month=1000, housing_type="flat"), rents=RENTS)}
    assert flat["cheap"].est_rent_eur_month == 900 and flat["cheap"].fits_budget is True  # SERPAVI median as published
    assert flat["mid"].est_rent_eur_month == 1200 and flat["mid"].fits_budget is False
    assert flat["cheap"].rent_p25_eur_month == 700 and flat["cheap"].rent_p75_eur_month == 1100
    assert flat["pricey"].est_rent_eur_month is None  # no official data → no number
    room = score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}, budget_eur_month=300, housing_type="room"), rents=RENTS)
    assert all(r.est_rent_eur_month is None and r.fits_budget is None for r in room)  # no official room price exists
    assert room[0].rent_median_eur_month == 900 and "anuncios" in room[0].rent_basis


def test_proximity_uses_real_travel_minutes_of_the_chosen_mode():
    transit = score_areas(AREAS, IND, CAMPUS, req(weights={"distance_km": 1}), travel=TRAVEL)
    assert transit[0].id == "mid" and transit[0].travel_min == 20 and transit[0].car_min == 15
    assert transit[0].distance_km == 6.0  # by road, not straight line
    car = score_areas(AREAS, IND, CAMPUS, req(weights={"distance_km": 1}, travel_mode="car"), travel=TRAVEL)
    assert car[0].id == "cheap" and car[0].travel_min == 10
    limited = {r.id: r for r in score_areas(AREAS, IND, CAMPUS, req(weights={"distance_km": 1}, filters=ScoreFilters(max_travel_min=30)), travel=TRAVEL)}
    assert limited["cheap"].excluded and not limited["mid"].excluded


def test_filters_exclude_without_changing_other_scores():
    base = {r.id: r.score for r in score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}))}
    res = score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}, budget_eur_month=400,
                                               filters=ScoreFilters(only_within_budget=True, max_distance_km=8)))
    by_id = {r.id: r for r in res}
    assert by_id["pricey"].excluded and by_id["pricey"].score == 0
    assert not by_id["mid"].excluded and by_id["mid"].score == base["mid"]  # ~5.6 km and 375 € ≤ 400 €
    assert not by_id["cheap"].excluded and by_id["cheap"].score == base["cheap"]
    assert res[-1].excluded and res[0].id == "cheap"
    closer = {r.id: r for r in score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}, filters=ScoreFilters(max_distance_km=5)))}
    assert closer["mid"].excluded and not closer["cheap"].excluded


def test_api_score_happy_path_on_loaded_data():
    meta = client.get("/api/meta").json()
    body = {"campus_id": meta["defaults"]["campus_id"], "weights": meta["defaults"]["weights"], "budget_eur_month": 450}
    r = client.post("/api/score", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["reference_m2"] == 25
    scores = [x["score"] for x in data["results"] if not x["excluded"]]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= x["score"] <= 100 for x in data["results"])


def test_api_score_rejects_unknown_campus_and_weight_keys():
    assert client.post("/api/score", json={"campus_id": "nope"}).status_code == 422
    meta = client.get("/api/meta").json()
    r = client.post("/api/score", json={"campus_id": meta["defaults"]["campus_id"], "weights": {"bares": 1}})
    assert r.status_code == 422 and "bares" in r.json()["detail"]


def test_optional_services_only_score_when_selected_and_budget_range_filters():
    meta = client.get("/api/meta").json()
    campus_id = meta["defaults"]["campus_id"]
    areas = {area["id"]: area for area in client.get("/api/areas").json()["areas"]}
    assert all(
        area["values"]["libraries_count"] + area["values"]["sports_count"] == area["values"]["services_count"]
        for area in areas.values()
    )
    winners = []
    for key in ("libraries_count", "sports_count"):
        response = client.post("/api/score", json={
            "campus_id": campus_id,
            "weights": {key: 1},
            "budget_eur_month": 450,
            "filters": {"only_within_budget": True},
        })
        assert response.status_code == 200
        results = response.json()["results"]
        assert all(set(area["breakdown"]) == {key} for area in results)
        included = [area for area in results if not area["excluded"]]
        assert included  # rooms have no official price: budget filters can't exclude them
        assert included[0]["breakdown"][key]["value"] == max(area["breakdown"][key]["value"] for area in included)
        winners.append(included[0]["id"])
    assert winners[0] != winners[1]
