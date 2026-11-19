"""Account and saved housing routes. Private routes always require a valid account session."""

from contextlib import contextmanager
from datetime import date
from pathlib import Path
import hmac
import re
import secrets
import sqlite3
import time
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from fastapi.responses import RedirectResponse
from pydantic import AliasChoices, BaseModel, EmailStr, Field, HttpUrl, StringConstraints, field_validator

from .. import account_catalog, account_google, account_mail, accounts
from ..data import get_dataset
from ..models import HousingType
from ..net import client_ip

COOKIE = "primerallave_session"


def private_response(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


class AccountRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def without_sensitive_input(request: Request):
            try:
                return await handler(request)
            except RequestValidationError as exc:
                message = "Revisa los campos del formulario."
                if any(error["loc"][-1:] == ("url",) for error in exc.errors()):
                    message = "Usa un enlace HTTPS válido sin credenciales."
                raise HTTPException(422, message) from None

        return without_sensitive_input


router = APIRouter(
    prefix="/account", tags=["account"], route_class=AccountRoute, dependencies=[Depends(private_response)]
)


Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]


class Credentials(BaseModel):
    email: EmailStr
    password: Password


class LoginInput(BaseModel):
    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=254)] = Field(
        validation_alias=AliasChoices("email", "username")
    )
    password: Password


class EmailInput(BaseModel):
    email: EmailStr


class PasswordConfirmation(BaseModel):
    password: Password


class PasswordChange(PasswordConfirmation):
    new_password: Password


class PasswordReset(BaseModel):
    token: Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{43}$")]
    new_password: Password



class ListingInput(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    url: HttpUrl
    remind_on: date | None = None

    @field_validator("url")
    @classmethod
    def require_https(cls, value: HttpUrl) -> HttpUrl:
        account_catalog.offer_url(value)
        return value


class WatchInput(BaseModel):
    area_id: Annotated[str, StringConstraints(min_length=1, max_length=32)]
    housing_type: HousingType
    budget_eur_month: int = Field(gt=0, le=10_000)


def enabled_path() -> Path:
    path = accounts.database_path()
    if path is None:
        raise HTTPException(503, "Las cuentas todavía no están habilitadas.")
    return path


def require_json(request: Request) -> None:
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "Origen de la petición no permitido.")
    if request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        raise HTTPException(415, "Envía los datos en formato JSON.")


def set_session(response: Response, request: Request, token: str) -> None:
    response.set_cookie(
        COOKIE, token, max_age=accounts.SESSION_SECONDS, httponly=True,
        secure=request.url.scheme == "https", samesite="lax", path="/api/account",
    )


def restrict_attempts(request: Request, path: Path) -> None:
    with accounts.database(path, write=True) as conn:
        allowed = accounts.allow_attempt(conn, client_ip(request))
    if not allowed:
        raise HTTPException(429, "Demasiados intentos. Espera un minuto antes de volver a intentarlo.")


@contextmanager
def authenticated(request: Request):
    with accounts.database(enabled_path(), write=True) as conn:
        identity = accounts.current_account(conn, request.cookies.get(COOKIE))
        if identity is None:
            raise HTTPException(401, "Inicia sesión para acceder a tus guardados.")
        yield conn, identity["id"]


@router.get("/session")
def session(request: Request):
    path = accounts.database_path()
    if path is None:
        return {"enabled": False, "username": None}
    with accounts.database(path) as conn:
        identity = accounts.current_account(conn, request.cookies.get(COOKIE))
    return session_payload(identity)


def session_payload(identity) -> dict:
    return {
        "enabled": True,
        "username": (identity["email"] or identity["username"]) if identity else None,
        "email": identity["email"] if identity else None,
        "google_enabled": account_google.configuration() is not None,
        "google_linked": bool(identity and identity["google_subject"]),
        "recovery_enabled": account_mail.configuration() is not None,
    }


@router.post("/register", status_code=201, dependencies=[Depends(require_json)])
def register(credentials: Credentials, request: Request, response: Response):
    path = enabled_path()
    restrict_attempts(request, path)
    salt = secrets.token_bytes(16)
    value = accounts.password_hash(credentials.password, salt)
    try:
        with accounts.database(path, write=True) as conn:
            account_id = accounts.create_account(conn, f"email-{secrets.token_hex(16)}", salt, value)
            conn.execute("INSERT INTO account_emails VALUES (?, ?, NULL)", (account_id, credentials.email.lower()))
            token = accounts.start_session(conn, account_id, request.cookies.get(COOKIE))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409, "Ya existe una cuenta para ese correo.") from exc
    set_session(response, request, token)
    return session_after_login(path, token)


@router.post("/login", dependencies=[Depends(require_json)])
def login(credentials: LoginInput, request: Request, response: Response):
    path = enabled_path()
    restrict_attempts(request, path)
    with accounts.database(path, write=True) as conn:
        account_id = accounts.verify_account(conn, credentials.email, credentials.password) if ("@" in credentials.email or re.fullmatch(r"[a-z0-9_]{3,30}", credentials.email)) else None
        if account_id is None:
            raise HTTPException(401, "El usuario o la contraseña son incorrectos.")
        token = accounts.start_session(conn, account_id, request.cookies.get(COOKIE))
    set_session(response, request, token)
    return session_after_login(path, token)


def session_after_login(path: Path, token: str) -> dict:
    with accounts.database(path) as conn:
        return session_payload(accounts.current_account(conn, token))


@router.post("/password/forgot", status_code=202, dependencies=[Depends(require_json)])
def forgot_password(data: EmailInput, request: Request, background: BackgroundTasks):
    path = enabled_path()
    config = account_mail.configuration()
    if not config:
        raise HTTPException(503, "El envío de correos de recuperación todavía no está configurado.")
    restrict_attempts(request, path)
    email = data.email.lower()
    now = int(time.time())
    with accounts.database(path, write=True) as conn:
        conn.execute("DELETE FROM password_resets WHERE expires_at <= ?", (now,))
        row = conn.execute("SELECT account_id FROM account_emails WHERE email = ?", (email,)).fetchone()
        if row and not conn.execute(
            "SELECT 1 FROM password_resets WHERE account_id = ? AND expires_at > ?",
            (row["account_id"], now + 29 * 60),
        ).fetchone():
            token = secrets.token_urlsafe(32)
            conn.execute("INSERT INTO password_resets VALUES (?, ?, ?)",
                         (accounts.token_digest(token), row["account_id"], now + 30 * 60))
            background.add_task(account_mail.send_reset, config, email, token)
    return {"accepted": True}


@router.post("/password/reset", status_code=204, dependencies=[Depends(require_json)])
def reset_password(data: PasswordReset, request: Request, response: Response):
    path = enabled_path()
    restrict_attempts(request, path)
    with accounts.database(path, write=True) as conn:
        row = conn.execute("SELECT account_id FROM password_resets WHERE token_hash = ? AND expires_at > ?",
                           (accounts.token_digest(data.token), int(time.time()))).fetchone()
        if row is None:
            raise HTTPException(400, "El enlace ha caducado o ya se ha usado. Solicita uno nuevo.")
        accounts.replace_password(conn, row["account_id"], data.new_password)
    clear_session(request, response)


def confirm_password(conn: sqlite3.Connection, account: int, password: str) -> None:
    identity = conn.execute("SELECT username FROM accounts WHERE id = ?", (account,)).fetchone()
    if accounts.verify_account(conn, identity["username"], password) != account:
        raise HTTPException(401, "La contraseña actual es incorrecta.")


@router.post("/password/change", status_code=204, dependencies=[Depends(require_json)])
def change_password(data: PasswordChange, request: Request, response: Response):
    restrict_attempts(request, enabled_path())
    with authenticated(request) as (conn, account):
        confirm_password(conn, account, data.password)
        accounts.replace_password(conn, account, data.new_password)
        token = accounts.start_session(conn, account, None)
    set_session(response, request, token)


@router.delete("/profile", status_code=204, dependencies=[Depends(require_json)])
def delete_account(data: PasswordConfirmation, request: Request, response: Response):
    restrict_attempts(request, enabled_path())
    with authenticated(request) as (conn, account):
        confirm_password(conn, account, data.password)
        conn.execute("DELETE FROM accounts WHERE id = ?", (account,))
    clear_session(request, response)


@router.post("/email", dependencies=[Depends(require_json)])
def add_email(data: EmailInput, request: Request):
    # Existing username accounts keep their favorites when adding a login email.
    try:
        with authenticated(request) as (conn, account):
            if conn.execute("SELECT 1 FROM account_emails WHERE account_id = ?", (account,)).fetchone():
                raise HTTPException(409, "Esta cuenta ya tiene correo.")
            conn.execute("INSERT INTO account_emails VALUES (?, ?, NULL)", (account, data.email.lower()))
            return session_payload(accounts.current_account(conn, request.cookies.get(COOKIE)))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409, "Ya existe una cuenta para ese correo.") from exc


@router.get("/google/start")
def google_start(request: Request):
    path = enabled_path()
    config = account_google.configuration()
    if config is None:
        raise HTTPException(503, "Google todavía no está configurado.")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "Abre el inicio de sesión desde PrimeraLlave.")
    restrict_attempts(request, path)
    with accounts.database(path, write=True) as conn:
        identity = accounts.current_account(conn, request.cookies.get(COOKIE))
        if identity and not identity["email"]:
            return RedirectResponse("/?cuenta=correo", status_code=303)
        state, target = account_google.begin(conn, config, identity["id"] if identity else None)
    response = RedirectResponse(target, status_code=303, headers={"Cache-Control": "no-store"})
    response.set_cookie(account_google.COOKIE, state, max_age=account_google.TTL,
                        path=account_google.CALLBACK, httponly=True, samesite="lax",
                        secure=config.redirect_uri.startswith("https:"))
    return response


@router.get("/google/callback")
def google_callback(request: Request, code: str = "", state: str = ""):
    path = enabled_path()
    config = account_google.configuration()
    if config is None:
        raise HTTPException(503, "Google todavía no está configurado.")
    response = RedirectResponse("/?cuenta=google_error", status_code=303, headers={"Cache-Control": "no-store"})
    response.delete_cookie(account_google.COOKIE, path=account_google.CALLBACK, httponly=True, samesite="lax",
                           secure=config.redirect_uri.startswith("https:"))
    from_browser = request.cookies.get(account_google.COOKIE, "")
    if not state or not hmac.compare_digest(state.encode(), from_browser.encode()):
        return response
    with accounts.database(path, write=True) as conn:
        flow = account_google.consume(conn, state)
    if not flow or not code:
        return response
    try:
        subject, email = account_google.exchange(config, code, flow["verifier"], flow["nonce"])
        previous = request.cookies.get(COOKIE)
        with accounts.database(path, write=True) as conn:
            identity = accounts.current_account(conn, previous)
            if (identity["id"] if identity else None) != flow["account_id"]:
                return response
            account_id = account_google.resolve_account(conn, subject, email, flow["account_id"])
            token = accounts.start_session(conn, account_id, previous)
    except (account_google.IdentityError, sqlite3.IntegrityError):
        return response
    response.headers["Location"] = "/?cuenta=google"
    set_session(response, request, token)
    return response



@router.post("/logout", status_code=204, dependencies=[Depends(require_json)])
def logout(request: Request, response: Response):
    with accounts.database(enabled_path(), write=True) as conn:
        accounts.end_session(conn, request.cookies.get(COOKIE))
    clear_session(request, response)


def clear_session(request: Request, response: Response):
    response.delete_cookie(COOKIE, path="/api/account", httponly=True, samesite="lax", secure=request.url.scheme == "https")


@router.get("/workspace")
def get_workspace(request: Request):
    with authenticated(request) as (conn, account):
        return accounts.workspace(conn, account)


@router.post("/listings", dependencies=[Depends(require_json)])
def add_listing(listing: ListingInput, request: Request):
    with authenticated(request) as (conn, account):
        url = account_catalog.offer_url(listing.url)
        accounts.save_listing(conn, account, listing.title, url, listing.remind_on)
        return accounts.workspace(conn, account)


@router.get("/offers")
def available_offers(district: str, housing_type: HousingType):
    enabled_path()
    return [
        offer.public() for offer in account_catalog.catalog()
        if offer.available and offer.district.casefold() == district.casefold() and offer.housing_type == housing_type
    ][:12]


@router.delete("/listings", dependencies=[Depends(require_json)])
def clear_listings(request: Request):
    with authenticated(request) as (conn, account):
        conn.execute("DELETE FROM listings WHERE account_id = ?", (account,))
        return accounts.workspace(conn, account)


@router.delete("/listings/{listing_id}", dependencies=[Depends(require_json)])
def remove_listing(listing_id: int, request: Request):
    with authenticated(request) as (conn, account):
        conn.execute("DELETE FROM listings WHERE id = ? AND account_id = ?", (listing_id, account))
        return accounts.workspace(conn, account)


@router.post("/watches", dependencies=[Depends(require_json)])
def add_watch(watch: WatchInput, request: Request):
    with authenticated(request) as (conn, account):
        if get_dataset().area(watch.area_id) is None:
            raise HTTPException(404, "Esa zona no está disponible.")
        accounts.save_watch(conn, account, watch.area_id, watch.housing_type, watch.budget_eur_month)
        return accounts.workspace(conn, account)


@router.delete("/watches/{watch_id}", dependencies=[Depends(require_json)])
def remove_watch(watch_id: int, request: Request):
    with authenticated(request) as (conn, account):
        conn.execute("DELETE FROM watches WHERE id = ? AND account_id = ?", (watch_id, account))
        return accounts.workspace(conn, account)


@router.post("/notifications/{notice_id}/read", dependencies=[Depends(require_json)])
def mark_read(notice_id: int, request: Request):
    with authenticated(request) as (conn, account):
        conn.execute("UPDATE notifications SET read = 1 WHERE id = ? AND account_id = ?", (notice_id, account))
        return accounts.workspace(conn, account)
