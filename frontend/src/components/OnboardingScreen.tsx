/** Starts a search with natural language or a focused manual form. */
import { useState } from 'react';
import { ArrowRight, ChevronDown, CornerDownLeft, Search } from 'lucide-react';
import type { Campus, HousingType } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
import {
  EXAMPLE_QUERIES, TRANSPORT_LABELS, type TransportMode,
} from '../constants/filters';
import { AccountButton } from './AccountProvider';
import { BrandLogo } from './BrandLogo';
import { CampusPicker } from './CampusPicker';
import { PreferenceControls } from './PreferenceControls';

export type SearchReview = {
  query: string;
  inferredFields: Set<string>;
};

interface OnboardingScreenProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit: (query: string) => void;
  searching: boolean;
  searchError: string | null;
  review: SearchReview | null;
  onBack: () => void;
  interpretation: string | null;
  campuses: Campus[];
  campusId: string;
  onCampusChange: (id: string) => void;
  budget: number;
  minBudget: number | null;
  onBudgetChange: (value: number) => void;
  onMinBudgetChange: (value: number | null) => void;
  housingType: HousingType;
  onHousingTypeChange: (type: HousingType) => void;
  maxDistanceKm: number | null;
  onMaxDistanceChange: (value: number | null) => void;
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
  availableKeys: Set<string>;
  priorityWeights: Record<string, number>;
  onPriorityChange: (key: string, weight: number) => void;
  onStart: () => void;
}

const DEFAULT_CAMPUSES: Campus[] = [
  { id: 'etsisi', name: 'ETSISI · Campus Sur UPM', coords: [-3.6286, 40.3897] },
  { id: 'etsiinf', name: 'ETSIINF · Campus Montegancedo UPM', coords: [-3.8392, 40.4053] },
];

const inputClass = 'block h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm font-normal outline-none focus:border-ink';
const selectClass = inputClass + ' appearance-none pr-9';
const exampleLabels = ['Habitación y aire limpio', 'Un estudio en Montegancedo', 'Cerca del metro'];
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-bg transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60';

export function OnboardingScreen({
  query, onQueryChange, onSearchSubmit, searching, searchError, review, onBack, interpretation,
  campuses, campusId, onCampusChange, budget, minBudget, onBudgetChange, onMinBudgetChange,
  housingType, onHousingTypeChange, maxDistanceKm, onMaxDistanceChange, transportMode,
  onTransportModeChange, availableKeys, priorityWeights, onPriorityChange, onStart,
}: OnboardingScreenProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const needs = (field: string) => !review?.inferredFields.has(field);
  const showIntro = !review && !manualOpen;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-clip bg-bg text-ink">
      {showIntro && <img src="/plano-portada.png" alt="" className="onboarding-map" />}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-6 sm:px-9">
        <BrandLogo />
        <AccountButton />
      </header>

      <main className={`mx-auto w-full max-w-6xl flex-1 px-5 sm:px-9 ${
        showIntro ? 'flex flex-col justify-center py-8 sm:py-12' : 'pt-9 pb-16 lg:pt-20'
      }`}>
        <div className="mx-auto w-full max-w-[39rem]">
          <h1 className="text-center font-display text-3xl leading-[1.08] font-bold tracking-tight sm:text-5xl">
            {review ? 'Completa tu búsqueda' : manualOpen ? 'Configura tu búsqueda' : '¿Dónde vas a vivir este curso?'}
          </h1>
          <p className="mt-3 text-center text-sm text-muted sm:text-base">
            {review && interpretation
              ? interpretation
              : 'Encuentra barrios de Madrid según tu campus, tu presupuesto y lo que te importa.'}
          </p>

          {showIntro && (
            <div className="mt-7">
              <form
                className="overflow-hidden rounded-2xl border border-border bg-bg shadow-[0_12px_36px_#2637250d] focus-within:border-ink"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (query.trim()) onSearchSubmit(query.trim());
                }}
              >
                <label htmlFor="onboarding-search" className="sr-only">Cuéntanos qué buscas</label>
                <textarea
                  id="onboarding-search"
                  rows={4}
                  maxLength={500}
                  required
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Busco habitación cerca de Montegancedo, entre 350 y 600 € al mes, y quiero poder ir al gimnasio…"
                  className="block min-h-32 w-full resize-y px-4 pt-4 pb-2 text-base leading-relaxed outline-none placeholder:text-muted/80 sm:px-5"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2 pb-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
                  >
                    Rellenar a mano
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                  <button type="submit" disabled={searching || !query.trim()} className={buttonClass}>
                    <Search size={16} aria-hidden="true" />
                    {searching ? 'Leyendo búsqueda…' : 'Buscar'}
                  </button>
                </div>
              </form>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:justify-center">
                {EXAMPLE_QUERIES.map((example, index) => (
                  <button
                    key={example}
                    type="button"
                    disabled={searching}
                    onClick={() => {
                      onQueryChange(example);
                      onSearchSubmit(example);
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1.5 text-left text-xs font-medium text-muted hover:border-ink/40 hover:text-ink disabled:opacity-60"
                  >
                    <CornerDownLeft size={12} aria-hidden="true" />
                    {exampleLabels[index] ?? example}
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchError && <p role="alert" className="mt-3 text-sm text-over">{searchError}</p>}

          {(manualOpen || review) && (
            <form
              className="mt-6 space-y-5 rounded-2xl border border-border bg-bg p-4 shadow-[0_12px_36px_#2637250d] sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (!campusId) {
                  setFormError('Elige un campus de las sugerencias.');
                  return;
                }
                if (budget <= 0 || (minBudget !== null && minBudget > budget)) {
                  setFormError('El máximo debe ser positivo y al menos igual al mínimo.');
                  return;
                }
                setFormError(null);
                onStart();
              }}
            >
              {needs('campus') && (
                <CampusPicker campuses={campuses.length ? campuses : DEFAULT_CAMPUSES} campusId={campusId} onChange={onCampusChange} />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {needs('budget') && (
                  <fieldset className="space-y-1.5 sm:col-span-2">
                    <legend className="text-sm font-semibold">Presupuesto mensual (€)</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted">
                        Desde
                        <input type="number" min="0" step="1" inputMode="numeric" placeholder="Sin mínimo"
                          value={minBudget ?? ''} onChange={(event) => onMinBudgetChange(event.target.value ? Number(event.target.value) : null)}
                          className={inputClass + ' mt-1 text-ink'} />
                      </label>
                      <label className="text-xs text-muted">
                        Hasta
                        <input type="number" min="1" step="1" required inputMode="numeric"
                          value={budget || ''} onChange={(event) => onBudgetChange(Number(event.target.value))}
                          className={inputClass + ' mt-1 text-ink'} />
                      </label>
                    </div>
                  </fieldset>
                )}
                {needs('housing') && (
                  <label className="space-y-1.5 text-sm font-semibold">
                    <span>Tipo de vivienda</span>
                    <span className="relative block">
                      <select value={housingType} onChange={(event) => onHousingTypeChange(event.target.value as HousingType)} className={selectClass}>
                        {Object.entries(HOUSING_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute top-3.5 right-3 text-muted" aria-hidden="true" />
                    </span>
                  </label>
                )}
                {needs('distance') && (
                  <label className="space-y-1.5 text-sm font-semibold">
                    <span>Radio máximo (km)</span>
                    <input type="number" min="0.5" max="60" step="any" inputMode="decimal" placeholder="Sin límite"
                      value={maxDistanceKm ?? ''}
                      onChange={(event) => onMaxDistanceChange(event.target.value ? Number(event.target.value) : null)}
                      className={inputClass} />
                  </label>
                )}
                {needs('transport') && (
                  <label className="space-y-1.5 text-sm font-semibold">
                    <span>Cómo te desplazas</span>
                    <span className="relative block">
                      <select value={transportMode} onChange={(event) => onTransportModeChange(event.target.value as TransportMode)} className={selectClass}>
                        {Object.entries(TRANSPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute top-3.5 right-3 text-muted" aria-hidden="true" />
                    </span>
                  </label>
                )}
              </div>
              {transportMode !== 'any' && (
                <p className="text-xs text-muted">
                  {transportMode === 'metro'
                    ? 'Para Metro usamos la densidad de estaciones.'
                    : 'El radio se mide en línea recta. Los trayectos reales pueden variar.'}
                </p>
              )}

              <PreferenceControls availableKeys={availableKeys} weights={priorityWeights} onChange={onPriorityChange} />

              {formError && <p role="alert" className="text-sm text-over">{formError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={review ? onBack : () => setManualOpen(false)} className="text-sm font-medium text-muted hover:text-ink">
                  {review ? 'Editar mi frase' : 'Buscar con una frase'}
                </button>
                <button type="submit" className={buttonClass + ' ml-auto'}>
                  Ver zonas <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
