/**
 * TypeScript contract matching coordination/CONTRACTS.md §3–4.
 * Shared across API client, mock layer, and UI components.
 */
import type { Feature, FeatureCollection, Geometry } from 'geojson';

export type HousingType = 'room' | 'studio' | 'flat';

export type IndicatorKey =
  | 'rent_eur_m2'
  | 'distance_km'
  | 'air_no2'
  | 'transit_stops'
  | 'services_count';

export interface SourceInfo {
  id: string;
  name: string;
  publisher: string;
  url: string;
  license: string;
  retrieved: string;
  granularity: string;
}

export interface IndicatorMeta {
  key: string;
  label: string;
  unit: string;
  higher_is_better: boolean;
  source: string;
}

export interface Campus {
  id: string;
  name: string;
  /** [lon, lat] */
  coords: [number, number];
}

export interface AreaFeatureProperties {
  id: string;
  name: string;
  district_id: string;
  district: string;
}

export type AreaFeature = Feature<Geometry, AreaFeatureProperties>;
export type BarriosGeoJSON = FeatureCollection<Geometry, AreaFeatureProperties>;

export interface AreaRecord {
  id: string;
  name: string;
  district: string;
  /** [lon, lat] */
  centroid: [number, number];
  values: Record<string, number | null>;
  notes?: Record<string, string>;
}

export interface AreasResponse {
  areas: AreaRecord[];
}

export interface AreaDetailResponse extends AreaRecord {
  district_avg: Record<string, number | null>;
  city_median: Record<string, number | null>;
}

export interface MetaResponse {
  level: string;
  generated_at: string;
  is_mock?: boolean;
  indicators: IndicatorMeta[];
  sources: SourceInfo[];
  campuses: Campus[];
  defaults: {
    campus_id: string;
    weights: Record<string, number>;
  };
}

export interface ScoreFilters {
  max_rent_eur_m2?: number | null;
  max_distance_km?: number | null;
  only_within_budget?: boolean;
}

export interface ScoreRequest {
  campus_id: string;
  weights: Record<string, number>;
  filters?: ScoreFilters;
  budget_eur_month?: number | null;
  housing_type?: HousingType;
  limit?: number;
}

export interface ListingLink {
  label: string;
  url: string;
}

export interface BreakdownItem {
  value: number | null;
  normalized: number;
  weight: number;
  contribution: number;
}

export interface ScoreResultItem {
  id: string;
  name: string;
  district: string;
  rank: number;
  score: number;
  excluded: boolean;
  distance_km: number;
  est_rent_eur_month: number | null;
  fits_budget: boolean | null;
  affordable_m2: number | null;
  listing_links: ListingLink[];
  breakdown: Record<string, BreakdownItem>;
}

export interface ScoreResponse {
  campus_id: string;
  housing_type?: HousingType;
  reference_m2?: number;
  results: ScoreResultItem[];
}

export interface AiParseRequest {
  query: string;
}

export interface AiParseResponse {
  campus_id: string;
  weights: Record<string, number>;
  filters: {
    max_rent_eur_m2: number | null;
    max_distance_km: number | null;
  };
  budget_eur_month: number | null;
  housing_type: HousingType;
  interpretation: string;
  engine: 'llm' | 'keywords';
}

export interface AiExplainRequest {
  campus_id: string;
  weights: Record<string, number>;
  area_ids: string[];
  query?: string;
}

export interface AiExplainResponse {
  text: string;
  engine: 'llm' | 'keywords';
}
