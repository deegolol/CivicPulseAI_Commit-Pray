"""Private account storage. The open-data recommendation service stays stateless."""

from contextlib import closing, contextmanager
from datetime import date, datetime, timezone
import hashlib
import hmac
import os
from pathlib import Path
import secrets
import sqlite3
import time

from . import account_catalog
from .data import REPO_ROOT, get_dataset
from .scoring import official_rent

SESSION_SECONDS = 7 * 24 * 60 * 60
SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt BLOB NOT NULL, password_hash BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS account_emails (
    account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL, google_subject TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS google_flows (
    state_hash TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
    source TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL, url TEXT NOT NULL, remind_on TEXT, UNIQUE(account_id, url)
);
CREATE TABLE IF NOT EXISTS offer_observations (
    listing_id INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    offer_id TEXT NOT NULL, price INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_searches (
    listing_id INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    district TEXT NOT NULL, housing_type TEXT NOT NULL, budget INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS watches (
    id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL, housing_type TEXT NOT NULL, budget_eur_month INTEGER NOT NULL,
    last_match INTEGER NOT NULL DEFAULT 0, UNIQUE(account_id, area_id, housing_type, budget_eur_month)
);
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    message TEXT NOT NULL, created_at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, reminder_key TEXT,
    UNIQUE(account_id, reminder_key)
);
CREATE TABLE IF NOT EXISTS notification_details (
    notice_id INTEGER PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, url TEXT
);
"""


def database_path() -> Path | None:
    configured = os.getenv("ACCOUNTS_DB", "").strip()
    if os.getenv("ACCOUNTS_ENABLED", "").lower() != "true" or not configured:
        return None
    path = Path(configured).expanduser()
    return path if path.is_absolute() else REPO_ROOT / path


@contextmanager
def database(path: Path, *, write: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path, timeout=10)) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA)
        with conn:
            if write:
                conn.execute("BEGIN IMMEDIATE")
            yield conn


def password_hash(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**15, r=8, p=1, maxmem=64 * 1024**2)


def create_account(conn: sqlite3.Connection, username: str, salt: bytes, value: bytes) -> int:
    result = conn.execute(
        "INSERT INTO accounts(username, salt, password_hash) VALUES (?, ?, ?)",
        (username, salt, value),
    )
    return result.lastrowid


def verify_account(conn: sqlite3.Connection, username: str, password: str) -> int | None:
    row = conn.execute(
        "SELECT accounts.id, salt, password_hash FROM accounts "
        "LEFT JOIN account_emails ON accounts.id = account_id WHERE email = ? OR username = ?",
        (username, username),
    ).fetchone()
    if row and not row["password_hash"]:
        row = None
    expected = row["password_hash"] if row else bytes(64)
    actual = password_hash(password, row["salt"] if row else bytes(16))
    return row["id"] if hmac.compare_digest(expected, actual) and row else None


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def replace_password(conn: sqlite3.Connection, account: int, password: str) -> None:
    salt = secrets.token_bytes(16)
    conn.execute("UPDATE accounts SET salt = ?, password_hash = ? WHERE id = ?",
                 (salt, password_hash(password, salt), account))
    for table in ("sessions", "password_resets", "google_flows"):
        conn.execute(f"DELETE FROM {table} WHERE account_id = ?", (account,))


def current_account(conn: sqlite3.Connection, token: str | None):
    if not token:
        return None
    return conn.execute(
        "SELECT accounts.id, username, email, google_subject FROM sessions "
        "JOIN accounts ON accounts.id = sessions.account_id LEFT JOIN account_emails ON accounts.id = account_emails.account_id "
        "WHERE token_hash = ? AND expires_at > ?",
        (token_digest(token), int(time.time())),
    ).fetchone()


def end_session(conn: sqlite3.Connection, token: str | None) -> None:
    if token:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_digest(token),))


def start_session(conn: sqlite3.Connection, account_id: int, previous: str | None) -> str:
    now = int(time.time())
    end_session(conn, previous)
    conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions VALUES (?, ?, ?)", (token_digest(token), account_id, now + SESSION_SECONDS))
    return token


def allow_attempt(conn: sqlite3.Connection, host: str) -> bool:
    window = int(time.time()) // 60
    source = token_digest(host)
    conn.execute("DELETE FROM attempts WHERE window < ?", (window - 1,))
    conn.execute(
        "INSERT INTO attempts VALUES (?, ?, 1) ON CONFLICT(source) DO UPDATE SET "
        "count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END, window = excluded.window",
        (source, window),
    )
    return conn.execute("SELECT count FROM attempts WHERE source = ?", (source,)).fetchone()["count"] <= 12


def save_listing(conn: sqlite3.Connection, account: int, title: str, url: str, remind_on: date | None) -> None:
    conn.execute(
        "INSERT INTO listings(account_id, title, url, remind_on) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(account_id, url) DO UPDATE SET title = excluded.title, "
        "remind_on = COALESCE(excluded.remind_on, listings.remind_on)",
        (account, title, url, remind_on.isoformat() if remind_on else None),
    )


def save_watch(conn: sqlite3.Connection, account: int, area_id: str, housing_type: str, budget: int) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO watches(account_id, area_id, housing_type, budget_eur_month) VALUES (?, ?, ?, ?)",
        (account, area_id, housing_type, budget),
    )


def emit_notice(conn: sqlite3.Connection, account: int, message: str, reminder_key: str | None = None, *, kind: str = "general", url: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    result = conn.execute(
        "INSERT OR IGNORE INTO notifications(account_id, message, created_at, reminder_key) VALUES (?, ?, ?, ?)",
        (account, message, now, reminder_key),
    )
    if result.rowcount and (url or kind != "general"):
        conn.execute("INSERT INTO notification_details VALUES (?, ?, ?)", (result.lastrowid, kind, url))


def workspace(conn: sqlite3.Connection, account: int) -> dict:
    listings = [
        dict(row)
        for row in conn.execute(
            "SELECT id, title, url, remind_on, district AS search_district, housing_type AS search_type, "
            "budget AS search_budget FROM listings LEFT JOIN saved_searches ON listing_id = id "
            "WHERE account_id = ? ORDER BY id DESC",
            (account,),
        )
    ]
    offers = account_catalog.record_alerts(conn, account, listings, account_catalog.catalog(), emit_notice)
    today = date.today().isoformat()
    for listing in listings:
        reminder = listing["remind_on"]
        if reminder and reminder <= today:
            emit_notice(conn, account, f"Recordatorio: revisa {listing['title']}.", f"{listing['id']}:{reminder}", kind="reminder", url=listing["url"])

    dataset = get_dataset()
    watches = []
    for row in conn.execute("SELECT * FROM watches WHERE account_id = ? ORDER BY id DESC", (account,)):
        area = dataset.area(row["area_id"])
        estimate = official_rent(area, dataset.rents, row["housing_type"])[0] if area else None
        matches = estimate is not None and estimate <= row["budget_eur_month"]
        if matches and not row["last_match"]:
            emit_notice(conn, account, f"{area.name} encaja en tu presupuesto: {estimate} €/mes de alquiler mediano oficial de pisos en su distrito.", kind="budget")
        if matches != bool(row["last_match"]):
            conn.execute("UPDATE watches SET last_match = ? WHERE id = ?", (matches, row["id"]))
        watches.append({
            "id": row["id"], "area_id": row["area_id"], "area_name": area.name if area else row["area_id"],
            "housing_type": row["housing_type"], "budget_eur_month": row["budget_eur_month"],
            "estimated_rent_eur_month": estimate,
        })

    notices = [
        {**dict(row), "read": bool(row["read"])}
        for row in conn.execute(
            "SELECT id, message, created_at, read, COALESCE(kind, 'general') AS kind, url "
            "FROM notifications LEFT JOIN notification_details ON notice_id = id WHERE account_id = ? "
            "ORDER BY id DESC LIMIT 100",
            (account,),
        )
    ]
    return {"listings": listings, "watches": watches, "notifications": notices, "offers": [offer.public() for offer in offers]}
