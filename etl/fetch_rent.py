"""Build the neighborhood rent indicator from official SERPAVI district medians."""

import json
import math
import shutil
import ssl
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen

import certifi
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
CACHE = ROOT / "data" / "raw" / "serpavi-2024.xlsx"
RENT_URL = (
    "https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/"
    "2026-03_09_bd_SERPAVI_2011-2024%20-%20DEFINITIVO%20WEB_v2.xlsx"
)
PRICE_COLUMN = "ALQM2_LV_M_VC_24"
MADRID_CODE = "28079"
DISTRICT_NOTE = "valor del distrito"


def read_district_prices(path):
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        rows = workbook["Distritos"].iter_rows(values_only=True)
        columns = next(rows)
        district_index = columns.index("CUDIS")
        price_index = columns.index(PRICE_COLUMN)
        prices = {}
        for row in rows:
            code = str(row[district_index]).strip()
            if len(code) != 7 or not code.startswith(MADRID_CODE) or not code.isdigit():
                continue
            district = code[-2:]
            if district in prices:
                raise ValueError(f"Duplicate SERPAVI district code: {code}")
            price = row[price_index]
            # Blank or suppressed cells have no publishable median.
            valid = type(price) in (int, float) and math.isfinite(price) and price > 0
            prices[district] = round(price, 2) if valid else None
        if not any(price is not None for price in prices.values()):
            raise ValueError("SERPAVI contains no publishable district prices for Madrid")
        return prices
    finally:
        workbook.close()


def fetch_district_prices():
    if CACHE.is_file():
        return read_district_prices(CACHE)
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    context = ssl.create_default_context()
    context.load_verify_locations(certifi.where())
    with TemporaryDirectory(dir=CACHE.parent) as directory:
        candidate = Path(directory) / CACHE.name
        with urlopen(RENT_URL, timeout=60, context=context) as response, candidate.open("wb") as file:
            shutil.copyfileobj(response, file)
        prices = read_district_prices(candidate)
        candidate.replace(CACHE)
    return prices


def build_rent_part(features, prices, retrieved):
    values = {}
    notes = {}
    for feature in features:
        properties = feature["properties"]
        area_id = properties["id"]
        price = prices.get(properties["district_id"])
        values[area_id] = price
        notes[area_id] = DISTRICT_NOTE if price is not None else "sin dato de alquiler para el distrito"

    return {
        "source": {
            "id": "alquiler",
            "name": "SERPAVI 2024 · Mediana del alquiler de vivienda colectiva",
            "publisher": "Ministerio de Vivienda y Agenda Urbana (MIVAU)",
            "url": RENT_URL,
            "license": "Régimen general de reutilización estatal (Real Decreto 1495/2011)",
            "retrieved": retrieved,
            "granularity": "distrito",
        },
        "indicator": {
            "key": "rent_eur_m2",
            "label": "Alquiler",
            "unit": "€/m²",
            "higher_is_better": False,
            "source": "alquiler",
        },
        "values": values,
        "notes": notes,
    }


def main():
    geometry = json.loads((PROCESSED / "barrios.geojson").read_text(encoding="utf-8"))
    prices = fetch_district_prices()
    retrieved = date.fromtimestamp(CACHE.stat().st_mtime).isoformat()
    part = build_rent_part(geometry["features"], prices, retrieved)
    target = PROCESSED / "parts" / "rent.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=target.parent) as directory:
        candidate = Path(directory) / target.name
        candidate.write_text(
            json.dumps(part, ensure_ascii=False, allow_nan=False, indent=2) + "\n",
            encoding="utf-8",
        )
        candidate.replace(target)
    present = sum(value is not None for value in part["values"].values())
    print(f"Built rent for {present}/{len(part['values'])} neighborhoods")


if __name__ == "__main__":
    main()
