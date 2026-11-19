"""Cuenta bibliotecas públicas y equipamientos deportivos municipales por barrio."""

import csv
from io import StringIO
from math import isfinite

from shapely.geometry import Point

from fetch_transit import PARTS_DIR, count_by_area, keep_snapshot, load_areas, load_source, save_part

OUTPUT = PARTS_DIR / "services.json"
LIBRARIES = "https://datos.madrid.es/dataset/201747-0-bibliobuses-bibliotecas"
SPORTS = "https://datos.madrid.es/dataset/200186-0-polideportivos"


def equipment_points(content):
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("cp1252")

    rows = csv.DictReader(StringIO(text, newline=""), delimiter=";")
    if not {"PK", "LATITUD", "LONGITUD"} <= set(rows.fieldnames or ()):
        raise ValueError("El catálogo municipal no devolvió el CSV de equipamientos esperado.")

    points = {}
    for row in rows:
        if not row["PK"] or not row["LONGITUD"] or not row["LATITUD"]:
            continue
        lon = float(row["LONGITUD"].replace(",", "."))
        lat = float(row["LATITUD"].replace(",", "."))
        if isfinite(lon) and isfinite(lat):
            points[row["PK"]] = Point(lon, lat)
    if not points:
        raise ValueError("El catálogo municipal no devolvió equipamientos con coordenadas.")
    return points.values()


def load_equipment(catalog, resource):
    filename = f"{resource}.csv"
    url = f"{catalog}/resource/{resource}/download/{filename}"
    return load_source(filename, url, equipment_points)


def main():
    areas = load_areas()
    try:
        libraries, libraries_date = load_equipment(LIBRARIES, "201747-1-bibliobuses-bibliotecas-csv")
        sports, sports_date = load_equipment(SPORTS, "200186-0-polideportivos-csv")
    except OSError as error:
        if keep_snapshot(OUTPUT, areas, error):
            return
        raise

    library_counts = count_by_area(areas, libraries)
    sports_counts = count_by_area(areas, sports)
    values = {area_id: library_counts[area_id] + sports_counts[area_id] for area_id in areas}
    notes = {
        area_id: f"Bibliotecas: {library_counts[area_id]}. Equipamientos deportivos: {sports_counts[area_id]}."
        for area_id in areas
    }
    source = {
        "id": "servicios",
        "name": "Bibliotecas de Madrid y centros deportivos municipales",
        "publisher": "Ayuntamiento de Madrid",
        "url": LIBRARIES,
        "license": "CC BY 4.0",
        "retrieved": max(libraries_date, sports_date),
        "granularity": "equipamiento",
    }
    indicator = {
        "key": "services_count",
        "label": "Servicios",
        "unit": "nº",
        "higher_is_better": True,
        "source": "servicios",
    }
    save_part(OUTPUT, source, indicator, values, notes)
    print(
        f"{len(areas)} barrios con recuento de equipamientos. "
        f"{sum(library_counts.values())} bibliotecas y {sum(sports_counts.values())} deportivos."
    )


if __name__ == "__main__":
    main()
