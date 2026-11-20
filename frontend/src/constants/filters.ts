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
  { key: 'transit_stops', label: 'Metro' },
  { key: 'libraries_count', label: 'Ocio y cultura · bibliotecas' },
  { key: 'sports_count', label: 'Deporte municipal' },
  { key: 'services_count', label: 'Servicios' },
];

export const DEFAULT_PRIORITIES = ['rent_eur_m2', 'distance_km'];

export function priorityOptions(availableKeys: Set<string>) {
  return PRIORITY_CHIPS.filter(({ key }) => availableKeys.has(key)
    && (key !== 'services_count' || (!availableKeys.has('libraries_count') && !availableKeys.has('sports_count'))));
}

/** How the student gets to class: decides which real travel time "Cercanía" uses. */
export const TRANSPORT_LABELS = {
  transit: 'Transporte público',
  car: 'Coche',
};

export type TransportMode = keyof typeof TRANSPORT_LABELS;

/** The sentence we type in the live demo (also the search box placeholder). */
export const DEMO_QUERY = 'Estudio en la ETSISI y busco una habitación por menos de 450 € al mes, a menos de 30 minutos en transporte público';

/** Example chips. The backend keeps a saved AI answer for them in case the AI is down during the demo. */
export const EXAMPLE_QUERIES = [
  DEMO_QUERY,
  'Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio',
  'Voy a la facultad de informática de Montegancedo, busco un estudio para mí solo por menos de 750€',
];
