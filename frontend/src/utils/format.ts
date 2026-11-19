/**
 * Spanish number formatting and qualitative fit-level helpers.
 * Ensures zero raw percentages or bare 0-100 scores appear in the UI (T24).
 */

const intFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

const decFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEuro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato';
  return `${intFormatter.format(Math.round(value))} €`;
}

export function formatEuroPerM2(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato';
  return `${decFormatter.format(value)} €/m²`;
}

export function formatKm(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato';
  return `${decFormatter.format(value)} km`;
}

export function formatMinutes(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato';
  return `${intFormatter.format(Math.round(value))} min`;
}

export function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato';
  return decFormatter.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato';
  return intFormatter.format(Math.round(value));
}

export type FitLevel = 'alto' | 'medio' | 'bajo' | 'excluido';

export function getFitLevel(score: number, excluded: boolean): FitLevel {
  if (excluded) return 'excluido';
  if (score >= 70) return 'alto';
  if (score >= 52) return 'medio';
  return 'bajo';
}

export function getFitLabel(level: FitLevel): string {
  switch (level) {
    case 'alto':
      return 'Encaje alto';
    case 'medio':
      return 'Encaje medio';
    case 'bajo':
      return 'Encaje bajo';
    case 'excluido':
      return 'Fuera de filtros';
  }
}

export function getAirQualityLabel(no2: number | null | undefined): string {
  if (no2 == null) return 'Sin dato';
  if (no2 <= 25) return 'Muy buena';
  if (no2 <= 30) return 'Buena';
  if (no2 <= 40) return 'Aceptable';
  return 'Mejorable';
}
