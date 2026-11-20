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
  | 'services_count'
  | 'libraries_count'
  | 'sports_count';

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
  aliases?: string[];
  university?: string | null;
  acronym?: string | null;
  municipality?: string | null;
  has_travel_times?: boolean | null;
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
  max_travel_min?: number | null;
  only_within_budget?: boolean;
  min_budget_eur_month?: number | null;
  max_air_no2?: number | null;
  min_transit_stops?: number | null;
}

export interface ScoreRequest {
  campus_id: string;
  weights: Record<string, number>;
  filters?: ScoreFilters;
  budget_eur_month?: number | null;
  housing_type?: HousingType;
  travel_mode?: TravelMode;
  limit?: number;
}

export type TravelMode = 'transit' | 'car';

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
  /** Real door-to-door minutes: public transport (CRTM timetables) and car without traffic (OSRM). */
  transit_min?: number | null;
  car_min?: number | null;
  travel_min?: number | null;
  /** Only an official published figure (flats: SERPAVI district median), never our estimate. Null for rooms/studios. */
  est_rent_eur_month: number | null;
  rent_median_eur_month?: number | null;
  rent_p25_eur_month?: number | null;
  rent_p75_eur_month?: number | null;
  rent_basis?: string;
  fits_budget: boolean | null;
  affordable_m2: number | null;
  listing_links: ListingLink[];
  breakdown: Record<string, BreakdownItem>;
}

export interface Recommendation {
  area_id: string;
  name: string;
  district: string;
  headline: string;
  reasons: string[];
  caveats: string[];
}

export interface ScoreResponse {
  campus_id: string;
  housing_type?: HousingType;
  reference_m2?: number;
  results: ScoreResultItem[];
  recommendation?: Recommendation | null;
  highlights?: Record<string, string>;
}

export interface AiParseRequest {
  query: string;
}

export interface AiParseResponse {
  campus_id: string;
  campus_candidates?: string[];
  weights: Record<string, number>;
  filters: {
    max_rent_eur_m2: number | null;
    max_distance_km: number | null;
    max_travel_min?: number | null;
    only_within_budget?: boolean | null;
  };
  budget_eur_month: number | null;
  housing_type: HousingType;
  travel_mode?: TravelMode;
  /** false = gibberish or not about finding a place to live: show `interpretation` and don't search. */
  understood?: boolean;
  interpretation: string;
  engine: 'llm' | 'keywords';
}

export interface AiExplainRequest {
  campus_id: string;
  weights: Record<string, number>;
  area_ids: string[];
  query?: string;
  budget_eur_month?: number | null;
  housing_type?: HousingType;
  travel_mode?: TravelMode;
  filters?: ScoreFilters;
}

export interface AiExplainResponse {
  text: string;
  engine: 'llm' | 'keywords';
}
