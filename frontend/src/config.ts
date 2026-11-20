/**
 * Central brand and app configuration.
 * The product name is defined ONLY here (see DECISIONS.md D-13).
 */
export const APP_NAME = 'PrimeraLlave';
export const APP_TAGLINE = 'Tu primera llave en Madrid';
export const APP_SUBTITLE =
  'Encuentra dónde buscar piso según tu campus, presupuesto y prioridades con datos abiertos oficiales.';

export const MADRID_CENTER: [number, number] = [40.405, -3.688];
export const MADRID_DEFAULT_ZOOM = 12;

export const HOUSING_TYPE_LABELS = {
  room: 'Habitación',
  studio: 'Estudio',
  flat: 'Piso',
} as const;

export const HOUSING_REFERENCE_M2 = {
  room: 25,
  studio: 35,
  flat: 60,
} as const;

/** Budget slider's last stop: no price limit (sent to the API as null, portals open without maxPrice). */
export const NO_BUDGET_LIMIT = 100000;
