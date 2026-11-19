/**
 * Screen B fixed top bar with editable filter chips and clean popovers (T25).
 * Chips: Campus · Budget €/mes · Housing type · Max km · Más filtros (air, transit, budget-only, priorities, search).
 * Zero percentages anywhere; crisp 1px borders and subtle popover shadow only.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Scale, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Campus, HousingType } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
import {
  EXAMPLE_QUERIES,
  PRIORITY_CHIPS,
  type AirLevelOption,
} from '../constants/filters';
import { formatEuro, formatKm } from '../utils/format';
import { BrandLogo } from './BrandLogo';

type ActivePopover = 'campus' | 'budget' | 'type' | 'distance' | 'more' | 'search' | null;

interface TopFilterBarProps {
  availableKeys: Set<string>;
  onResetHome: () => void;
  query: string;
  onQueryChange: (val: string) => void;
  onSearchSubmit: (queryText: string) => void;
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
  compareCount: number;
  onOpenCompare: () => void;
}

export function TopFilterBar({
  availableKeys,
  onResetHome,
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
  compareCount,
  onOpenCompare,
}: TopFilterBarProps) {
  const [openPopover, setOpenPopover] = useState<ActivePopover>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const activeCampus = campuses.find((c) => c.id === campusId);
  const campusShort = activeCampus?.name.split(' · ')[0] ?? campusId.toUpperCase();

  const extraFilterCount =
    (airLevel !== 'any' ? 1 : 0) +
    (wellConnectedOnly ? 1 : 0) +
    (onlyWithinBudget ? 1 : 0);

  const toggle = (name: ActivePopover) => {
    setOpenPopover((prev) => (prev === name ? null : name));
  };

  return (
    <header
      ref={barRef}
      className="relative z-40 shrink-0 border-b border-border bg-bg"
    >
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5">
        {/* Brand button (returns to onboarding Screen A) */}
        <button
          type="button"
          onClick={onResetHome}
          aria-label="Volver al inicio"
          className="mr-1 flex shrink-0 items-center rounded-[8px] py-1 pr-2 text-left transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
        >
          <BrandLogo compact />
        </button>

        <span className="hidden h-5 w-px shrink-0 bg-border sm:block" />

        {/* Editable summary chips */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggle('campus')}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium transition ${
              openPopover === 'campus'
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-ink hover:bg-surface'
            }`}
          >
            <span>{campusShort}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => toggle('budget')}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium tabular-nums transition ${
              openPopover === 'budget'
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-ink hover:bg-surface'
            }`}
          >
            <span>{formatEuro(budget)}/mes</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => toggle('type')}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium transition ${
              openPopover === 'type'
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-ink hover:bg-surface'
            }`}
          >
            <span>{HOUSING_TYPE_LABELS[housingType]}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => toggle('distance')}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium tabular-nums transition ${
              openPopover === 'distance'
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-ink hover:bg-surface'
            }`}
          >
            <span>{maxDistanceKm === null ? 'Sin límite km' : `≤ ${formatKm(maxDistanceKm)}`}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => toggle('more')}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium transition ${
              openPopover === 'more' || extraFilterCount > 0
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-ink hover:bg-surface'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Más filtros</span>
            {extraFilterCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-bg">
                {extraFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => toggle('search')}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-medium transition ${
              openPopover === 'search'
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-muted hover:bg-surface hover:text-ink'
            }`}
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Buscar frase</span>
          </button>
        </div>

        {/* Compare button on the right when >= 2 selected */}
        {compareCount >= 2 && (
          <button
            type="button"
            onClick={onOpenCompare}
            className="ml-auto inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] bg-ink px-3.5 py-1.5 text-xs font-medium text-bg transition hover:opacity-90"
          >
            <Scale className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Comparar ({compareCount})</span>
          </button>
        )}
      </div>

      {/* Popovers */}
      {openPopover && (
        <div className="absolute top-full left-4 z-50 mt-2 w-[calc(100vw-2rem)] max-w-md rounded-[10px] border border-border bg-bg p-4 shadow-popover">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">
              {openPopover === 'campus' && 'Elige tu campus'}
              {openPopover === 'budget' && 'Presupuesto mensual'}
              {openPopover === 'type' && 'Tipo de vivienda'}
              {openPopover === 'distance' && 'Distancia máxima al campus'}
              {openPopover === 'more' && 'Más filtros y prioridades'}
              {openPopover === 'search' && 'Buscar en lenguaje natural'}
            </span>
            <button
              type="button"
              onClick={() => setOpenPopover(null)}
              aria-label="Cerrar panel"
              className="rounded-[6px] p-1 text-muted hover:bg-surface hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          {openPopover === 'campus' && (
            <div className="space-y-2">
              {campuses.map((c) => {
                const active = c.id === campusId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onCampusChange(c.id);
                      setOpenPopover(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-[8px] border px-3.5 py-2.5 text-left text-xs font-medium transition ${
                      active
                        ? 'border-ink bg-surface text-ink'
                        : 'border-border bg-bg text-ink hover:bg-surface'
                    }`}
                  >
                    <span>{c.name}</span>
                    {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                  </button>
                );
              })}
            </div>
          )}

          {openPopover === 'budget' && (
            <div className="space-y-3">
              <div className="font-display text-2xl font-bold text-ink tabular-nums">
                {formatEuro(budget)}
                <span className="font-sans text-xs font-normal text-muted"> /mes</span>
              </div>
              <input
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
          )}

          {openPopover === 'type' && (
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(HOUSING_TYPE_LABELS) as HousingType[]).map((type) => {
                const active = housingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onHousingTypeChange(type);
                      setOpenPopover(null);
                    }}
                    className={`min-h-[40px] rounded-[8px] border px-3 py-2 text-xs font-medium transition ${
                      active
                        ? 'border-ink bg-ink text-bg'
                        : 'border-border bg-bg text-ink hover:bg-surface'
                    }`}
                  >
                    {HOUSING_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          )}

          {openPopover === 'distance' && (
            <div className="space-y-3">
              <div className="font-display text-xl font-bold text-ink tabular-nums">
                {maxDistanceKm === null ? 'Sin límite' : `Hasta ${formatKm(maxDistanceKm)}`}
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={maxDistanceKm ?? 20}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onMaxDistanceChange(val >= 20 ? null : val);
                }}
                className="clean-range w-full"
              />
              <div className="flex justify-between text-[11px] text-muted tabular-nums">
                <span>2 km</span>
                <span>10 km</span>
                <span>Sin límite</span>
              </div>
            </div>
          )}

          {openPopover === 'more' && (
            <div className="space-y-4">
              {availableKeys.has('air_no2') && (
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-muted">
                    Calidad del aire (NO₂ máx.)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'any', label: 'Cualquiera' },
                        { id: 'good', label: 'Buena ≤25' },
                        { id: 'very_good', label: 'Muy buena ≤20' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAirLevelChange(opt.id)}
                        className={`min-h-[36px] rounded-[8px] border px-2 py-1.5 text-xs font-medium transition ${
                          airLevel === opt.id
                            ? 'border-ink bg-ink text-bg'
                            : 'border-border bg-bg text-ink hover:bg-surface'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {availableKeys.has('transit_stops') && (
                  <label className="flex min-h-[40px] cursor-pointer items-center justify-between rounded-[8px] border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-surface">
                    <span>Bien comunicado en Metro (≥ 1 est./km²)</span>
                    <input
                      type="checkbox"
                      checked={wellConnectedOnly}
                      onChange={(e) => onWellConnectedChange(e.target.checked)}
                      className="h-4 w-4 accent-ink"
                    />
                  </label>
                )}

                <label className="flex min-h-[40px] cursor-pointer items-center justify-between rounded-[8px] border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-surface">
                  <span>Solo zonas dentro de mi presupuesto</span>
                  <input
                    type="checkbox"
                    checked={onlyWithinBudget}
                    onChange={(e) => onOnlyWithinBudgetChange(e.target.checked)}
                    className="h-4 w-4 accent-ink"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-muted">
                  Lo que más te importa
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_CHIPS.filter((c) => availableKeys.has(c.key)).map((chip) => {
                    const active = selectedPriorities.includes(chip.key);
                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => onTogglePriority(chip.key)}
                        className={`min-h-[34px] rounded-[8px] border px-3 py-1 text-xs font-medium transition ${
                          active
                            ? 'border-ink bg-ink text-bg'
                            : 'border-border bg-bg text-ink hover:bg-surface'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {openPopover === 'search' && (
            <div className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim()) {
                    onSearchSubmit(query.trim());
                    setOpenPopover(null);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Estudio en la ETSISI, 500 € y aire limpio…"
                  className="min-h-[40px] flex-1 rounded-[8px] border border-border bg-surface px-3 text-xs text-ink focus:border-ink focus:bg-bg focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-[8px] bg-brand px-3.5 text-xs font-medium text-bg hover:bg-brand-hover"
                >
                  Buscar
                </button>
              </form>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      onQueryChange(example);
                      onSearchSubmit(example);
                      setOpenPopover(null);
                    }}
                    className="rounded-[8px] border border-border bg-surface px-3 py-2 text-left text-xs text-ink transition hover:border-ink/40 hover:bg-bg"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
