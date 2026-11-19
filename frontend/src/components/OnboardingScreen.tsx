/**
 * Screen A: Map-free onboarding screen (T25).
 * Two ways to start: natural language search (+ 3 cached pitch chips) OR campus/budget/type selector.
 * Clean urban utility aesthetic: pure white, Madrid red CTA (#D7262E), Bricolage Grotesque + Instrument Sans.
 */
import { ArrowRight, KeyRound, Search } from 'lucide-react';
import type { Campus, HousingType } from '../api/types';
import { APP_NAME, HOUSING_TYPE_LABELS } from '../config';
import { EXAMPLE_QUERIES } from '../constants/filters';
import { formatEuro } from '../utils/format';

interface OnboardingScreenProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit: (queryText: string) => void;
  campuses: Campus[];
  campusId: string;
  onCampusChange: (campusId: string) => void;
  budget: number;
  onBudgetChange: (budget: number) => void;
  housingType: HousingType;
  onHousingTypeChange: (type: HousingType) => void;
  onStartManual: () => void;
}

const DEFAULT_CAMPUSES: Campus[] = [
  { id: 'etsisi', name: 'ETSISI · Campus Sur UPM', coords: [-3.6286, 40.3897] },
  { id: 'etsiinf', name: 'ETSIINF · Campus Montegancedo UPM', coords: [-3.8392, 40.4053] },
];

export function OnboardingScreen({
  query,
  onQueryChange,
  onSearchSubmit,
  campuses,
  campusId,
  onCampusChange,
  budget,
  onBudgetChange,
  housingType,
  onHousingTypeChange,
  onStartManual,
}: OnboardingScreenProps) {
  const campusList = campuses.length > 0 ? campuses : DEFAULT_CAMPUSES;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearchSubmit(query.trim());
    } else {
      onStartManual();
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      {/* Minimal brand header */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand text-bg">
            <KeyRound className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            {APP_NAME}
          </span>
        </div>
      </header>

      {/* Centered main content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 pt-2 pb-12">
        <div className="space-y-3 text-left sm:text-center">
          <h1 className="font-display text-3xl leading-[1.1] font-bold tracking-tight text-ink sm:text-5xl">
            ¿Dónde vas a vivir este curso?
          </h1>
          <p className="text-sm text-muted sm:text-base">
            Te decimos qué zonas de Madrid encajan con tu campus y tu presupuesto. Con datos
            oficiales.
          </p>
        </div>

        {/* Central white card with 1px border */}
        <div className="mt-8 rounded-[10px] border border-border bg-bg p-5 sm:p-7">
          {/* Way 1: Natural language search + 3 cached pitch chips */}
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <label htmlFor="onboarding-search" className="block text-xs font-medium text-muted">
              Cuéntanos qué buscas
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
                  strokeWidth={1.75}
                />
                <input
                  id="onboarding-search"
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Estudio en la ETSISI, tengo 500 euros y quiero zona tranquila…"
                  className="min-h-[46px] w-full rounded-[8px] border border-border bg-surface py-2.5 pr-3.5 pl-10 text-sm text-ink placeholder:text-muted/75 transition focus:border-ink focus:bg-bg focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-[8px] bg-brand px-5 py-2.5 text-sm font-medium text-bg transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span>Buscar</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* 3 cached pitch chips (always visible on desktop and mobile) */}
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    onQueryChange(example);
                    onSearchSubmit(example);
                  }}
                  className="rounded-[8px] border border-border bg-surface px-3 py-1.5 text-left text-xs text-ink transition hover:border-ink/40 hover:bg-bg focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
                >
                  {example}
                </button>
              ))}
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted">o elige tú</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Way 2: Manual Campus + Budget + Housing type */}
          <div className="space-y-5">
            {/* Campus cards */}
            <div className="space-y-2">
              <span className="block text-xs font-medium text-muted">Tu campus</span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {campusList.map((campus) => {
                  const active = campusId === campus.id;
                  const [shortTitle, subtitle] = campus.name.split(' · ');
                  return (
                    <button
                      key={campus.id}
                      type="button"
                      onClick={() => onCampusChange(campus.id)}
                      className={`flex flex-col items-start rounded-[10px] border p-3.5 text-left transition focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none ${
                        active
                          ? 'border-ink bg-surface'
                          : 'border-border bg-bg hover:border-ink/30'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-display text-base font-semibold text-ink">
                          {shortTitle}
                        </span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            active ? 'bg-brand' : 'border border-border bg-bg'
                          }`}
                        />
                      </div>
                      {subtitle && (
                        <span className="mt-0.5 text-xs text-muted">{subtitle}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget + Housing Type */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="onboarding-budget" className="text-xs font-medium text-muted">
                    Presupuesto mensual
                  </label>
                  <span className="font-display text-2xl font-bold text-ink tabular-nums">
                    {formatEuro(budget)}
                    <span className="font-sans text-xs font-normal text-muted">/mes</span>
                  </span>
                </div>
                <input
                  id="onboarding-budget"
                  type="range"
                  min={300}
                  max={1200}
                  step={25}
                  value={budget}
                  onChange={(e) => onBudgetChange(Number(e.target.value))}
                  className="clean-range w-full"
                />
                <div className="flex justify-between text-[11px] text-muted tabular-nums">
                  <span>300 €</span>
                  <span>750 €</span>
                  <span>1.200 €</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-muted">Qué buscas</span>
                <div
                  role="radiogroup"
                  aria-label="Tipo de vivienda"
                  className="grid grid-cols-3 gap-1 rounded-[8px] border border-border bg-surface p-1"
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
                        className={`min-h-[38px] rounded-[6px] px-2 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'bg-bg text-ink border border-border'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        {HOUSING_TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Madrid Red CTA */}
            <button
              type="button"
              onClick={onStartManual}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] bg-brand px-5 py-3 text-sm font-medium text-bg transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span>Ver zonas</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </main>

      {/* Discreet official data trust footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Datos de Ayuntamiento de Madrid · Ministerio de Vivienda · CRTM
      </footer>
    </div>
  );
}
