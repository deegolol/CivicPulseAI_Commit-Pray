/**
 * Shared filter constants, thresholds calibrated to real Madrid data, and cached pitch queries.
 */

export type AirLevelOption = 'any' | 'good' | 'very_good';

/** Calibrated to real Madrid NO₂ distribution (9.4–31.7 µg/m³, median 23.4) */
export const AIR_LEVEL_THRESHOLDS: Record<AirLevelOption, number | null> = {
  any: null,
  good: 25,
  very_good: 20,
};

/** Calibrated to real CRTM Metro station density (0–8.17 est./km², median 0.79) */
export const WELL_CONNECTED_THRESHOLD = 1.0;

export interface PriorityOption {
  key: string;
  label: string;
}

export const PRIORITY_CHIPS: PriorityOption[] = [
  { key: 'rent_eur_m2', label: 'Precio' },
  { key: 'distance_km', label: 'Cercanía' },
  { key: 'air_no2', label: 'Aire limpio' },
  { key: 'transit_stops', label: 'Transporte' },
  { key: 'services_count', label: 'Servicios' },
];

/** Exact 3 demo queries cached on backend DEMO_CACHE for instant response */
export const EXAMPLE_QUERIES = [
  'Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio',
  'Voy a la facultad de informática de Montegancedo, busco un estudio para mí solo por menos de 750€',
  'Quiero algo barato y bien comunicado en metro cerca del Campus Sur, máximo 6 km',
];
