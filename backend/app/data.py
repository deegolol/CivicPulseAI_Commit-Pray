"""Loads the ETL output (data/processed/*) once into memory, falling back to app/mock_data/ while it doesn't exist.

The backend never downloads or modifies data: the DATA lane produces the files, we only read them.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from statistics import mean, median

from .models import Area, Campus, Indicator, Source

REPO_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
MOCK_DIR = Path(__file__).resolve().parent / "mock_data"
REQUIRED_FILES = ("indicators.json", "barrios.geojson", "campuses.json")
SERVICE_COUNTS = re.compile(r"Bibliotecas: (\d+)\. Equipamientos deportivos: (\d+)\.")

# Default priorities shown when the user hasn't chosen any (CONTRACTS §4.2).
DEFAULT_WEIGHTS = {
    "rent_eur_m2": 0.4,
    "distance_km": 0.3,
    "air_no2": 0.1,
    "transit_stops": 0.1,
    "services_count": 0.1,
}


@dataclass(frozen=True)
class Dataset:
    source_dir: str  # "processed" | "mock"
    level: str
    generated_at: str
    sources: list[Source]
    indicators: list[Indicator]
    areas: list[Area]
    campuses: list[Campus]
    geojson: dict
    # campus id → area id → {"transit_min", "car_min", "car_km"} (etl/fetch_travel_times.py); {} if not built
    travel: dict = field(default_factory=dict)
    # district id ("01".."21") → official monthly rents of flats {"median", "p25", "p75", ...} (etl/fetch_rent_monthly.py)
    rents: dict = field(default_factory=dict)
    # area id → official rents of flats in that barrio {"median", "p25", "p75", "eur_m2", ...} (etl/fetch_rent_barrio.py)
    barrio_rents: dict = field(default_factory=dict)

    def area(self, area_id: str) -> Area | None:
        return next((a for a in self.areas if a.id == area_id), None)

    def city_median(self) -> dict[str, float | None]:
        return {i.key: _agg(median, [a.values.get(i.key) for a in self.areas]) for i in self.indicators}

    def district_avg(self, district: str) -> dict[str, float | None]:
        same = [a for a in self.areas if a.district == district]
        return {i.key: _agg(mean, [a.values.get(i.key) for a in same]) for i in self.indicators}


def _agg(fn, values: list[float | None]) -> float | None:
    clean = [v for v in values if v is not None]
    return round(fn(clean), 2) if clean else None


def _pick_dir() -> tuple[Path, str]:
    if all((PROCESSED_DIR / f).exists() for f in REQUIRED_FILES):
        return PROCESSED_DIR, "processed"
    return MOCK_DIR, "mock"


def service_counts(area: Area) -> tuple[int, int] | None:
    """Read the two official counts from the ETL and check against their sum."""
    match = SERVICE_COUNTS.fullmatch(area.notes.get("services_count", ""))
    if match:
        libraries, sports = map(int, match.groups())
        if libraries + sports == area.values.get("services_count"):
            return libraries, sports
    return None


@lru_cache(maxsize=1)
def get_dataset() -> Dataset:
    folder, kind = _pick_dir()
    ind = json.loads((folder / "indicators.json").read_text(encoding="utf-8"))
    indicators = [Indicator(**i) for i in ind.get("indicators", [])]
    areas = [Area(**a) for a in ind.get("areas", [])]
    services = next((indicator for indicator in indicators if indicator.key == "services_count"), None)
    if services:
        counts = [service_counts(area) for area in areas]
        if any(count is not None for count in counts):
            for key, label, index in (
                ("libraries_count", "Bibliotecas", 0),
                ("sports_count", "Deporte municipal", 1),
            ):
                indicators.append(Indicator(key=key, label=label, unit="nº", higher_is_better=True, source=services.source))
                for area, count in zip(areas, counts):
                    area.values[key] = count[index] if count is not None else None
    # Barrio-level official rent (SERPAVI census sections grouped by barrio) replaces the district value when built.
    barrio_rents = _optional_json(folder / "rent_barrio.json").get("areas", {})
    for area in areas:
        own = barrio_rents.get(area.id)
        if own and own.get("eur_m2"):
            area.values["rent_eur_m2"] = own["eur_m2"]
            area.notes["rent_eur_m2"] = f"valor del barrio: {own['sections']} secciones censales, {own['contracts']} contratos (SERPAVI 2024)"
    return Dataset(
        source_dir=kind,
        level=ind.get("level", "barrio"),
        generated_at=ind.get("generated_at", ""),
        sources=[Source(**s) for s in ind.get("sources", [])],
        indicators=indicators,
        areas=areas,
        campuses=[Campus(**c) for c in json.loads((folder / "campuses.json").read_text(encoding="utf-8"))],
        geojson=json.loads((folder / "barrios.geojson").read_text(encoding="utf-8")),
        travel=_optional_json(folder / "travel_times.json").get("campuses", {}),
        rents=_optional_json(folder / "rent_monthly.json").get("districts", {}),
        barrio_rents=barrio_rents,
    )


def _optional_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
