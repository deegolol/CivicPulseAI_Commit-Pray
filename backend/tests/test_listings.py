"""Listing links: slugs, portal formats, budget cap and fallbacks (T22)."""
from app.listings import build_listing_links, district_slug, slugify


def test_slugify_handles_accents_spaces_and_dashes():
    assert slugify("Chamberí") == "chamberi"
    assert slugify("Fuencarral - El Pardo") == "fuencarral-el-pardo"
    assert slugify("Moncloa-Aravaca") == "moncloa-aravaca"


def test_portal_specific_slugs():
    assert district_slug("Salamanca") == "barrio-de-salamanca"
    assert district_slug("San Blas - Canillejas") == "san-blas"
    assert district_slug("Moncloa - Aravaca") == "moncloa-aravaca"  # Fotocasa (verified)
    assert district_slug("Moncloa - Aravaca", "idealista") == "moncloa"
    assert district_slug("Fuencarral - El Pardo", "idealista") == "fuencarral"


def test_fotocasa_first_and_idealista_uses_its_own_slugs():
    links = build_listing_links("Moncloa - Aravaca", 500, "room")
    assert links[0].label == "Fotocasa" and "/moncloa-aravaca/" in links[0].url
    assert links[1].url == "https://www.idealista.com/alquiler-habitacion/madrid/moncloa/con-precio-hasta_500/"


def test_room_links_use_room_searches_and_budget():
    links = {l.label: l.url for l in build_listing_links("Puente de Vallecas", 450, "room")}
    assert links["Idealista"] == "https://www.idealista.com/alquiler-habitacion/madrid/puente-de-vallecas/con-precio-hasta_450/"
    assert links["Fotocasa"] == "https://www.fotocasa.es/es/compartir/viviendas/madrid-capital/puente-de-vallecas/l?maxPrice=450"
    assert "Badi" in links


def test_flat_links_without_budget_and_without_district():
    links = {l.label: l.url for l in build_listing_links("Arganzuela", None, "flat")}
    assert links["Idealista"].endswith("/alquiler-viviendas/madrid/arganzuela/")
    assert links["Fotocasa"].endswith("/alquiler/viviendas/madrid-capital/arganzuela/l")
    assert "Badi" not in links
    fallback = build_listing_links("", 700.9, "studio")
    assert fallback and fallback[0].url.endswith("/madrid-capital/todas-las-zonas/l?maxPrice=700")


def test_score_endpoint_returns_links(client=None):
    from fastapi.testclient import TestClient
    from app.main import app
    r = TestClient(app).post("/api/score", json={"campus_id": "etsisi", "budget_eur_month": 450}).json()
    assert all(len(x["listing_links"]) >= 1 for x in r["results"])
