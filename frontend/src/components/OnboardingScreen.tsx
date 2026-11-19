/** Starts a search with natural language or a focused manual form. */
import { useState } from 'react';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { AccountButton } from './AccountProvider';
import type { Campus, HousingType } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
import {
  EXAMPLE_QUERIES, priorityOptions, TRANSPORT_LABELS, type TransportMode,
} from '../constants/filters';
import { BrandLogo } from './BrandLogo';
import { CampusPicker } from './CampusPicker';

export type SearchReview = {
  query: string;
  inferredFields: Set<string>;
  inferredPriorities: Set<string>;
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
  selectedPriorities: string[];
  onTogglePriority: (key: string) => void;
  onStart: () => void;
}

const DEFAULT_CAMPUSES: Campus[] = [
  { id: 'etsisi', name: 'ETSISI · Campus Sur UPM', coords: [-3.6286, 40.3897] },
  { id: 'etsiinf', name: 'ETSIINF · Campus Montegancedo UPM', coords: [-3.8392, 40.4053] },
];

const inputClass = 'w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-ink';
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-bg transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60';

export function OnboardingScreen({
  query, onQueryChange, onSearchSubmit, searching, searchError, review, onBack, interpretation,
  campuses, campusId, onCampusChange, budget, minBudget, onBudgetChange, onMinBudgetChange,
  housingType, onHousingTypeChange, maxDistanceKm, onMaxDistanceChange, transportMode,
  onTransportModeChange, availableKeys, selectedPriorities, onTogglePriority, onStart,
}: OnboardingScreenProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const options = priorityOptions(availableKeys);
  const remainingOptions = options.filter(({ key }) => !review?.inferredPriorities.has(key));
  const inferredOptions = options.filter(({ key }) =>
    review?.inferredPriorities.has(key) && selectedPriorities.includes(key),
  );
  const needs = (field: string) => !review?.inferredFields.has(field);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-6">
        <BrandLogo />
        <AccountButton />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-12 sm:pt-14">
        <h1 className="font-display text-3xl leading-[1.08] font-bold tracking-tight sm:text-5xl">
          {review ? 'Completa tu búsqueda' : '¿Dónde vas a vivir este curso?'}
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          {review && interpretation
            ? interpretation
            : 'Encuentra barrios de Madrid según tu campus, tu presupuesto y lo que te importa.'}
        </p>

        {!review && (
          <>
            <form
              className="mt-7 overflow-hidden rounded-xl border border-border bg-bg focus-within:border-ink"
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
                  aria-expanded={manualOpen}
                  onClick={() => setManualOpen((current) => !current)}
                  className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
                >
                  Rellenar a mano
                  <ChevronDown size={15} className={manualOpen ? 'rotate-180' : ''} aria-hidden="true" />
                </button>
                <button type="submit" disabled={searching || !query.trim()} className={buttonClass}>
                  <Search size={16} aria-hidden="true" />
                  {searching ? 'Leyendo búsqueda…' : 'Buscar'}
                </button>
              </div>
            </form>
            {!manualOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={searching}
                    onClick={() => {
                      onQueryChange(example);
                      onSearchSubmit(example);
                    }}
                    className="rounded-lg border border-border bg-bg px-3 py-1.5 text-left text-xs text-muted hover:border-ink/40 hover:text-ink disabled:opacity-60"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {searchError && <p role="alert" className="mt-3 text-sm text-over">{searchError}</p>}

        {(manualOpen || review) && (
          <form
            className="mt-6 space-y-5 rounded-xl border border-border bg-bg p-4 sm:p-6"
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
            {!review && <h2 className="font-display text-xl font-bold">Tu búsqueda</h2>}

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
                  <select value={housingType} onChange={(event) => onHousingTypeChange(event.target.value as HousingType)} className={inputClass}>
                    {Object.entries(HOUSING_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
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
                  <select value={transportMode} onChange={(event) => onTransportModeChange(event.target.value as TransportMode)} className={inputClass}>
                    {Object.entries(TRANSPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
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

            {(remainingOptions.length > 0 || inferredOptions.length > 0) && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Qué quieres valorar</legend>
                {inferredOptions.length > 0 && (
                  <p className="text-xs text-muted">Incluido por tu búsqueda · {inferredOptions.map(({ label }) => label).join(', ')}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {remainingOptions.map(({ key, label }) => {
                    const enabled = selectedPriorities.includes(key);
                    return (
                      <button type="button" key={key} aria-pressed={enabled}
                        disabled={enabled && selectedPriorities.length === 1}
                        onClick={() => onTogglePriority(key)}
                        className={'min-h-8 rounded-full border px-3 text-xs font-medium ' + (enabled ? 'border-ink bg-ink text-bg' : 'border-border bg-bg text-ink hover:border-ink/40')}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {formError && <p role="alert" className="text-sm text-over">{formError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {review && <button type="button" onClick={onBack} className="text-sm font-medium text-muted hover:text-ink">Editar mi frase</button>}
              <button type="submit" className={buttonClass + ' ml-auto'}>
                Ver zonas <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
