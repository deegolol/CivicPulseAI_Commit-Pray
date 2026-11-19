/**
 * Start screen (T29): search with a sentence, or choose the basics yourself.
 * The manual form is two columns so it fits a laptop screen without scrolling, and switching
 * between both modes animates instead of popping in. A back button sits in the header.
 */
import { useState } from 'react';
import {
  ArrowRight, BookOpen, Check, CornerDownLeft, Dumbbell, Euro, MapPin, Search, SlidersHorizontal, TrainFront, Wind,
  type LucideIcon,
} from 'lucide-react';
import type { Campus, HousingType, SourceInfo } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
import { EXAMPLE_QUERIES, priorityOptions, type TransportMode } from '../constants/filters';
import { CampusPicker } from './CampusPicker';
import { SiteHeader } from './SiteHeader';

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
  view: 'phrase' | 'form';
  onOpenForm: () => void;
  onBack: () => void;
  onHome: () => void;
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
  sources: SourceInfo[];
}

const DEFAULT_CAMPUSES: Campus[] = [
  { id: 'etsisi', name: 'ETSISI · Campus Sur UPM', coords: [-3.6286, 40.3897] },
  { id: 'etsiinf', name: 'ETSIINF · Campus Montegancedo UPM', coords: [-3.8392, 40.4053] },
];
const EXAMPLE_LABELS = ['Habitación y aire limpio', 'Un estudio en Montegancedo', 'Barato y cerca del metro'];
const PRIORITY_META: Record<string, { icon: LucideIcon; hint: string }> = {
  rent_eur_m2: { icon: Euro, hint: 'Alquiler más bajo' },
  distance_km: { icon: MapPin, hint: 'Cerca de tu campus' },
  air_no2: { icon: Wind, hint: 'Menos contaminación' },
  transit_stops: { icon: TrainFront, hint: 'Más estaciones de metro' },
  libraries_count: { icon: BookOpen, hint: 'Bibliotecas cerca' },
  sports_count: { icon: Dumbbell, hint: 'Polideportivos cerca' },
  services_count: { icon: BookOpen, hint: 'Bibliotecas y deporte' },
};
const BUDGET_MIN = 200;
const BUDGET_MAX = 1500;
const KM_MAX = 20; // the slider's last step means "sin límite"
const primaryButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-bg transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60';
const labelClass = 'text-sm font-semibold text-ink';

export function OnboardingScreen({
  query, onQueryChange, onSearchSubmit, searching, searchError, review, view, onOpenForm, onBack, onHome, interpretation,
  campuses, campusId, onCampusChange, budget, onBudgetChange, housingType, onHousingTypeChange,
  maxDistanceKm, onMaxDistanceChange, availableKeys, priorityWeights, onPriorityChange, onStart, sources,
}: OnboardingScreenProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const showForm = view === 'form';
  const needs = (field: string) => !review?.inferredFields.has(field);
  const options = priorityOptions(availableKeys);
  const activeCount = options.filter(({ key }) => (priorityWeights[key] ?? 0) > 0).length;
  const kmValue = maxDistanceKm === null ? KM_MAX : Math.min(KM_MAX - 1, Math.round(maxDistanceKm));

  const goBack = () => { setFormError(null); onBack(); };
  const goHome = () => { setFormError(null); onHome(); };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <SiteHeader onBack={showForm ? goBack : undefined} onHome={goHome} sources={sources} />

      {!showForm ? (
        <main key="phrase" className="animate-fade-up mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pt-10 pb-12 sm:pt-16">
          <h1 className="relative z-10 text-center font-display text-4xl leading-[1.05] font-bold tracking-tight sm:whitespace-nowrap sm:text-6xl">
            Encuentra tu sitio en Madrid
          </h1>
          <p className="relative z-10 mx-auto mt-4 max-w-2xl text-center text-base text-muted sm:text-lg">
            Dinos dónde estudias y cuánto puedes pagar: te recomendamos zonas con datos oficiales y te llevamos a los pisos.
          </p>

          <div className="relative isolate mt-8">
            <img src="/madrid-ilustracion.png" alt="" width="1300" height="667"
              className="pointer-events-none absolute top-[72%] left-1/2 -z-10 h-auto w-[115%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-60 select-none sm:top-[95%] sm:w-[130%] sm:opacity-80" />
            <form
              className="mx-auto max-w-3xl rounded-2xl border border-border bg-bg shadow-[0_16px_40px_-12px_rgb(13_17_23/0.18)] transition focus-within:border-ink"
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim()) onSearchSubmit(query.trim());
              }}
            >
              <label htmlFor="onboarding-search" className="sr-only">Cuéntanos qué buscas</label>
              <textarea
                id="onboarding-search"
                rows={3}
                maxLength={500}
                required
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (query.trim()) onSearchSubmit(query.trim());
                  }
                }}
                placeholder="Ej.: estudio en la ETSISI, tengo 500 € al mes y quiero una zona tranquila con aire limpio"
                className="block w-full resize-none rounded-t-2xl px-5 pt-5 pb-2 text-base leading-relaxed outline-none placeholder:text-muted/70 sm:text-lg"
              />
              <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-4 sm:px-5">
                <button
                  type="button"
                  onClick={onOpenForm}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink"
                >
                  <SlidersHorizontal size={15} aria-hidden="true" />
                  Prefiero elegirlo yo
                </button>
                <button type="submit" disabled={searching || !query.trim()} className={primaryButton + ' min-h-11 px-5 text-sm'}>
                  <Search size={16} aria-hidden="true" />
                  {searching ? 'Entendiendo…' : 'Buscar'}
                </button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.map((example, index) => (
                <button
                  key={example}
                  type="button"
                  disabled={searching}
                  title={example}
                  onClick={() => { onQueryChange(example); onSearchSubmit(example); }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg/90 px-3.5 py-1.5 text-sm text-muted transition hover:border-ink/40 hover:text-ink disabled:opacity-60"
                >
                  <CornerDownLeft size={13} aria-hidden="true" />
                  {EXAMPLE_LABELS[index] ?? example}
                </button>
              ))}
            </div>
            {searchError && <p role="alert" className="mt-4 text-center text-sm text-over">{searchError}</p>}
          </div>
        </main>
      ) : (
        <main key="manual" className="animate-fade-up mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-6 sm:py-8">
          <div className="mb-5 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {review ? 'Ya casi está' : 'Cuéntanos lo básico'}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted sm:text-base">
              {review && interpretation ? interpretation : 'Cuatro datos y lo que más te importa. Puedes cambiarlo después.'}
            </p>
          </div>

          <form
            className="grid gap-x-10 gap-y-6 rounded-2xl border border-border bg-bg p-5 shadow-[0_16px_40px_-16px_rgb(13_17_23/0.16)] sm:p-7 lg:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!campusId) { setFormError('Elige tu campus de la lista.'); return; }
              if (budget <= 0) { setFormError('Indica un presupuesto.'); return; }
              setFormError(null);
              onStart();
            }}
          >
            <div className="space-y-6">
              {needs('campus') && (
                <CampusPicker campuses={campuses.length ? campuses : DEFAULT_CAMPUSES} campusId={campusId} onChange={onCampusChange} label="¿Dónde estudias?" />
              )}

              {needs('budget') && (
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="budget-range" className={labelClass}>Presupuesto al mes</label>
                    <span className="font-display text-2xl font-bold tabular-nums">{budget.toLocaleString('es-ES')} €</span>
                  </div>
                  <input id="budget-range" type="range" min={BUDGET_MIN} max={BUDGET_MAX} step={25}
                    value={Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, budget))}
                    onChange={(event) => onBudgetChange(Number(event.target.value))}
                    className="clean-range mt-3 w-full" />
                  <div className="mt-1 flex justify-between text-xs text-muted"><span>{BUDGET_MIN} €</span><span>{BUDGET_MAX.toLocaleString('es-ES')} €</span></div>
                </div>
              )}

              {needs('housing') && (
                <div>
                  <span className={labelClass}>Qué buscas</span>
                  <div role="radiogroup" aria-label="Tipo de vivienda" className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
                    {(Object.entries(HOUSING_TYPE_LABELS) as [HousingType, string][]).map(([value, label]) => (
                      <button key={value} type="button" role="radio" aria-checked={housingType === value}
                        onClick={() => onHousingTypeChange(value)}
                        className={'min-h-10 rounded-lg text-sm font-semibold transition ' +
                          (housingType === value ? 'bg-bg text-ink shadow-sm ring-1 ring-ink/5' : 'text-muted hover:text-ink')}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {needs('distance') && (
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="km-range" className={labelClass}>Distancia máxima al campus</label>
                    <span className="text-sm font-semibold tabular-nums">{maxDistanceKm === null ? 'Sin límite' : `${kmValue} km`}</span>
                  </div>
                  <input id="km-range" type="range" min={1} max={KM_MAX} step={1} value={kmValue}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      onMaxDistanceChange(value >= KM_MAX ? null : value);
                    }}
                    className="clean-range mt-3 w-full" />
                  <div className="mt-1 flex justify-between text-xs text-muted"><span>1 km</span><span>Sin límite</span></div>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className={labelClass}>¿Qué te importa más?</span>
              <span className="mt-0.5 text-xs text-muted">Elige una o varias cosas.</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {options.map(({ key, label }) => {
                  const selected = (priorityWeights[key] ?? 0) > 0;
                  const meta = PRIORITY_META[key];
                  const Icon = meta?.icon ?? Check;
                  const locked = selected && activeCount === 1;
                  return (
                    <button key={key} type="button" aria-pressed={selected} disabled={locked}
                      title={locked ? 'Elige al menos una cosa' : undefined}
                      onClick={() => onPriorityChange(key, selected ? 0 : 1)}
                      className={'group relative flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition ' +
                        (selected ? 'border-ink bg-surface' : 'border-border hover:border-ink/40') + (locked ? ' cursor-default' : '')}>
                      <span className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ' + (selected ? 'bg-ink text-bg' : 'bg-surface text-muted group-hover:text-ink')}>
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">{label.replace(' · bibliotecas', '')}</span>
                        <span className="mt-0.5 block text-xs text-muted">{meta?.hint ?? ''}</span>
                      </span>
                      {selected && <Check size={15} aria-hidden="true" className="absolute top-2.5 right-2.5 text-ink" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-6">
                {formError && <p role="alert" className="mb-3 text-sm text-over">{formError}</p>}
                <button type="submit" className={primaryButton + ' w-full'}>
                  Ver zonas <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={goBack} className="mt-3 w-full text-center text-sm font-medium text-muted transition hover:text-ink">
                  {review ? 'Cambiar mi frase' : 'O búscalo con una frase'}
                </button>
              </div>
            </div>
          </form>
        </main>
      )}
    </div>
  );
}
