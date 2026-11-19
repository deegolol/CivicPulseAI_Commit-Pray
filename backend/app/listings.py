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

# Portal slugs that differ from the plain slugified district name (each portal names some districts differently).
FOTOCASA_SLUG_OVERRIDES = {  # verified by hand: HTTP 200 for the 21 districts
    "salamanca": "barrio-de-salamanca",
    "san-blas-canillejas": "san-blas",
}
IDEALISTA_SLUG_OVERRIDES = {  # from Idealista's public URLs (reported by codex@techgallo); it blocks automated checks
    "salamanca": "barrio-de-salamanca",
    "san-blas-canillejas": "san-blas",
    "moncloa-aravaca": "moncloa",
    "fuencarral-el-pardo": "fuencarral",
}
FOTOCASA_ALL_MADRID = "todas-las-zonas"


def slugify(text: str) -> str:
    """'Fuencarral - El Pardo' → 'fuencarral-el-pardo', 'Chamberí' → 'chamberi'."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")


def district_slug(district: str, portal: str = "fotocasa") -> str:
    slug = slugify(district)
    overrides = IDEALISTA_SLUG_OVERRIDES if portal == "idealista" else FOTOCASA_SLUG_OVERRIDES
    return overrides.get(slug, slug)


def build_listing_links(district: str, budget_eur_month: float | None, housing_type: str) -> list[ListingLink]:
    """Search links for this district, capped at the user's budget when there is one. Always ≥ 1 link.
    Fotocasa goes first because its URLs are verified; Idealista may show its own bot check to some users."""
    price = int(budget_eur_month) if budget_eur_month else None
    is_room = housing_type == "room"
    links: list[ListingLink] = []

    # Fotocasa (verified)
    kind = "compartir/viviendas" if is_room else "alquiler/viviendas"
    zone = district_slug(district, "fotocasa") if district else FOTOCASA_ALL_MADRID
    links.append(ListingLink(label="Fotocasa", url=f"https://www.fotocasa.es/es/{kind}/madrid-capital/{zone}/l" + (f"?maxPrice={price}" if price else "")))

    # Idealista (public URL format; studios/flats use the generic rental search + price cap)
    kind = "alquiler-habitacion" if is_room else "alquiler-viviendas"
    zone = f"madrid/{district_slug(district, 'idealista')}" if district else "madrid-madrid"
    links.append(ListingLink(label="Idealista", url=f"https://www.idealista.com/{kind}/{zone}/" + (f"con-precio-hasta_{price}/" if price else "")))

    # Badi (shared flats only, city level)
    if is_room:
        links.append(ListingLink(label="Badi", url="https://badi.com/es/alquiler-habitaciones/madrid"))
    return links
