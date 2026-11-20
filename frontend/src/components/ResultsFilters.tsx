import { useId, useMemo, useState } from 'react';
import type { Campus, HousingType, ScoreResultItem } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
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
  const [draft, setDraft] = useState(filters);
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


  const budgetCeiling = Math.max(sliderCeiling, draft.budget);
  const hasTravelTimes = campuses.find(({ id }) => id === draft.campusId)?.has_travel_times !== false;
  const distance = draft.maxDistanceKm ?? 10;
  const minutes = draft.maxTravelMin ?? filters.maxTravelMin ?? 45;
  const minutesText = draft.maxTravelMin === null ? 'Sin límite' : `${minutes} min`;

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

        <div className="grid gap-4 sm:grid-cols-2">
          <section aria-label="Presupuesto mensual" className="min-w-0 rounded-xl border border-border bg-surface p-3.5">
            <label htmlFor={priceId} className="flex flex-wrap items-baseline justify-between gap-1 text-sm font-semibold">
              Alquiler máximo <span className="tabular-nums text-ink">{formatEuro(draft.budget)}/mes</span>
            </label>
            <input id={priceId} type="range" min="100" max={budgetCeiling} step="10" value={draft.budget}
              aria-label="Alquiler máximo" aria-valuetext={formatEuro(draft.budget) + ' al mes'}
              onChange={(event) => updateBudget(Math.round(event.target.valueAsNumber))} className={rangeClass} />
            <div aria-hidden="true" className="-mt-1 flex justify-between text-xs text-muted">
              <span>100 €</span><span>{formatEuro(budgetCeiling)}</span>
            </div>
            {draft.housingType === 'flat' ? (
              <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.onlyWithinBudget} onChange={(event) => update('onlyWithinBudget', event.target.checked)}
                  className="size-4 shrink-0 accent-brand" />
                Ocultar zonas cuyo alquiler oficial lo supera
              </label>
            ) : (
              <p className="mt-2 text-xs text-muted">Tu presupuesto filtra los anuncios reales que abrimos en Fotocasa, Idealista y Badi.</p>
            )}
          </section>

          <section aria-label={hasTravelTimes ? "Tiempo hasta el campus" : "Distancia hasta el campus"} className="min-w-0 rounded-xl border border-border bg-surface p-3.5">
            {hasTravelTimes ? <>
            <label className="block text-xs font-semibold">
              Cómo irás a clase
              <select value={draft.transportMode} onChange={(event) => update('transportMode', event.target.value as TransportMode)} className={fieldClass}>
                {Object.entries(TRANSPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label htmlFor={distanceId} className="mt-3 flex flex-wrap items-baseline justify-between gap-1 text-sm font-semibold">
              Tiempo máximo <span className="tabular-nums text-ink">{minutesText}</span>
            </label>
            <input id={distanceId} type="range" min="10" max="120" step="5" value={minutes}
              aria-label="Tiempo máximo hasta el campus" aria-valuetext={minutesText}
              onChange={(event) => update('maxTravelMin', event.target.valueAsNumber)} className={rangeClass} />
            <div aria-hidden="true" className="-mt-1 flex justify-between text-xs text-muted">
              <span>10 min</span><span>120 min</span>
            </div>
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.maxTravelMin === null} onChange={(event) => update('maxTravelMin', event.target.checked ? null : minutes)}
                className="size-4 shrink-0 accent-brand" />
              Sin límite de tiempo
            </label>
            </> : <>
              <label htmlFor={distanceId} className="flex flex-wrap items-baseline justify-between gap-1 text-sm font-semibold">
                Distancia en línea recta <span className="tabular-nums">{draft.maxDistanceKm === null ? 'Sin límite' : `${distance} km`}</span>
              </label>
              <input id={distanceId} type="range" min="1" max="60" step="1" value={distance}
                onChange={(event) => update('maxDistanceKm', event.target.valueAsNumber)} className={rangeClass} />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-brand" checked={draft.maxDistanceKm === null}
                  onChange={(event) => update('maxDistanceKm', event.target.checked ? null : distance)} />
                Sin límite de distancia
              </label>
              <p className="text-xs text-muted">Para este centro aún no hay tiempos de trayecto disponibles.</p>
            </>}
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
