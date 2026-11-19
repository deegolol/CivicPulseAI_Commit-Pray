"""Google's authorization-code flow. Google credentials remain server-side."""

import base64
from dataclasses import dataclass
import hashlib
import os
import secrets
import sqlite3
import time
from urllib.parse import urlencode, urlsplit

from email_validator import validate_email
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
import httpx

from .accounts import create_account, token_digest

TTL = 600
COOKIE = "primerallave_google_state"
CALLBACK = "/api/account/google/callback"


@dataclass(frozen=True)
class Config:
    client_id: str
    client_secret: str
    redirect_uri: str


def configuration() -> Config | None:
    values = [os.getenv(key, "").strip() for key in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI")]
    if not all(values):
        return None
    try:
        uri = urlsplit(values[2])
    except ValueError:
        return None
    if uri.path != CALLBACK or uri.query or uri.fragment or uri.username or uri.password or not uri.hostname:
        return None
    if uri.scheme != "https" and not (uri.scheme == "http" and uri.hostname in ("localhost", "127.0.0.1", "::1")):
        return None
    return Config(*values)


def begin(conn: sqlite3.Connection, config: Config, account_id: int | None) -> tuple[str, str]:
    state, nonce, verifier = (secrets.token_urlsafe(32) for _ in range(3))
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    now = int(time.time())
    conn.execute("DELETE FROM google_flows WHERE expires_at <= ?", (now,))
    conn.execute("INSERT INTO google_flows VALUES (?, ?, ?, ?, ?)",
                 (token_digest(state), nonce, verifier, account_id, now + TTL))
    query = urlencode({
        "client_id": config.client_id, "redirect_uri": config.redirect_uri, "response_type": "code",
        "scope": "openid email", "state": state, "nonce": nonce,
        "code_challenge": challenge, "code_challenge_method": "S256",
    })
    return state, f"https://accounts.google.com/o/oauth2/v2/auth?{query}"


def consume(conn: sqlite3.Connection, state: str):
    row = conn.execute("SELECT * FROM google_flows WHERE state_hash = ?", (token_digest(state),)).fetchone()
    conn.execute("DELETE FROM google_flows WHERE state_hash = ?", (token_digest(state),))
    return row if row and row["expires_at"] > int(time.time()) else None


class IdentityError(Exception):
    """Google authentication could not be completed."""


def exchange(config: Config, code: str, verifier: str, nonce: str) -> tuple[str, str]:
    try:
        response = httpx.post("https://oauth2.googleapis.com/token", data={
            "client_id": config.client_id, "client_secret": config.client_secret, "redirect_uri": config.redirect_uri,
            "grant_type": "authorization_code", "code": code, "code_verifier": verifier,
        }, timeout=8)
        response.raise_for_status()
        transport = GoogleRequest()

        def fetch_certificates(*args, **kwargs):
            return transport(*args, **{**kwargs, "timeout": 5})

        claims = id_token.verify_oauth2_token(response.json()["id_token"], fetch_certificates, config.client_id)
        subject = claims.get("sub")
        if claims.get("nonce") != nonce or claims.get("email_verified") is not True or not isinstance(subject, str) or not subject:
            raise IdentityError
        email = validate_email(claims["email"], check_deliverability=False).normalized.lower()
        return subject, email
    except (httpx.HTTPError, GoogleAuthError, KeyError, ValueError, TypeError) as exc:
        raise IdentityError from exc


def resolve_account(conn: sqlite3.Connection, subject: str, email: str, link_to: int | None) -> int:
    linked = conn.execute("SELECT account_id FROM account_emails WHERE google_subject = ?", (subject,)).fetchone()
    if linked:
        if link_to is not None and link_to != linked["account_id"]:
            raise IdentityError
        return linked["account_id"]

    registered = conn.execute("SELECT account_id FROM account_emails WHERE email = ?", (email,)).fetchone()
    if link_to is not None:
        # Linking requires an existing application session and the identical verified Google address.
        result = conn.execute(
            "UPDATE account_emails SET google_subject = ? "
            "WHERE account_id = ? AND email = ? AND google_subject IS NULL",
            (subject, link_to, email),
        )
        if result.rowcount != 1:
            raise IdentityError
        return link_to

    # An email match alone does not prove ownership of the existing application account.
    if registered:
        raise IdentityError
    account_id = create_account(conn, f"email-{secrets.token_hex(16)}", b"", b"")
    conn.execute("INSERT INTO account_emails VALUES (?, ?, ?)", (account_id, email, subject))
    return account_id
