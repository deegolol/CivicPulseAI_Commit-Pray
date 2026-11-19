/** Sets the contribution of each criterion to the recommendation. */
import { useId } from 'react';
import { priorityOptions } from '../constants/filters';

const LEVELS = [[0, 'Indiferente'], [0.35, 'Algo'], [1, 'Mucho']] as const;

export function PreferenceControls({ availableKeys, weights, onChange }: {
  availableKeys: Set<string>;
  weights: Record<string, number>;
  onChange: (key: string, weight: number) => void;
}) {
  const id = useId();
  const activeCount = Object.values(weights).filter((weight) => weight > 0).length;

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-bold">Qué te importa en el barrio</legend>
      <p className="mt-1 text-xs text-muted">Indiferente deja ese criterio fuera de la valoración.</p>
      <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-bg">
        {priorityOptions(availableKeys).map(({ key, label }) => {
          const weight = weights[key] ?? 0;
          const level = weight === 0 ? 0 : weight < 0.5 ? 0.35 : 1;
          return (
            <div key={key} className="grid gap-1.5 p-2.5 min-[420px]:grid-cols-[minmax(0,1fr)_192px] min-[420px]:items-center">
              <span id={id + key} className="px-1 text-xs font-semibold">{label}</span>
              <div role="group" aria-labelledby={id + key} className="grid grid-cols-[1.5fr_1fr_1fr] rounded-lg bg-surface p-0.5">
                {LEVELS.map(([value, name]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={level === value}
                    disabled={!value && weight > 0 && activeCount === 1}
                    title={!value && weight > 0 && activeCount === 1 ? 'Mantén al menos un criterio activo' : undefined}
                    onClick={() => onChange(key, value)}
                    className={'min-h-8 rounded-md px-1 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ' +
                      (level === value ? 'bg-bg text-ink shadow-sm ring-1 ring-ink/5' : 'text-muted hover:text-ink disabled:opacity-45')}
                  >{name}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
