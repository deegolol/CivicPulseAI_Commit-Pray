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
    assert s[0]["name"] in body["text"] and f"{s[0]['transit_min']} min" in body["text"] and "estimad" not in body["text"]


def test_parse_schema_is_strict_and_built_from_data():
    ds = get_dataset()
    schema = llm.parse_schema(ds.campuses, keys())
    assert schema["additionalProperties"] is False
    assert set(schema["properties"]["priorities"]["required"]) == set(keys())
    assert None in schema["properties"]["campus_id"]["enum"]


def test_distance_always_matters_for_students():
    ds = get_dataset()
    out = llm._finish({"priorities": {"distance_km": 0.1, "air_no2": 1}}, ds.campuses, keys(), "etsisi", "llm")
    assert out["weights"]["distance_km"] >= 0.6


def test_euro_sign_is_understood_in_keyword_mode():
    """Regression reported by codex@adrian: '500 €' was dropped by the ASCII normalization."""
    r = client.post("/api/ai/parse", json={"query": "Estudio en la ETSISI, tengo 500 € y quiero aire limpio"}).json()
    assert r["engine"] == "keywords" and r["budget_eur_month"] == 500 and r["filters"]["only_within_budget"] is True
    r = client.post("/api/ai/parse", json={"query": "busco un estudio por menos de 750€"}).json()
    assert r["budget_eur_month"] == 750 and r["housing_type"] == "studio"


PITCH_SENTENCES = [  # must match the example chips in the frontend
    "Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio",
    "Voy a la facultad de informática de Montegancedo, busco un estudio para mí solo por menos de 750€",
    "Quiero algo barato y bien comunicado en metro cerca del Campus Sur, máximo 6 km",
]


def test_all_pitch_sentences_hit_the_demo_cache(monkeypatch):
    monkeypatch.setenv("DEMO_CACHE", "true")
    for q in PITCH_SENTENCES:
        assert client.post("/api/ai/parse", json={"query": q}).json()["engine"] == "llm", q


def test_gibberish_and_off_topic_are_not_searched():
    for query in ("aaaaaaaaaaaa", "asdkjhqwkjehqwkjeh zxcvbnm", "!!!!????", "ffff gggg"):
        body = client.post("/api/ai/parse", json={"query": query}).json()
        assert body["understood"] is False and "No he entendido" in body["interpretation"], query
    body = client.post("/api/ai/parse", json={"query": "dame una receta de tortilla de patatas"}).json()
    assert body["understood"] is False and "dónde vivir" in body["interpretation"]
    ok = client.post("/api/ai/parse", json={"query": "busco habitación cerca de la UAM, a menos de 30 minutos en coche"}).json()
    assert ok["understood"] is True and ok["travel_mode"] == "car" and ok["filters"]["max_travel_min"] == 30


def test_named_university_and_degree_resolve_to_the_right_campus():
    ds = get_dataset()
    query = "Busco habitación por 500 € cerca de la Universidad Complutense de Madrid, donde estudio Derecho"
    result = client.post("/api/ai/parse", json={"query": query}).json()
    campus = next(c for c in ds.campuses if c.id == result["campus_id"])
    assert campus.acronym == "UCM" and campus.name.endswith("Facultad de Derecho")
    assert result["campus_candidates"] == [campus.id]
    assert result["budget_eur_month"] == 500
    scores = client.post("/api/score", json={
        "campus_id": campus.id, "filters": {"max_distance_km": 5}, "budget_eur_month": 500,
    }).json()["results"]
    assert any(not row["excluded"] and row["distance_km"] < 5 for row in scores)
    assert all(row["excluded"] for row in scores if row["distance_km"] > 5)


def test_ambiguous_computing_query_offers_matching_campuses():
    result = client.post("/api/ai/parse", json={"query": "Estudio infromatica en la UPM y tengo 500 € al mes"}).json()
    assert result["understood"] is True
    assert set(result["campus_candidates"]) == {"etsisi", "etsiinf"}
    assert result["budget_eur_month"] == 500


def test_bare_university_acronym_uses_the_catalogue():
    ds = get_dataset()
    result = client.post("/api/ai/parse", json={"query": "UPM"}).json()
    assert set(result["campus_candidates"]) == {c.id for c in ds.campuses if c.acronym == "UPM"}
    assert len(result["campus_candidates"]) > 4
