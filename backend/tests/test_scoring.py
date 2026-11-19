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


def test_budget_estimates_rent_by_housing_type():
    room = score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}, budget_eur_month=300, housing_type="room"))
    cheap = next(r for r in room if r.id == "cheap")
    assert cheap.est_rent_eur_month == 250  # 10 €/m² × 25 m²
    assert cheap.fits_budget is True
    assert cheap.affordable_m2 == 30.0
    pricey = next(r for r in room if r.id == "pricey")
    assert pricey.est_rent_eur_month == 500 and pricey.fits_budget is False
    studio = score_areas(AREAS, IND, CAMPUS, req(weights={"rent_eur_m2": 1}, housing_type="studio"))
    assert studio[0].est_rent_eur_month == 350 and studio[0].fits_budget is None


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
