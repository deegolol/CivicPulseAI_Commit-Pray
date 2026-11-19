"""Account flows and privacy boundaries for saved listings and notifications."""

from datetime import date
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.main import app

PREFIX = "/api/account"
CREDS = {"username": "estudiante", "password": "una-clave-de-prueba"}
JSON = {"Content-Type": "application/json"}


@pytest.fixture
def accounts_db(monkeypatch, tmp_path):
    path = tmp_path / "accounts.sqlite3"
    monkeypatch.setenv("ACCOUNTS_ENABLED", "true")
    monkeypatch.setenv("ACCOUNTS_DB", str(path))
    return path


def test_disabled_accounts_keep_public_service(monkeypatch):
    monkeypatch.delenv("ACCOUNTS_ENABLED", raising=False)
    monkeypatch.delenv("ACCOUNTS_DB", raising=False)
    client = TestClient(app)
    assert client.get(f"{PREFIX}/session").json() == {"enabled": False, "username": None}
    assert client.post(f"{PREFIX}/register", json=CREDS).status_code == 503
    assert client.get("/api/health").status_code == 200


def test_register_logout_login_and_expiring_cookie(accounts_db):
    client = TestClient(app, base_url="https://testserver")
    assert client.get(f"{PREFIX}/workspace").status_code == 401
    invalid = client.post(f"{PREFIX}/register", json={**CREDS, "password": "short"})
    assert invalid.status_code == 422
    assert "short" not in invalid.text
    response = client.post(f"{PREFIX}/register", json=CREDS)
    assert response.status_code == 201
    assert response.json()["username"] == CREDS["username"]
    assert response.headers["cache-control"] == "no-store"
    cookie = response.headers["set-cookie"]
    assert all(attribute in cookie for attribute in ("HttpOnly", "Secure", "SameSite=lax", "Path=/api/account"))
    token = client.cookies["primerallave_session"]
    with sqlite3.connect(accounts_db) as conn:
        assert conn.execute("SELECT password_hash FROM accounts").fetchone()[0] != CREDS["password"].encode()
        assert conn.execute("SELECT token_hash FROM sessions").fetchone()[0] != token
    assert client.get(f"{PREFIX}/session").json()["username"] == CREDS["username"]
    assert client.post(f"{PREFIX}/register", json=CREDS).status_code == 409
    assert client.post(f"{PREFIX}/logout", headers=JSON).status_code == 204
    assert client.get(f"{PREFIX}/workspace").status_code == 401
    assert client.get(f"{PREFIX}/workspace", headers={"Cookie": f"primerallave_session={token}"}).status_code == 401
    assert client.post(f"{PREFIX}/login", json={**CREDS, "password": "wrong-password"}).status_code == 401
    assert client.post(f"{PREFIX}/login", json=CREDS).status_code == 200
    with sqlite3.connect(accounts_db) as conn:
        conn.execute("UPDATE sessions SET expires_at = 0")
    assert client.get(f"{PREFIX}/workspace").status_code == 401


def test_saved_listing_reminders_and_isolation(accounts_db):
    first, second = TestClient(app), TestClient(app)
    assert first.post(f"{PREFIX}/register", json=CREDS).status_code == 201
    assert second.post(f"{PREFIX}/register", json={**CREDS, "username": "otro_usuario"}).status_code == 201

    listing = {"title": "Piso compartido", "url": "https://www.idealista.com/inmueble/123456/", "remind_on": date.today().isoformat()}
    response = first.post(f"{PREFIX}/listings", json=listing)
    assert response.status_code == 200
    entries = response.json()
    listing_id = entries["listings"][0]["id"]
    notice_id = entries["notifications"][0]["id"]
    assert entries["listings"][0]["title"] == listing["title"]
    assert "Piso compartido" in entries["notifications"][0]["message"]
    assert len(first.post(f"{PREFIX}/listings", json=listing).json()["notifications"]) == 1
    assert second.delete(f"{PREFIX}/listings/{listing_id}", headers=JSON).json()["listings"] == []
    assert second.post(f"{PREFIX}/notifications/{notice_id}/read", headers=JSON).json()["notifications"] == []
    updated = first.post(f"{PREFIX}/notifications/{notice_id}/read", headers=JSON).json()
    assert updated["notifications"][0]["read"]
    assert first.delete(f"{PREFIX}/listings/{listing_id}", headers=JSON).json()["listings"] == []
    assert first.post(f"{PREFIX}/listings", json={**listing, "url": "http://example.org/"}).status_code == 422


def test_budget_watch_uses_current_official_estimate(accounts_db):
    client = TestClient(app)
    assert client.post(f"{PREFIX}/register", json=CREDS).status_code == 201
    result = client.post("/api/score", json={"campus_id": "etsisi", "budget_eur_month": 1000, "housing_type": "room"}).json()
    area = next(area for area in result["results"] if area["est_rent_eur_month"] is not None)
    payload = {"area_id": area["id"], "housing_type": "room", "budget_eur_month": area["est_rent_eur_month"]}
    response = client.post(f"{PREFIX}/watches", json=payload)
    assert response.status_code == 200
    entries = response.json()
    assert entries["watches"][0]["estimated_rent_eur_month"] == area["est_rent_eur_month"]
    assert len(entries["notifications"]) == 1
    assert len(client.get(f"{PREFIX}/workspace").json()["notifications"]) == 1
    assert client.post(f"{PREFIX}/logout", headers={"Content-Type": "text/plain"}).status_code == 415
    assert client.post(f"{PREFIX}/watches", json=payload, headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403
