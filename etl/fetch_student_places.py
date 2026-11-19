"""Prepare the map's small offline snapshot of municipal student amenities."""

import csv
import json
from io import StringIO
from pathlib import Path

from fetch_air import write_atomic
from fetch_services import LIBRARIES, SPORTS
from fetch_transit import load_source

OUTPUT = Path(__file__).resolve().parents[1] / "frontend/src/data/studentPlaces.json"
PARKS = [
    ("Parque de El Retiro", -3.684500, 40.415260),
    ("Casa de Campo", -3.752689, 40.425323),
    ("Madrid Río", -3.714752, 40.398595),
    ("Parque del Oeste", -3.728164, 40.431796),
    ("Parque de El Capricho", -3.600228, 40.454396),
    ("Parque Juan Carlos I", -3.605616, 40.461619),
]


def place(kind, name, lon, lat):
    return {"kind": kind, "name": name, "coords": [round(lat, 6), round(lon, 6)]}


def read_places(content, kind):
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("cp1252")
    rows = csv.DictReader(StringIO(text, newline=""), delimiter=";")
    places = {}
    for row in rows:
        if not all(row[key] for key in ("PK", "NOMBRE", "LONGITUD", "LATITUD")):
            continue
        lon = float(row["LONGITUD"].replace(",", "."))
        lat = float(row["LATITUD"].replace(",", "."))
        if -3.95 < lon < -3.45 and 40.28 < lat < 40.65:
            subtype = row["TIPO"].rsplit("/", 1)[-1]
            category = "gym" if subtype in {"SalaMusculacion", "CuboGym", "SalaCiclo"} else kind
            places[row["PK"]] = place(category, row["NOMBRE"].strip(), lon, lat)
    if not places:
        raise ValueError("No hay equipamientos con coordenadas en el catálogo municipal.")
    return list(places.values())


def main():
    places = [place("park", name, lon, lat) for name, lon, lat in PARKS]
    for catalog, resource, kind in [
        (LIBRARIES, "201747-1-bibliobuses-bibliotecas-csv", "library"),
        (SPORTS, "200186-0-polideportivos-csv", "sport"),
    ]:
        filename = f"{resource}.csv"
        url = f"{catalog}/resource/{resource}/download/{filename}"
        records, _ = load_source(filename, url, lambda content: read_places(content, kind))
        places.extend(records)
    write_atomic(OUTPUT, (json.dumps(places, ensure_ascii=False, indent=2) + "\n").encode())


if __name__ == "__main__":
    main()
