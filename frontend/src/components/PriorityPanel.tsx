/**
 * Left sidebar panel for campus selection, budget, housing type, and priority weights.
 * Foundation built in T03; full sliders & filters polished in T09.
 */
import { GraduationCap, SlidersHorizontal, Wallet } from 'lucide-react';
import type { Campus, HousingType } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';

interface PriorityPanelProps {
  campuses: Campus[];
  campusId: string;
  onCampusChange: (campusId: string) => void;
  budget: number;
  onBudgetChange: (budget: number) => void;
  housingType: HousingType;
  onHousingTypeChange: (type: HousingType) => void;
  weights: Record<string, number>;
  onWeightChange: (key: string, value: number) => void;
}

const WEIGHT_LABELS: { key: string; label: string }[] = [
  { key: 'rent_eur_m2', label: 'Precio alquiler' },
  { key: 'distance_km', label: 'Cercanía al campus' },
  { key: 'air_no2', label: 'Aire limpio' },
  { key: 'transit_stops', label: 'Transporte público' },
  { key: 'services_count', label: 'Servicios del barrio' },
];

export function PriorityPanel({
  campuses,
  campusId,
  onCampusChange,
  budget,
  onBudgetChange,
  housingType,
  onHousingTypeChange,
  weights,
  onWeightChange,
}: PriorityPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 sm:p-5">
      {/* Campus selector */}
      <section className="space-y-2">
        <label
          htmlFor="campus-select"
          className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-600 uppercase"
        >
          <GraduationCap className="h-4 w-4 text-teal-600" />
          Tu campus
        </label>
        <select
          id="campus-select"
          value={campusId}
          onChange={(e) => onCampusChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-xs transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
        >
          {campuses.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.name}
            </option>
          ))}
        </select>
      </section>

      {/* Budget & Housing type */}
      <section className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-3.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="budget-input"
            className="flex items-center gap-2 text-xs font-semibold tracking-wide text-teal-900 uppercase"
          >
            <Wallet className="h-4 w-4 text-teal-600" />
            Presupuesto máximo
          </label>
          <span className="font-display text-base font-bold text-teal-700">{budget} €/mes</span>
        </div>

        <input
          id="budget-input"
          type="range"
          min={300}
          max={1400}
          step={25}
          value={budget}
          onChange={(e) => onBudgetChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-teal-600"
        />

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {(Object.keys(HOUSING_TYPE_LABELS) as HousingType[]).map((type) => {
            const active = housingType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onHousingTypeChange(type)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-teal-100/70'
                }`}
              >
                {HOUSING_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Priority weights */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          <SlidersHorizontal className="h-4 w-4 text-teal-600" />
          Tus prioridades
        </div>

        <div className="space-y-3">
          {WEIGHT_LABELS.map(({ key, label }) => {
            const pct = Math.round((weights[key] ?? 0) * 100);
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="font-mono text-slate-500">{pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) => onWeightChange(key, Number(e.target.value) / 100)}
                  className="h-1.5 w-full cursor-pointer accent-slate-800"
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
