"""Pydantic schemas that mirror coordination/CONTRACTS.md §3–4. Field names here ARE the contract."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Source(BaseModel):
    id: str
    name: str
    publisher: str = ""
    url: str = ""
    license: str = ""
    retrieved: str = ""
    granularity: str = ""


class Indicator(BaseModel):
    key: str
    label: str
    unit: str
    higher_is_better: bool
    source: str


class Campus(BaseModel):
    id: str
    name: str
    coords: tuple[float, float]  # [lon, lat]


class Area(BaseModel):
    id: str
    name: str
    district: str
    centroid: tuple[float, float]  # [lon, lat]
    values: dict[str, float | None]
    notes: dict[str, str] = Field(default_factory=dict)


class AreaDetail(Area):
    district_avg: dict[str, float | None]
    city_median: dict[str, float | None]


class Defaults(BaseModel):
    campus_id: str
    weights: dict[str, float]


class Meta(BaseModel):
    level: str
    generated_at: str
    indicators: list[Indicator]
    sources: list[Source]
    campuses: list[Campus]
    defaults: Defaults
    is_mock: bool = False  # true while data/processed/ is not built yet


class AreasResponse(BaseModel):
    areas: list[Area]


class Health(BaseModel):
    status: str
    data: str  # "processed" | "mock"


# ---------- POST /api/score (CONTRACTS §4.6) ----------
HousingType = Literal["room", "studio", "flat"]


class ScoreFilters(BaseModel):
    max_rent_eur_m2: float | None = None
    max_distance_km: float | None = None
    only_within_budget: bool = False


class ScoreRequest(BaseModel):
    campus_id: str
    weights: dict[str, float] = Field(default_factory=dict)
    filters: ScoreFilters = Field(default_factory=ScoreFilters)
    budget_eur_month: float | None = Field(default=None, gt=0)
    housing_type: HousingType = "room"
    limit: int = Field(default=500, ge=1, le=500)


class BreakdownItem(BaseModel):
    value: float | None  # real value of the indicator (None = no data, scored as the city median)
    normalized: float  # 0..1, 1 = best
    weight: float  # renormalized, all weights sum 1
    contribution: float  # normalized × weight × 100


class ListingLink(BaseModel):
    label: str
    url: str


class ScoreResult(BaseModel):
    id: str
    name: str
    district: str
    rank: int
    score: float  # 0..100
    excluded: bool
    distance_km: float
    est_rent_eur_month: int | None
    fits_budget: bool | None
    affordable_m2: float | None
    listing_links: list[ListingLink] = Field(default_factory=list)
    breakdown: dict[str, BreakdownItem]


class ScoreResponse(BaseModel):
    campus_id: str
    housing_type: HousingType
    reference_m2: int
    results: list[ScoreResult]
