import { useId, useMemo, useState } from 'react';
import type { Campus, HousingType, ScoreResultItem } from '../api/types';
import { HOUSING_TYPE_LABELS, NO_BUDGET_LIMIT } from '../config';

const BUDGET_SLIDER_MAX = 3000;
const KM_SLIDER_MAX = 40;
import { TRANSPORT_LABELS, type AirLevelOption, type TransportMode } from '../constants/filters';
import { formatEuro } from '../utils/format';
import { CampusPicker } from './CampusPicker';
import { PreferenceControls } from './PreferenceControls';

export interface ResultFilters {
  campusId: string;
  budget: number;
  minBudget: number | null;
  housingType: HousingType;
  maxTravelMin: number | null;
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
const rangeClass = 'clean-range mt-2.5 mb-1 w-full';

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
  const [draft, setDraft] = useState(filters);
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
    setDraft((previous) => ({ ...previous, budget: value, minBudget: null }));
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


  const noLimit = draft.budget >= NO_BUDGET_LIMIT;
  const kmValue = Math.min(KM_SLIDER_MAX, Math.max(1, draft.maxDistanceKm ?? 15));

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
      event.preventDefault();
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

        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-sm font-semibold">
              <label htmlFor={priceId}>Alquiler máximo</label>
              <span className="tabular-nums">{noLimit ? 'Sin límite' : `${formatEuro(draft.budget)}/mes`}</span>
            </div>
            <input id={priceId} type="range" min="100" max={BUDGET_SLIDER_MAX + 50} step="10" value={noLimit ? BUDGET_SLIDER_MAX + 50 : Math.min(draft.budget, BUDGET_SLIDER_MAX)}
              aria-label="Alquiler máximo" aria-valuetext={noLimit ? 'Sin límite' : formatEuro(draft.budget) + ' al mes'}
              onChange={(event) => updateBudget(event.target.valueAsNumber > BUDGET_SLIDER_MAX ? NO_BUDGET_LIMIT : Math.round(event.target.valueAsNumber))} className={rangeClass} />
            <div aria-hidden="true" className="flex justify-between text-[11px] text-muted">
              <span>100 €</span><span>{formatEuro(BUDGET_SLIDER_MAX)} · Sin límite</span>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={draft.onlyWithinBudget} onChange={(event) => update('onlyWithinBudget', event.target.checked)}
                className="size-4 shrink-0 accent-brand" />
              Solo zonas dentro de mi presupuesto
            </label>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-sm font-semibold">
              <label htmlFor={distanceId}>Distancia máxima</label>
              <span className="tabular-nums">{draft.maxDistanceKm === null ? 'Sin límite' : `${kmValue} km`}</span>
            </div>
            <input id={distanceId} type="range" min="1" max={KM_SLIDER_MAX + 1} step="1" value={draft.maxDistanceKm === null ? KM_SLIDER_MAX + 1 : kmValue}
              aria-label="Distancia máxima al campus por carretera" aria-valuetext={draft.maxDistanceKm === null ? 'Sin límite' : `${kmValue} km`}
              onChange={(event) => setDraft((previous) => ({ ...previous, maxTravelMin: null,
                maxDistanceKm: event.target.valueAsNumber > KM_SLIDER_MAX ? null : event.target.valueAsNumber }))} className={rangeClass} />
            <div aria-hidden="true" className="flex justify-between text-[11px] text-muted">
              <span>1 km</span><span>{KM_SLIDER_MAX} km · Sin límite</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink">
              <span>Cercanía en</span>
              <div role="radiogroup" aria-label="Cómo irás a clase" className="inline-flex gap-0.5 rounded-lg bg-surface p-0.5">
                {(Object.entries(TRANSPORT_LABELS) as [TransportMode, string][]).map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={draft.transportMode === value}
                    onClick={() => update('transportMode', value)}
                    className={'h-7 rounded-md px-2.5 font-semibold transition ' + (draft.transportMode === value ? 'bg-bg text-ink shadow-sm ring-1 ring-ink/5' : 'text-muted hover:text-ink')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
