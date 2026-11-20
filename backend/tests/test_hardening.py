"""T26: cost/abuse guards and speed-ups for the public demo. All offline (the LLM call is faked)."""
import pytest
from fastapi.testclient import TestClient

from app import llm
from app.main import app
from app.routers import ai as ai_router

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    llm.reset_guards()
    ai_router.reset_rate_limit()
    monkeypatch.setenv("DEMO_CACHE", "false")
    yield
    llm.reset_guards()
    ai_router.reset_rate_limit()


def fake_llm(monkeypatch, answer='{"campus_id":"etsisi","budget_eur_month":400,"housing_type":"room","max_distance_km":null,"priorities":{},"interpretation":"ok"}'):
    calls = []
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "test-key")

    def _fake(instructions, user_input, schema=None, **kw):
        if not llm._take_llm_budget():
            raise RuntimeError("budget")
        calls.append(user_input)
        return answer if schema else "1) Zona: texto de prueba."
    monkeypatch.setattr(llm, "_call_openai", _fake)
    return calls


def test_rate_limit_per_ip_returns_429(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "none")
    monkeypatch.setenv("AI_RATE_PER_MIN", "3")
    codes = [client.post("/api/ai/parse", json={"query": "ETSISI 400 euros"}).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    other_ip = client.post("/api/ai/parse", json={"query": "ETSISI"}, headers={"x-forwarded-for": "10.0.0.9"})
    assert other_ip.status_code == 200


def test_identical_parse_and_explain_hit_the_cache(monkeypatch):
    monkeypatch.setenv("LLM_CACHE", "true")  # the cache is off by default
    calls = fake_llm(monkeypatch)
    for _ in range(3):
        assert client.post("/api/ai/parse", json={"query": "algo en la ETSISI por 400"}).json()["engine"] == "llm"
    ids = [r["id"] for r in client.post("/api/score", json={"campus_id": "etsisi"}).json()["results"][:3]]
    for _ in range(3):
        assert client.post("/api/ai/explain", json={"campus_id": "etsisi", "area_ids": ids}).json()["engine"] == "llm"
    assert len(calls) == 2  # one parse + one explain, the rest served from cache


def test_daily_llm_cap_falls_back_without_calling(monkeypatch):
    calls = fake_llm(monkeypatch)
    monkeypatch.setenv("LLM_DAILY_LIMIT", "1")
    assert client.post("/api/ai/parse", json={"query": "primera ETSISI 400"}).json()["engine"] == "llm"
    assert client.post("/api/ai/parse", json={"query": "segunda distinta ETSISI 450"}).json()["engine"] == "keywords"
    assert len(calls) == 1


def test_health_reports_llm_and_usage(monkeypatch):
    fake_llm(monkeypatch)
    client.post("/api/ai/parse", json={"query": "ETSISI 400"})
    h = client.get("/api/health").json()
    assert h["llm"] is True and h["llm_calls_today"] == 1


def test_geo_is_gzipped_and_cacheable():
    r = client.get("/api/geo", headers={"Accept-Encoding": "gzip"})
    assert r.headers.get("content-encoding") == "gzip"
    assert "max-age" in r.headers.get("cache-control", "")


def test_rate_limit_cannot_be_dodged_by_spoofing_x_forwarded_for(monkeypatch):
    """The leftmost XFF value is client-controlled; we key on the rightmost (added by Railway's proxy)."""
    monkeypatch.setenv("LLM_PROVIDER", "none")
    monkeypatch.setenv("AI_RATE_PER_MIN", "2")
    codes = [client.post("/api/ai/parse", json={"query": "ETSISI"}, headers={"x-forwarded-for": f"6.6.6.{i}, 1.2.3.4"}).status_code
             for i in range(3)]
    assert codes == [200, 200, 429]


def test_cache_is_off_by_default_so_every_search_asks_the_ai(monkeypatch):
    monkeypatch.delenv("LLM_CACHE", raising=False)
    calls = fake_llm(monkeypatch)
    for _ in range(2):
        client.post("/api/ai/parse", json={"query": "algo en la ETSISI por 400"})
    assert len(calls) == 2
