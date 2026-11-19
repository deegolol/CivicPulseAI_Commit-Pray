"""Asigna a cada barrio el NO₂ medio de la estación municipal más cercana."""

import csv
import json
from collections import defaultdict
from datetime import datetime
from math import cos, isfinite, radians, sin
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import TextIO
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from shapely.geometry import shape

NO2_MAGNITUDE = 8
HOURS = tuple(f"{hour:02d}" for hour in range(1, 25))
YEAR = 2025
ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data/raw"
GEOMETRY = ROOT / "data/processed/barrios.geojson"
OUTPUT = ROOT / "data/processed/parts/air.json"
MAIN_CATALOG = "https://datos.madrid.es/dataset/201200-0-calidad-aire-horario"
STATION_CATALOG = "https://datos.madrid.es/dataset/212629-0-estaciones-control-aire"
HOURLY_RESOURCE = "201200-1-calidad-aire-horario-csv"
STATION_RESOURCE = "212629-0-estaciones-control-aire-csv"


def mean_no2(file: TextIO, year: int) -> dict[int, float]:
    """Agrega las observaciones horarias validadas de cada estación municipal."""
    totals: dict[int, float] = defaultdict(float)
    counts: dict[int, int] = defaultdict(int)
    for row in csv.DictReader(file, delimiter=";"):
        if int(row["ANO"]) != year or int(row["MAGNITUD"]) != NO2_MAGNITUDE:
            continue
        station = int(row["ESTACION"])
        for hour in HOURS:
            if row[f"V{hour}"] != "V":
                continue
            concentration = float(row[f"H{hour}"].replace(",", "."))
            if isfinite(concentration) and concentration >= 0:
                totals[station] += concentration
                counts[station] += 1
    return {station: totals[station] / count for station, count in counts.items()}


def station_locations(file: TextIO) -> dict[int, tuple[str, float, float]]:
    """Lee el nombre y las coordenadas decimales que distribuye el Ayuntamiento."""
    return {
        int(row["CODIGO_CORTO"]): (
            row["ESTACION"],
            float(row["LONGITUD"].replace(",", ".")),
            float(row["LATITUD"].replace(",", ".")),
        )
        for row in csv.DictReader(file, delimiter=";")
        if row["LONGITUD"] and row["LATITUD"]
    }


def distance_key(lon: float, lat: float, other_lon: float, other_lat: float) -> float:
    """Devuelve el término de Haversine que basta para ordenar por distancia."""
    return (
        sin(radians(other_lat - lat) / 2) ** 2
        + cos(radians(lat)) * cos(radians(other_lat))
        * sin(radians(other_lon - lon) / 2) ** 2
    )


def build_part(
    features: list[dict],
    means: dict[int, float],
    stations: dict[int, tuple[str, float, float]],
    source: dict,
    year: int,
) -> dict:
    """Construye la pieza del contrato con un valor y una nota por barrio."""
    available = sorted(means.keys() & stations.keys())
    if not available:
        raise ValueError("No hay estaciones con coordenadas y mediciones válidas de NO₂.")

    values = {}
    notes = {}
    for feature in features:
        area_id = feature["properties"]["id"]
        centroid = shape(feature["geometry"]).centroid
        station = min(
            available,
            key=lambda station_id: distance_key(
                centroid.x, centroid.y, *stations[station_id][1:]
            ),
        )
        values[area_id] = round(means[station], 1)
        name = stations[station][0]
        notes[area_id] = f"Media de {year} medida en {name}, la estación más cercana al centroide."

    return {
        "source": source,
        "indicator": {
            "key": "air_no2",
            "label": "Calidad del aire",
            "unit": "µg/m³ NO₂",
            "higher_is_better": False,
            "source": source["id"],
        },
        "values": values,
        "notes": notes,
    }


def write_atomic(path: Path, content: bytes) -> None:
    """Sustituye el fichero solo después de escribir todo el contenido."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
        try:
            temporary.write(content)
            temporary.close()
            temporary_path.replace(path)
        finally:
            temporary_path.unlink(missing_ok=True)


def source_file(catalog: str, resource: str, first_field: str) -> Path:
    """Usa el CSV en data/raw o lo descarga del catálogo municipal."""
    filename = f"{resource}.csv"
    path = RAW_DIR / filename
    if not path.is_file():
        with urlopen(f"{catalog}/resource/{resource}/download/{filename}", timeout=45) as response:
            content = response.read()
        header = content.split(b"\n", 1)[0].decode("utf-8-sig")
        if header.split(";", 1)[0].strip('"') != first_field:
            raise ValueError(f"Cabecera inesperada en la descarga municipal {filename}.")
        write_atomic(path, content)
    return path


def main() -> None:
    features = json.loads(GEOMETRY.read_text(encoding="utf-8"))["features"]
    try:
        hourly = source_file(MAIN_CATALOG, HOURLY_RESOURCE, "PROVINCIA")
        station_file = source_file(STATION_CATALOG, STATION_RESOURCE, "CODIGO")
    except OSError as error:
        if OUTPUT.is_file():
            saved = json.loads(OUTPUT.read_text(encoding="utf-8"))
            if saved["values"].keys() == {feature["properties"]["id"] for feature in features}:
                print(f"Descarga no disponible ({error}). Se conserva {OUTPUT.relative_to(ROOT)}.")
                return
        raise

    with hourly.open(encoding="utf-8-sig", newline="") as file:
        means = mean_no2(file, YEAR)
    with station_file.open(encoding="utf-8-sig", newline="") as file:
        stations = station_locations(file)
    retrieved = datetime.fromtimestamp(hourly.stat().st_mtime, ZoneInfo("Europe/Madrid"))
    source = {
        "id": "aire",
        "name": "Calidad del aire. Datos horarios desde 2001",
        "publisher": "Ayuntamiento de Madrid",
        "url": MAIN_CATALOG,
        "license": "CC BY 4.0",
        "retrieved": retrieved.date().isoformat(),
        "granularity": "estación",
    }
    part = build_part(features, means, stations, source, YEAR)
    content = json.dumps(part, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    write_atomic(OUTPUT, content.encode("utf-8"))
    print(f"{len(part['values'])} barrios con NO₂ medio de {YEAR} en {OUTPUT.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
