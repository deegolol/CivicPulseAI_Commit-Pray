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
    aliases: list[str] = Field(default_factory=list)


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
    llm: bool = False  # AI layer configured
    llm_calls_today: int = 0


# ---------- POST /api/score (CONTRACTS §4.6) ----------
HousingType = Literal["room", "studio", "flat"]


class ScoreFilters(BaseModel):
    max_rent_eur_m2: float | None = None
    max_distance_km: float | None = None
    only_within_budget: bool = False
    min_budget_eur_month: float | None = Field(default=None, ge=0)
    max_air_no2: float | None = Field(default=None, ge=0)
    min_transit_stops: float | None = Field(default=None, ge=0)


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


class Recommendation(BaseModel):
    """The single best option for this user and why (T27). Reasons only use real numbers."""
    area_id: str
    name: str
    district: str
    headline: str
    reasons: list[str]
    caveats: list[str] = Field(default_factory=list)  # honest trade-offs ("a tener en cuenta")


class ScoreResponse(BaseModel):
    campus_id: str
    housing_type: HousingType
    reference_m2: int
    results: list[ScoreResult]
    recommendation: Recommendation | None = None  # None when every area is excluded
    highlights: dict[str, str] = Field(default_factory=dict)  # cheapest | closest | cleanest_air | best_transit → area id


# ---------- /api/ai (CONTRACTS §4.7–4.8) ----------
class AiParseRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


class AiParseResponse(BaseModel):
    campus_id: str
    weights: dict[str, float]
    filters: ScoreFilters
    budget_eur_month: float | None
    housing_type: HousingType
    interpretation: str
    engine: Literal["llm", "keywords"]


class AiExplainRequest(BaseModel):
    campus_id: str
    weights: dict[str, float] = Field(default_factory=dict)
    area_ids: list[str] = Field(min_length=1, max_length=5)
    query: str | None = None
    budget_eur_month: float | None = Field(default=None, gt=0)
    housing_type: HousingType = "room"
    filters: ScoreFilters = Field(default_factory=ScoreFilters)


class AiExplainResponse(BaseModel):
    text: str
    engine: Literal["llm", "keywords"]
