import { useId, useMemo, useState } from 'react';
import type { Campus, HousingType, ScoreResultItem } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
import { TRANSPORT_LABELS, type AirLevelOption, type TransportMode } from '../constants/filters';
import { formatEuro, formatKm } from '../utils/format';
import { CampusPicker } from './CampusPicker';
import { PreferenceControls } from './PreferenceControls';

export interface ResultFilters {
  campusId: string;
  budget: number;
  minBudget: number | null;
  housingType: HousingType;
  maxDistanceKm: number | null;
  airLevel: AirLevelOption;
  wellConnectedOnly: boolean;
  onlyWithinBudget: boolean;
  priorityWeights: Record<string, number>;
  transportMode: TransportMode;
  location: string;
}

type FilterArea = Pick<ScoreResultItem, 'id' | 'name' | 'district'>;

const fieldClass = 'mt-1 block h-11 w-full min-w-0 rounded-lg border border-border bg-bg px-3 text-base focus-visible:outline-2 focus-visible:outline-ink';
const rangeClass = 'block h-11 w-full cursor-pointer accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

export function ResultsFilters({ availableKeys, campuses, areas, filters, onApply, onCancel }: {
  availableKeys: Set<string>;
  campuses: Campus[];
  areas: FilterArea[];
  filters: ResultFilters;
  onApply: (filters: ResultFilters) => void;
  onCancel: () => void;
}) {
  const fieldId = useId();
  const priceId = fieldId + '-price';
  const distanceId = fieldId + '-distance';
  const budgetErrorId = fieldId + '-budget-error';
  const [draft, setDraft] = useState(filters);
  const [budgetError, setBudgetError] = useState(false);
  const [sliderCeiling] = useState(() => Math.max(3000, Math.ceil(filters.budget / 1000) * 1000));
  const areasByDistrict = useMemo(() => {
    const districts = new Map<string, FilterArea[]>();
    const sorted = [...areas].sort((a, b) => a.district.localeCompare(b.district, 'es') || a.name.localeCompare(b.name, 'es'));
    for (const area of sorted) {
      const group = districts.get(area.district);
      if (group) group.push(area);
      else districts.set(area.district, [area]);
    }
    return districts;
  }, [areas]);

  function update<Key extends keyof ResultFilters>(key: Key, value: ResultFilters[Key]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function updateBudget(value: number) {
    setBudgetError(false);
    setDraft((previous) => ({ ...previous, budget: value, onlyWithinBudget: true }));
  }

  function updatePriority(key: string, value: number) {
    const weights = { ...draft.priorityWeights };
    if (value > 0) weights[key] = value;
    else delete weights[key];
    setDraft((previous) => ({
      ...previous,
      priorityWeights: weights,
      airLevel: weights.air_no2 ? previous.airLevel : 'any',
      wellConnectedOnly: Boolean(weights.transit_stops) && previous.wellConnectedOnly,
    }));
  }

  function updateTransport(mode: TransportMode) {
    const key = mode === 'metro' ? 'transit_stops' : 'distance_km';
    setDraft((previous) => ({
      ...previous,
      transportMode: mode,
      priorityWeights: mode !== 'any' && availableKeys.has(key) && !previous.priorityWeights[key]
        ? { ...previous.priorityWeights, [key]: 1 }
        : previous.priorityWeights,
    }));
  }

  const budgetCeiling = Math.max(sliderCeiling, draft.budget);
  const radius = draft.maxDistanceKm ?? filters.maxDistanceKm ?? 10;

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
      event.preventDefault();
      if (draft.minBudget !== null && draft.minBudget > draft.budget) {
        setBudgetError(true);
        return;
      }
      onApply(draft);
    }}>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <CampusPicker campuses={campuses} campusId={draft.campusId} keepSelection onChange={(id) => update('campusId', id)} />
          <label className="block text-sm font-semibold">
            Tipo de vivienda
            <select className={fieldClass} value={draft.housingType} onChange={(event) => update('housingType', event.target.value as HousingType)}>
              {Object.entries(HOUSING_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Distrito o barrio
            <select className={fieldClass} value={draft.location} onChange={(event) => update('location', event.target.value)}>
              <option value="">Todo Madrid</option>
              {[...areasByDistrict].map(([district, list]) => (
                <optgroup key={district} label={district}>
                  <option value={`district:${district}`}>Todo el distrito de {district}</option>
                  {list.map((area) => <option key={area.id} value={`area:${area.id}`}>{area.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <section aria-label="Presupuesto mensual" className="min-w-0 rounded-xl border border-border bg-surface p-3.5">
            <label htmlFor={priceId} className="flex flex-wrap items-baseline justify-between gap-1 text-sm font-semibold">
              Alquiler máximo <span className="tabular-nums text-ink">{formatEuro(draft.budget)}/mes</span>
            </label>
            <input id={priceId} type="range" min="1" max={budgetCeiling} step="any" value={draft.budget}
              aria-label="Alquiler máximo" aria-valuetext={formatEuro(draft.budget) + ' al mes'}
              onChange={(event) => updateBudget(Math.round(event.target.valueAsNumber))} className={rangeClass} />
            <div aria-hidden="true" className="-mt-1 flex justify-between text-xs text-muted">
              <span>1 €</span><span>{formatEuro(budgetCeiling)}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">Desde (€)
                <input type="number" min="0" step="any" value={draft.minBudget ?? ''} placeholder="0" className={fieldClass}
                  aria-invalid={budgetError} aria-describedby={budgetError ? budgetErrorId : undefined}
                  onChange={(event) => {
                    setBudgetError(false);
                    update('minBudget', event.target.valueAsNumber || null);
                  }} />
              </label>
              <label className="text-xs font-semibold">Hasta (€)
                <input type="number" required min="1" step="any" value={draft.budget || ''} className={fieldClass}
                  onChange={(event) => updateBudget(event.target.valueAsNumber || 0)} />
              </label>
            </div>
            {budgetError && <p id={budgetErrorId} role="alert" className="mt-2 text-sm text-over">El mínimo debe ser menor o igual que el máximo.</p>}
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.onlyWithinBudget} onChange={(event) => update('onlyWithinBudget', event.target.checked)}
                className="size-4 shrink-0 accent-brand" />
              Solo dentro de mi presupuesto
            </label>
          </section>

          <section aria-label="Cercanía al campus" className="min-w-0 rounded-xl border border-border bg-surface p-3.5">
            <label htmlFor={distanceId} className="flex flex-wrap items-baseline justify-between gap-1 text-sm font-semibold">
              Distancia al campus <span className="tabular-nums text-ink">{draft.maxDistanceKm === null ? 'Sin límite' : formatKm(radius)}</span>
            </label>
            <input id={distanceId} type="range" min="0.5" max="60" step="any" value={radius}
              aria-label="Distancia máxima al campus" aria-valuetext={draft.maxDistanceKm === null ? 'Sin límite' : formatKm(radius)}
              onChange={(event) => update('maxDistanceKm', Math.round(event.target.valueAsNumber * 2) / 2)} className={rangeClass} />
            <div aria-hidden="true" className="-mt-1 flex justify-between text-xs text-muted">
              <span>0,5 km</span><span>60 km</span>
            </div>
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.maxDistanceKm === null} onChange={(event) => update('maxDistanceKm', event.target.checked ? null : radius)}
                className="size-4 shrink-0 accent-brand" />
              Sin límite de distancia
            </label>
            <label className="mt-2 block text-xs font-semibold">
              Cómo te desplazas
              <select value={draft.transportMode} onChange={(event) => updateTransport(event.target.value as TransportMode)} className={fieldClass}>
                {Object.entries(TRANSPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </section>
        </div>

        <PreferenceControls availableKeys={availableKeys} weights={draft.priorityWeights} onChange={updatePriority} spacious />
        {Boolean(draft.priorityWeights.air_no2) && (
          <label className="block text-sm font-semibold">
            Calidad del aire mínima
            <select value={draft.airLevel} className={fieldClass} onChange={(event) => update('airLevel', event.target.value as AirLevelOption)}>
              <option value="any">Cualquiera</option><option value="good">Buena</option><option value="very_good">Muy buena</option>
            </select>
          </label>
        )}
        {Boolean(draft.priorityWeights.transit_stops) && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.wellConnectedOnly} className="size-4 accent-brand"
              onChange={(event) => update('wellConnectedOnly', event.target.checked)} />
            Solo zonas bien comunicadas en metro
          </label>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-2 sm:px-5">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-lg px-4 text-sm font-semibold hover:bg-surface">Cancelar</button>
        <button type="submit" className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-bg hover:bg-brand-hover">Aplicar filtros</button>
      </div>
    </form>
  );
}
