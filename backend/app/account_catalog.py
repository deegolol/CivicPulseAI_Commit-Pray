"""Offer alerts sourced exclusively from a configured, authorized JSON catalog."""

import json
import logging
import os
from collections import Counter
from functools import lru_cache
from pathlib import Path
import re
import sqlite3
from typing import Literal
from urllib.parse import urlsplit, urlunsplit

from pydantic import BaseModel, Field, HttpUrl, ValidationError, field_validator

from .data import REPO_ROOT

MAX_BYTES = 2_000_000
logger = logging.getLogger(__name__)


def offer_url(value: HttpUrl) -> str:
    if value.scheme != "https" or value.username is not None or value.password is not None:
        raise ValueError("Usa un enlace HTTPS sin credenciales.")
    url = urlsplit(str(value))
    query = url.query
    if url.hostname in {"www.idealista.com", "idealista.com"} and re.fullmatch(r"/inmueble/[0-9]+/?", url.path):
        return f"https://www.idealista.com{url.path.rstrip('/')}/"
    return urlunsplit((url.scheme, url.netloc, url.path, query, ""))


class Offer(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=120)
    url: HttpUrl
    district: str = Field(min_length=1, max_length=100)
    housing_type: Literal["room", "studio", "flat"]
    price_eur_month: int = Field(strict=True, gt=0, le=100_000)
    available: bool = True

    @field_validator("url")
    @classmethod
    def validate_offer_url(cls, value: HttpUrl) -> HttpUrl:
        offer_url(value)
        return value

    def public(self) -> dict:
        return {**self.model_dump(), "url": offer_url(self.url)}


@lru_cache(maxsize=2)
def read_catalog(path: Path, signature: tuple[int, int]) -> tuple[Offer, ...]:
    try:
        with path.open("rb") as file:
            raw = file.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Catalog too large")
        rows = json.loads(raw)["offers"]
        if not isinstance(rows, list) or len(rows) > 5000:
            raise ValueError("Expected an offers list")
        offers = {}
        for row in rows:
            try:
                offer = Offer.model_validate(row)
                offers.setdefault(offer_url(offer.url), offer)
            except ValidationError:
                continue
        return tuple(offers.values())
    except (OSError, ValueError, TypeError, KeyError):
        logger.warning("Offer catalog unavailable or invalid")
        return ()


def catalog() -> tuple[Offer, ...]:
    configured = os.getenv("ACCOUNTS_CATALOG_PATH", "").strip()
    if not configured:
        return ()
    path = REPO_ROOT / configured
    try:
        stat = path.stat()
    except OSError:
        return ()
    return read_catalog(path, (stat.st_mtime_ns, stat.st_size))


def record_alerts(conn: sqlite3.Connection, account: int, listings: list[dict], offers: tuple[Offer, ...], notify) -> list[Offer]:
    by_url = {offer_url(offer.url): offer for offer in offers}
    favorites = []
    saved_urls = set()
    for listing in listings:
        url = listing["url"]
        # Older bookmarks may have kept tracking parameters.
        try:
            url = offer_url(HttpUrl(url))
        except (ValidationError, ValueError):
            continue
        saved_urls.add(url)
        offer = by_url.get(url)
        if not offer:
            continue
        if not offer.available:
            listing["available"] = False
            notify(conn, account, f"{listing['title']} ya no está disponible.",
                   f"unavailable:{listing['id']}:{offer.id}", kind="unavailable")
            continue
        favorites.append(offer)
        price = offer.price_eur_month
        listing["price_eur_month"] = price
        previous = conn.execute("SELECT offer_id, price FROM offer_observations WHERE listing_id = ?",
                                (listing["id"],)).fetchone()
        if previous and previous["offer_id"] == offer.id and price < previous["price"]:
            notify(conn, account, f"{listing['title']} ha bajado de {previous['price']} € a {price} €/mes.",
                   kind="price_drop", url=url)
        if previous is None or (previous["offer_id"], previous["price"]) != (offer.id, price):
            conn.execute(
                "INSERT INTO offer_observations VALUES (?, ?, ?) ON CONFLICT(listing_id) "
                "DO UPDATE SET offer_id = excluded.offer_id, price = excluded.price",
                (listing["id"], offer.id, price),
            )

    profiles = Counter((offer.district.casefold(), offer.housing_type) for offer in favorites)
    ceilings = {}
    for offer in favorites:
        key = (offer.district.casefold(), offer.housing_type)
        ceilings[key] = max(ceilings.get(key, 0), offer.price_eur_month)
    relevant = [
        offer for url, offer in by_url.items()
        if offer.available and url not in saved_urls
        and offer.price_eur_month <= ceilings.get((offer.district.casefold(), offer.housing_type), 0)
    ]
    relevant.sort(key=lambda offer: (-profiles[(offer.district.casefold(), offer.housing_type)], offer.price_eur_month, offer.id))
    # Seed one recommendation per refresh only when the best matching listing changes.
    if relevant:
        offer = relevant[0]
        notify(conn, account, f"Por tus favoritos, podría interesarte {offer.title} en {offer.district}, por {offer.price_eur_month} €/mes.",
               f"suggestion:{offer_url(offer.url)}", kind="suggestion", url=offer_url(offer.url))
    ranked_urls = saved_urls | {offer_url(offer.url) for offer in relevant}
    return (relevant + [offer for url, offer in by_url.items() if offer.available and url not in ranked_urls])[:12]
