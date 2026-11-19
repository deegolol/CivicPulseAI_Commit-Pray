"""Builds links to listing searches already filtered by zone + max price on rental portals (T22).

ONLY links: we never scrape or call these portals. The user clicks and lands on the portal's own search.
Zone level is the DISTRICT: our rent data is per district (SERPAVI) and portals' district slugs are stable.

Verified by hand on 19/11/2026 (HTTP 200 for the 21 districts with the slug overrides below):
  Fotocasa  https://www.fotocasa.es/es/alquiler/viviendas/madrid-capital/arganzuela/l?maxPrice=600
            https://www.fotocasa.es/es/compartir/viviendas/madrid-capital/arganzuela/l?maxPrice=400   (rooms)
  Badi      https://badi.com/es/alquiler-habitaciones/madrid                                         (rooms, city level)
Idealista blocks automated checks (HTTP 403), so its format comes from its public URLs and was not auto-verified:
  Idealista https://www.idealista.com/alquiler-viviendas/madrid/arganzuela/con-precio-hasta_600/
            https://www.idealista.com/alquiler-habitacion/madrid/arganzuela/con-precio-hasta_400/
"""
from __future__ import annotations

import re
import unicodedata

from .models import ListingLink

# Portal slugs that differ from the plain slugified district name.
DISTRICT_SLUG_OVERRIDES = {
    "salamanca": "barrio-de-salamanca",
    "san-blas-canillejas": "san-blas",
}
FOTOCASA_ALL_MADRID = "todas-las-zonas"


def slugify(text: str) -> str:
    """'Fuencarral - El Pardo' → 'fuencarral-el-pardo', 'Chamberí' → 'chamberi'."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")


def district_slug(district: str) -> str:
    slug = slugify(district)
    return DISTRICT_SLUG_OVERRIDES.get(slug, slug)


def build_listing_links(district: str, budget_eur_month: float | None, housing_type: str) -> list[ListingLink]:
    """Search links for this district, capped at the user's budget when there is one. Always ≥ 1 link."""
    slug = district_slug(district) if district else ""
    price = int(budget_eur_month) if budget_eur_month else None
    is_room = housing_type == "room"
    links: list[ListingLink] = []

    # Idealista
    kind = "alquiler-habitacion" if is_room else "alquiler-viviendas"
    zone = f"madrid/{slug}" if slug else "madrid-madrid"
    links.append(ListingLink(label="Idealista", url=f"https://www.idealista.com/{kind}/{zone}/" + (f"con-precio-hasta_{price}/" if price else "")))

    # Fotocasa
    kind = "compartir/viviendas" if is_room else "alquiler/viviendas"
    zone = slug or FOTOCASA_ALL_MADRID
    links.append(ListingLink(label="Fotocasa", url=f"https://www.fotocasa.es/es/{kind}/madrid-capital/{zone}/l" + (f"?maxPrice={price}" if price else "")))

    # Badi (shared flats only, city level)
    if is_room:
        links.append(ListingLink(label="Badi", url="https://badi.com/es/alquiler-habitaciones/madrid"))
    return links
