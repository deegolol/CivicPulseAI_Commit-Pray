/** Starts a search with natural language or a focused manual form. */
import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, ChevronDown, CircleHelp, CornerDownLeft, Search, X } from 'lucide-react';
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
  const mode = review ? 'review' : manualOpen ? 'manual' : 'intro';
  const showIntro = mode === 'intro';
  const hasSearchFields = ['campus', 'budget', 'housing', 'distance', 'transport'].some(needs);
  const wideForm = !showIntro && hasSearchFields;
  const [infoTopic, setInfoTopic] = useState<'help' | 'account'>('help');
  const infoDialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousMode = useRef(mode);
  const supportsViewTransition = typeof document.startViewTransition === 'function';

  useLayoutEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [mode]);

  function changeMode(update: () => void) {
    const change = () => {
      setFormError(null);
      update();
    };
    if (supportsViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => flushSync(change));
    } else {
      change();
    }
  }

  function openInfo(topic: 'help' | 'account') {
    setInfoTopic(topic);
    infoDialog.current?.showModal();
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-clip bg-bg text-ink">
      {showIntro && <img src="/plano-portada.png" alt="" className="onboarding-map" />}
      <header className="flex w-full items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <BrandLogo />
        <nav aria-label="Ayuda y cuenta" className="flex items-center gap-2">
          <button type="button" onClick={() => openInfo('help')}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 text-xs font-medium hover:bg-surface">
            <CircleHelp size={16} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Cómo funciona</span>
          </button>
          <AccountButton compact onUnavailable={() => openInfo('account')} />
        </nav>
      </header>

      <main key={mode} className={`mx-auto w-full flex-1 px-4 sm:px-6 ${
        showIntro ? 'flex max-w-6xl flex-col justify-center py-8 sm:py-12' : 'onboarding-form-screen max-w-6xl pt-5 pb-8 sm:pt-7'
      } ${!supportsViewTransition ? 'onboarding-enter' : ''}`}>
        <div className={`mx-auto w-full ${wideForm ? 'max-w-2xl md:max-w-none' : 'max-w-[39rem]'}`}>
          <h1 ref={heading} tabIndex={-1}
            className={`text-center font-display text-3xl leading-[1.08] font-bold tracking-tight outline-none ${
              showIntro ? 'sm:text-5xl' : 'sm:text-4xl'
            }`}>
            {review ? 'Completa tu búsqueda' : manualOpen ? 'Configura tu búsqueda' : '¿Dónde vas a vivir este curso?'}
          </h1>
          {(showIntro || (review && interpretation)) && (
            <p className="mx-auto mt-3 max-w-[39rem] text-center text-sm text-muted sm:text-base">
              {showIntro ? 'Encuentra barrios de Madrid según tu campus, tu presupuesto y lo que te importa.' : interpretation}
            </p>
          )}

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
                    onClick={() => changeMode(() => setManualOpen(true))}
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

          {!showIntro && (
            <form
              className={`onboarding-form mt-5 grid items-start gap-4 rounded-2xl border border-border bg-bg p-4 shadow-[0_12px_36px_#2637250d] sm:p-5 ${
                wideForm ? 'md:grid-cols-2 md:gap-x-7' : ''
              }`}
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
              {hasSearchFields && (
                <fieldset className="min-w-0 space-y-3">
                  <legend className="mb-2 text-sm font-bold">Datos de la búsqueda</legend>
                  {needs('campus') && (
                    <CampusPicker campuses={campuses.length ? campuses : DEFAULT_CAMPUSES} campusId={campusId} onChange={onCampusChange} />
                  )}

                  <div className="grid gap-3 min-[480px]:grid-cols-2">
                    {needs('budget') && (
                      <fieldset className="space-y-1.5 min-[480px]:col-span-2">
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
                </fieldset>
              )}

              <PreferenceControls availableKeys={availableKeys} weights={priorityWeights} onChange={onPriorityChange} compact />

              {formError && <p role="alert" className="col-span-full text-sm text-over">{formError}</p>}
              <div className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <button type="button" onClick={() => changeMode(review ? onBack : () => setManualOpen(false))} className="text-sm font-medium text-muted hover:text-ink">
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

      <dialog ref={infoDialog} aria-labelledby="onboarding-info-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-bg p-5 text-ink shadow-popover backdrop:bg-ink/25 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="onboarding-info-title" className="font-display text-xl font-bold">
            {infoTopic === 'help' ? 'Cómo funciona' : 'Mi cuenta'}
          </h2>
          <form method="dialog">
            <button type="submit" aria-label="Cerrar" className="grid size-9 place-items-center rounded-lg hover:bg-surface">
              <X size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
        {infoTopic === 'help' ? (
          <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm text-muted">
            <li>Describe qué buscas o elige tu campus, presupuesto y tipo de vivienda a mano.</li>
            <li>Marca lo que te importa. Los criterios que dejes en Indiferente quedan fuera de la valoración.</li>
            <li>Compara los barrios y abre los portales de alquiler desde la zona que más te encaje.</li>
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">Las cuentas aún no están disponibles. Puedes buscar y comparar barrios desde la portada.</p>
        )}
      </dialog>
    </div>
  );
}
