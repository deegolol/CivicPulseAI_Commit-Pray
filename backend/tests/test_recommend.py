"""T27: top recommendation with grounded reasons, honest caveats and labelled alternatives."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def score(**body):
    return client.post("/api/score", json={"campus_id": "etsisi", **body}).json()


def test_recommendation_is_the_first_non_excluded_result_with_reasons():
    r = score(budget_eur_month=500, housing_type="room")
    rec, first = r["recommendation"], next(x for x in r["results"] if not x["excluded"])
    assert rec["area_id"] == first["id"] and rec["name"] == first["name"]
    assert 2 <= len(rec["reasons"]) <= 4 and len(rec["caveats"]) <= 2
    assert "te sobran" in rec["reasons"][0] and "€/mes" in rec["reasons"][0]  # budget reason goes first
    assert any("km de tu campus" in x for x in rec["reasons"])


def test_reasons_quote_the_real_numbers():
    r = score(budget_eur_month=500)
    rec = r["recommendation"]
    first = next(x for x in r["results"] if x["id"] == rec["area_id"])
    assert f"{first['est_rent_eur_month']} €/mes" in rec["reasons"][0].replace(".", "")
    dist = f"{first['distance_km']:.1f}".replace(".", ",")
    assert any(dist in x for x in rec["reasons"])


def test_sports_reason_uses_official_count_and_plain_language():
    result = score(
        campus_id="etsiinf", budget_eur_month=500,
        weights={"distance_km": 1, "services_count": 1, "rent_eur_m2": 0.6, "air_no2": 0.2},
    )
    rec = result["recommendation"]
    detail = client.get(f"/api/areas/{rec['area_id']}").json()
    sports = int(detail["notes"]["services_count"].split("Equipamientos deportivos: ")[1].rstrip("."))
    assert any(f"{sports} equipamiento" in reason for reason in rec["reasons"])
    assert any("gimnasio" in caveat and "municipales" in caveat for caveat in rec["caveats"])
    if result["results"][0]["breakdown"]["air_no2"]["normalized"] >= 0.5:  # only claim good air when it is
        assert any("calidad del aire" in reason for reason in rec["reasons"])
    assert not any(symbol in text for text in rec["reasons"] + rec["caveats"] for symbol in ("%", "NO₂", "µg/m³"))
    assert result["results"][0]["breakdown"]["air_no2"]["value"] == detail["values"]["air_no2"]


def test_honest_caveat_when_a_priority_is_weak():
    r = score(budget_eur_month=500, weights={"air_no2": 1, "rent_eur_m2": 0.8, "distance_km": 0.6})
    rec = r["recommendation"]
    first = next(x for x in r["results"] if x["id"] == rec["area_id"])
    air = first["breakdown"]["air_no2"]["normalized"]
    if air < 0.5:  # only when the winner's air is weak should we warn
        assert any("aire" in c.lower() for c in rec["caveats"])


def test_no_recommendation_when_everything_is_excluded():
    r = score(budget_eur_month=100, filters={"only_within_budget": True})
    assert r["recommendation"] is None and r["highlights"] == {}


def test_highlights_point_to_valid_non_excluded_areas():
    r = score(budget_eur_month=600, filters={"max_distance_km": 8})
    ok = {x["id"]: x for x in r["results"] if not x["excluded"]}
    assert set(r["highlights"]) <= {"cheapest", "closest", "cleanest_air", "best_transit"}
    assert all(v in ok for v in r["highlights"].values())
    assert ok[r["highlights"]["closest"]]["distance_km"] == min(x["distance_km"] for x in ok.values())
