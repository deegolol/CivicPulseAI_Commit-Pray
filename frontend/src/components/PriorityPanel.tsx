/**
 * Floating left editorial control panel (T24).
 * Zero percentages: every control uses real units (€/mes, km, µg/m³ NO₂, paradas)
 * and qualitative priority chips translated internally to API weights/filters.
 */
import {
  Building2,
  Compass,
  GraduationCap,
  KeyRound,
  Search,
  Sparkles,
  TrainFront,
  Wind,
} from 'lucide-react';
import type { Campus, HousingType } from '../api/types';
import { APP_NAME, APP_TAGLINE, HOUSING_TYPE_LABELS } from '../config';
import { formatEuro, formatKm } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

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

export const EXAMPLE_QUERIES = [
  'Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio',
  'Voy a la facultad de informática de Montegancedo, busco un estudio para mí solo por menos de 750€',
  'Quiero algo barato y bien comunicado en metro cerca del Campus Sur, máximo 6 km',
];

interface PriorityPanelProps {
  availableKeys: Set<string>;
  query: string;
  onQueryChange: (value: string) => void;
  onQuerySubmit: (queryText: string) => void;
  campuses: Campus[];
  campusId: string;
  onCampusChange: (campusId: string) => void;
  budget: number;
  onBudgetChange: (budget: number) => void;
  housingType: HousingType;
  onHousingTypeChange: (type: HousingType) => void;
  maxDistanceKm: number | null;
  onMaxDistanceChange: (km: number | null) => void;
  airLevel: AirLevelOption;
  onAirLevelChange: (level: AirLevelOption) => void;
  wellConnectedOnly: boolean;
  onWellConnectedChange: (value: boolean) => void;
  onlyWithinBudget: boolean;
  onOnlyWithinBudgetChange: (value: boolean) => void;
  selectedPriorities: string[];
  onTogglePriority: (key: string) => void;
}

export function PriorityPanel({
  availableKeys,
  query,
  onQueryChange,
  onQuerySubmit,
  campuses,
  campusId,
  onCampusChange,
  budget,
  onBudgetChange,
  housingType,
  onHousingTypeChange,
  maxDistanceKm,
  onMaxDistanceChange,
  airLevel,
  onAirLevelChange,
  wellConnectedOnly,
  onWellConnectedChange,
  onlyWithinBudget,
  onOnlyWithinBudgetChange,
  selectedPriorities,
  onTogglePriority,
}: PriorityPanelProps) {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuerySubmit(query.trim());
    }
  };

  return (
    <div className="flex h-full flex-col gap-3.5 overflow-y-auto p-4">
      {/* 1. Brand header */}
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-surface shadow-card">
          <KeyRound className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-xl leading-tight font-semibold tracking-tight text-ink">
            {APP_NAME}
          </h1>
          <p className="text-xs text-muted">{APP_TAGLINE}</p>
        </div>
      </header>

      {/* 2. Natural language search (wired to AI parse in T12; interactive preview now) */}
      <section className="space-y-2.5">
        <form onSubmit={handleFormSubmit} className="relative">
          <Search
            className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Estudio en la ETSISI, tengo 500 € y quiero zona tranquila…"
            aria-label="Describe qué buscas en lenguaje natural"
            className="w-full rounded-xl border border-border bg-surface py-3 pr-10 pl-10 text-sm text-ink placeholder:text-muted/70 transition duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
          />
          <button
            type="submit"
            title="Aplicar búsqueda"
            aria-label="Aplicar búsqueda"
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent transition duration-150 hover:bg-accent hover:text-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                onQueryChange(example);
                onQuerySubmit(example);
              }}
              className="rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] text-muted transition duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* 3. Campus + Budget hero + Housing segmented control */}
      <section className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="campus-select"
            className="flex items-center gap-1.5 text-xs font-medium text-muted"
          >
            <GraduationCap className="h-4 w-4 text-accent" strokeWidth={1.5} />
            Tu campus
          </label>
          <select
            id="campus-select"
            value={campusId}
            onChange={(e) => onCampusChange(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-ink transition duration-150 focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
          >
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget card */}
        <div className="space-y-3 rounded-2xl border border-border bg-canvas p-4">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="budget-slider" className="text-xs font-medium text-muted">
              Presupuesto mensual
            </label>
            <div className="font-serif text-2xl font-semibold text-ink">
              <AnimatedNumber value={budget} formatter={(n) => `${formatEuro(n)}`} />
              <span className="font-sans text-xs font-normal text-muted"> /mes</span>
            </div>
          </div>

          <input
            id="budget-slider"
            type="range"
            min={300}
            max={1200}
            step={25}
            value={budget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            className="editorial-range w-full"
          />
          <div className="flex justify-between text-[11px] text-muted tabular-nums">
            <span>300 €</span>
            <span>750 €</span>
            <span>1.200 €</span>
          </div>

          {/* Segmented housing type */}
          <div
            role="radiogroup"
            aria-label="Tipo de vivienda"
            className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1"
          >
            {(Object.keys(HOUSING_TYPE_LABELS) as HousingType[]).map((type) => {
              const active = housingType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onHousingTypeChange(type)}
                  className={`min-h-[38px] rounded-lg px-2 py-1.5 text-xs font-medium transition duration-150 ease-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                    active
                      ? 'bg-ink text-surface shadow-xs'
                      : 'text-muted hover:bg-surface-subtle hover:text-ink'
                  }`}
                >
                  {HOUSING_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Real-unit constraints (km, NO₂, transit, budget-only) */}
      <section className="space-y-3">
        {/* Distance in km */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="distance-slider"
              className="flex items-center gap-1.5 font-medium text-muted"
            >
              <Compass className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Distancia máxima al campus
            </label>
            <span className="font-medium text-ink tabular-nums">
              {maxDistanceKm === null ? 'Sin límite' : `Hasta ${formatKm(maxDistanceKm)}`}
            </span>
          </div>
          <input
            id="distance-slider"
            type="range"
            min={2}
            max={20}
            step={1}
            value={maxDistanceKm ?? 20}
            onChange={(e) => {
              const val = Number(e.target.value);
              onMaxDistanceChange(val >= 20 ? null : val);
            }}
            className="editorial-range w-full"
          />
          <div className="flex justify-between text-[11px] text-muted tabular-nums">
            <span>2 km</span>
            <span>10 km</span>
            <span>Sin límite</span>
          </div>
        </div>

        {/* Air quality in µg/m³ NO₂ (shown when air_no2 dataset is available) */}
        {availableKeys.has('air_no2') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-muted">
                <Wind className="h-4 w-4 text-accent" strokeWidth={1.5} />
                Calidad del aire (NO₂)
              </span>
              <span className="text-[11px] text-muted">
                {airLevel === 'any'
                  ? 'Cualquiera'
                  : `≤ ${AIR_LEVEL_THRESHOLDS[airLevel]} µg/m³`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'any', label: 'Cualquiera' },
                  { id: 'good', label: 'Buena ≤25' },
                  { id: 'very_good', label: 'Muy buena ≤20' },
                ] as const
              ).map((opt) => {
                const active = airLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onAirLevelChange(opt.id)}
                    className={`min-h-[36px] rounded-lg border px-2 py-1 text-[11px] font-medium transition duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      active
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-border bg-surface text-muted hover:bg-surface-subtle hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean toggles */}
        <div className="grid grid-cols-1 gap-2">
          {availableKeys.has('transit_stops') && (
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2 transition hover:bg-canvas">
              <span className="flex items-center gap-2 text-xs font-medium text-ink">
                <TrainFront className="h-4 w-4 text-accent" strokeWidth={1.5} />
                Bien comunicado en Metro (≥ 1 est./km²)
              </span>
              <input
                type="checkbox"
                checked={wellConnectedOnly}
                onChange={(e) => onWellConnectedChange(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
          )}

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2 transition hover:bg-canvas">
            <span className="flex items-center gap-2 text-xs font-medium text-ink">
              <Building2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Solo zonas dentro de mi presupuesto
            </span>
            <input
              type="checkbox"
              checked={onlyWithinBudget}
              onChange={(e) => onOnlyWithinBudgetChange(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>
        </div>
      </section>

      <hr className="border-border" />

      {/* 5. Qualitative priority chips (ZERO percentages) */}
      <section className="space-y-2.5 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Lo que más me importa</span>
          <span className="text-[11px] text-muted">Elige tus prioridades</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_CHIPS.filter((chip) => availableKeys.has(chip.key)).map((chip) => {
            const active = selectedPriorities.includes(chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                onClick={() => onTogglePriority(chip.key)}
                className={`min-h-[38px] rounded-full border px-3.5 py-1.5 text-xs font-medium transition duration-150 ease-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  active
                    ? 'border-accent bg-accent text-surface shadow-xs'
                    : 'border-border bg-surface text-ink hover:border-accent-border hover:bg-accent-soft'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
