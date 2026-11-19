"""Account flows and privacy boundaries for saved listings and notifications."""

from datetime import date
import json
import sqlite3
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

from app import account_google, accounts
from app.main import app

PREFIX = "/api/account"
CREDS = {"email": "estudiante@example.com", "password": "una-clave-de-prueba"}
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
    assert response.json()["username"] == CREDS["email"]
    assert response.headers["cache-control"] == "no-store"
    cookie = response.headers["set-cookie"]
    assert all(attribute in cookie for attribute in ("HttpOnly", "Secure", "SameSite=lax", "Path=/api/account"))
    token = client.cookies["primerallave_session"]
    with sqlite3.connect(accounts_db) as conn:
        assert conn.execute("SELECT password_hash FROM accounts").fetchone()[0] != CREDS["password"].encode()
        assert conn.execute("SELECT token_hash FROM sessions").fetchone()[0] != token
    assert client.get(f"{PREFIX}/session").json()["username"] == CREDS["email"]
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
    assert second.post(f"{PREFIX}/register", json={**CREDS, "email": "otro@example.com"}).status_code == 201

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

def test_rate_limit_uses_proxy_client_ip(accounts_db, monkeypatch):
    seen = []

    def deny_attempt(conn, host):
        seen.append(host)
        return False

    monkeypatch.setattr(accounts, "allow_attempt", deny_attempt)
    response = TestClient(app).post(
        f"{PREFIX}/login", json=CREDS,
        headers={"X-Forwarded-For": "192.0.2.9, 198.51.100.3"},
    )
    assert response.status_code == 429
    assert seen == ["198.51.100.3"]

def test_legacy_user_can_add_email_without_losing_favorites(accounts_db):
    value = accounts.password_hash(CREDS["password"], b"1234567890123456")
    with accounts.database(accounts_db, write=True) as conn:
        account_id = accounts.create_account(conn, "legacy_user", b"1234567890123456", value)
        accounts.save_listing(conn, account_id, "Anuncio anterior", "https://example.org/123", None)
    client = TestClient(app)
    assert client.post(f"{PREFIX}/login", json={"username": "legacy_user", "password": CREDS["password"]}).status_code == 200
    assert client.post(f"{PREFIX}/email", json={"email": CREDS["email"]}).json()["email"] == CREDS["email"]
    client.post(f"{PREFIX}/logout", headers=JSON)
    assert client.post(f"{PREFIX}/login", json=CREDS).status_code == 200
    assert client.get(f"{PREFIX}/workspace").json()["listings"][0]["title"] == "Anuncio anterior"


@pytest.fixture
def google_profile(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/api/account/google/callback")
    calls = []

    def fake_exchange(config, code, verifier, nonce):
        assert code == "provider-code" and verifier and nonce
        calls.append(code)
        return "google-subject-42", CREDS["email"]

    monkeypatch.setattr(account_google, "exchange", fake_exchange)
    return calls


def start_google(client):
    response = client.get(f"{PREFIX}/google/start", follow_redirects=False)
    assert response.status_code == 303
    target = urlsplit(response.headers["location"])
    assert target.hostname == "accounts.google.com"
    params = parse_qs(target.query)
    assert params["code_challenge_method"] == ["S256"]
    assert "HttpOnly" in response.headers["set-cookie"]
    return params["state"][0]


def test_google_state_and_session(accounts_db, google_profile):
    client = TestClient(app, base_url="http://localhost:5173")
    state = start_google(client)
    callback = client.get(f"{PREFIX}/google/callback", params={"state": state, "code": "provider-code"}, follow_redirects=False)
    assert callback.headers["location"] == "/?cuenta=google"
    assert client.get(f"{PREFIX}/session").json()["google_linked"]
    callback = client.get(f"{PREFIX}/google/callback", params={"state": state, "code": "provider-code"}, follow_redirects=False,
                          headers={"Cookie": f"primerallave_google_state={state}"})
    assert callback.headers["location"] == "/?cuenta=google_error"
    assert len(google_profile) == 1


def test_google_cannot_claim_existing_account_without_password_session(accounts_db, google_profile):
    founder = TestClient(app, base_url="http://localhost:5173")
    assert founder.post(f"{PREFIX}/register", json=CREDS).status_code == 201
    outsider = TestClient(app, base_url="http://localhost:5173")
    state = start_google(outsider)
    callback = outsider.get(f"{PREFIX}/google/callback", params={"state": state, "code": "provider-code"}, follow_redirects=False)
    assert callback.headers["location"] == "/?cuenta=google_error"
    assert outsider.get(f"{PREFIX}/workspace").status_code == 401
    state = start_google(founder)
    callback = founder.get(f"{PREFIX}/google/callback", params={"state": state, "code": "provider-code"}, follow_redirects=False)
    assert callback.headers["location"] == "/?cuenta=google"
    assert founder.get(f"{PREFIX}/session").json()["google_linked"]


def test_catalog_price_observations_and_matching_suggestions(accounts_db, monkeypatch, tmp_path):
    catalog = tmp_path / "catalog.json"
    monkeypatch.setenv("ACCOUNTS_CATALOG_PATH", str(catalog))
    favorite = {"id": "a", "title": "Habitación guardada", "url": "https://idealista.com/inmueble/42/",
                "district": "Centro", "housing_type": "room", "price_eur_month": 650}
    suggested = {**favorite, "id": "b", "title": "Habitación cercana", "url": "https://example.org/b", "price_eur_month": 540}
    unrelated = {**suggested, "id": "c", "url": "https://example.org/c", "district": "Retiro"}
    catalog.write_text(json.dumps({"offers": [favorite, suggested, unrelated]}), encoding="utf-8")
    client = TestClient(app)
    assert client.post(f"{PREFIX}/register", json=CREDS).status_code == 201
    saved = client.post(f"{PREFIX}/listings", json={
        "title": favorite["title"], "url": "https://www.idealista.com/inmueble/42/?utm_source=share"
    }).json()
    assert saved["listings"][0]["price_eur_month"] == 650
    assert [(n["kind"], n["url"]) for n in saved["notifications"]] == [("suggestion", suggested["url"])]
    catalog.write_text(json.dumps({"offers": [{**favorite, "price_eur_month": 590}, suggested, unrelated]}), encoding="utf-8")
    new_state = client.get(f"{PREFIX}/workspace").json()
    assert new_state["listings"][0]["price_eur_month"] == 590
    assert [n["kind"] for n in new_state["notifications"]] == ["price_drop", "suggestion"]
    assert len(client.get(f"{PREFIX}/workspace").json()["notifications"]) == 2

@pytest.mark.parametrize("verified, nonce", [(False, "expected"), (True, "different"), (True, "expected")])
def test_google_exchange_checks_verified_email_and_nonce(monkeypatch, verified, nonce):
    config = account_google.Config("client", "secret", "https://example.org/api/account/google/callback")

    class TokenResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"id_token": "signed-token"}

    def exchange_request(url, *, data, timeout):
        assert url == "https://oauth2.googleapis.com/token"
        assert data["code_verifier"] == "verifier"
        return TokenResponse()

    def verify_token(token, fetch, audience):
        assert token == "signed-token" and audience == config.client_id
        return {"sub": "123", "email": "Test@example.com", "email_verified": verified, "nonce": nonce}

    monkeypatch.setattr(account_google.httpx, "post", exchange_request)
    monkeypatch.setattr(account_google.id_token, "verify_oauth2_token", verify_token)
    if verified and nonce == "expected":
        assert account_google.exchange(config, "code", "verifier", "expected") == ("123", "test@example.com")
    else:
        with pytest.raises(account_google.IdentityError):
            account_google.exchange(config, "code", "verifier", "expected")
