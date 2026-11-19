"""AI layer tests (T11). Run fully offline: the LLM is disabled, so we test validation, fallback and cache."""
import pytest
from fastapi.testclient import TestClient

from app import llm
from app.data import get_dataset
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "none")
    monkeypatch.setenv("DEMO_CACHE", "false")


def keys():
    return [i.key for i in get_dataset().indicators] + ["distance_km"]


def test_keyword_fallback_extracts_campus_budget_type_and_km():
    ds = get_dataset()
    r = llm.keyword_parse("Voy a Montegancedo, busco un estudio por 750 euros a menos de 5 km con metro", ds.campuses, keys())
    assert r["campus_id"] == "etsiinf" and r["budget_eur_month"] == 750 and r["housing_type"] == "studio"
    assert r["max_distance_km"] == 5.0
    if "transit_stops" in r["priorities"]:
        assert r["priorities"]["transit_stops"] == 1.0


def test_estudio_as_a_verb_is_not_a_studio_flat():
    ds = get_dataset()
    assert llm.keyword_parse("Estudio en la ETSISI y tengo 400€", ds.campuses, keys())["housing_type"] == "room"


def test_finish_clamps_and_validates_llm_output():
    ds = get_dataset()
    raw = {"campus_id": "inventado", "budget_eur_month": 999999, "housing_type": "castillo",
           "max_distance_km": -3, "priorities": {"rent_eur_m2": 7}, "interpretation": "x" * 1000}
    out = llm._finish(raw, ds.campuses, keys(), ds.campuses[0].id, "llm")
    assert out["campus_id"] == ds.campuses[0].id
    assert out["budget_eur_month"] is None and out["housing_type"] == "room"
    assert out["filters"]["max_distance_km"] is None
    assert out["weights"]["rent_eur_m2"] == 1.0 and all(0 <= w <= 1 for w in out["weights"].values())
    assert len(out["interpretation"]) == 300


def test_parse_endpoint_without_llm_uses_keywords_and_can_feed_score():
    r = client.post("/api/ai/parse", json={"query": "ETSISI, 450 euros, barato y cerca"})
    assert r.status_code == 200
    p = r.json()
    assert p["engine"] == "keywords" and p["campus_id"] == "etsisi" and p["filters"]["only_within_budget"] is True
    s = client.post("/api/score", json={k: p[k] for k in ("campus_id", "weights", "filters", "budget_eur_month", "housing_type")})
    assert s.status_code == 200


def test_demo_cache_answers_pitch_sentences(monkeypatch):
    monkeypatch.setenv("DEMO_CACHE", "true")
    cache = llm._demo_cache()
    assert len(cache) >= 3
    q = "Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio"
    r = client.post("/api/ai/parse", json={"query": q}).json()
    assert r["engine"] == "llm" and r["campus_id"] == "etsisi" and r["budget_eur_month"] == 500


def test_explain_endpoint_template_uses_only_our_numbers():
    s = client.post("/api/score", json={"campus_id": "etsisi", "budget_eur_month": 450}).json()["results"][:3]
    r = client.post("/api/ai/explain", json={"campus_id": "etsisi", "area_ids": [x["id"] for x in s], "budget_eur_month": 450})
    assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "keywords"
    assert s[0]["name"] in body["text"] and "estimad" in body["text"]


def test_parse_schema_is_strict_and_built_from_data():
    ds = get_dataset()
    schema = llm.parse_schema(ds.campuses, keys())
    assert schema["additionalProperties"] is False
    assert set(schema["properties"]["priorities"]["required"]) == set(keys())
    assert None in schema["properties"]["campus_id"]["enum"]
