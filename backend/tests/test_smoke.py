"""Smoke tests: every endpoint of CONTRACTS.md §4.1–4.5 answers with the agreed shape."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["data"] in {"processed", "mock"}


def test_meta_has_controls_for_the_ui():
    body = client.get("/api/meta").json()
    keys = {i["key"] for i in body["indicators"]}
    assert {"rent_eur_m2"} <= keys
    assert body["campuses"] and body["defaults"]["campus_id"] == body["campuses"][0]["id"]
    assert "distance_km" in body["defaults"]["weights"]
    assert set(body["defaults"]["weights"]) <= keys | {"distance_km"}


def test_areas_match_geojson_ids():
    areas = client.get("/api/areas").json()["areas"]
    geo = client.get("/api/geo").json()
    assert areas
    assert {a["id"] for a in areas} <= {f["properties"]["id"] for f in geo["features"]}
    assert all(len(a["centroid"]) == 2 for a in areas)


def test_area_detail_and_404():
    first = client.get("/api/areas").json()["areas"][0]
    r = client.get(f"/api/areas/{first['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == first["id"]
    assert set(body["city_median"]) == set(body["district_avg"])
    assert client.get("/api/areas/no-existe").status_code == 404


def test_unknown_api_route_is_404():
    assert client.get("/api/nada").status_code == 404
