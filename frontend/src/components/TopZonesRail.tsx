/**
 * Floating right rail showing the Top 3 recommended Madrid neighborhoods (T13 + T24).
 * Displays real units (~€/mes in Fraunces serif, km, NO₂), 1 clear strength tag,
 * qualitative fit badges, and 2–3 zone comparison selection.
 */
import { ArrowUpRight, Check, Compass, Scale, Sparkles, Wind } from 'lucide-react';
import type { ScoreResultItem } from '../api/types';
import {
  formatEuro,
  formatKm,
  getFitLabel,
  getFitLevel,
} from '../utils/format';
import { AiExplanation } from './AiExplanation';

interface TopZonesRailProps {
  topResults: ScoreResultItem[];
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  compareIds: string[];
  onToggleCompare: (areaId: string) => void;
  onOpenCompare: () => void;
  aiInterpretation: string | null;
  aiExplanation: string | null;
  aiEngine: 'llm' | 'keywords' | null;
  aiLoading: boolean;
  aiError: string | null;
  onDismissAi: () => void;
  loading: boolean;
}

const STRENGTH_LABELS: Record<string, string> = {
  rent_eur_m2: 'Alquiler contenido',
  distance_km: 'Muy cerca del campus',
  air_no2: 'Aire muy limpio',
  transit_stops: 'Excelente conexión Metro',
  services_count: 'Muchos servicios cerca',
};

function getTopStrength(area: ScoreResultItem): string | null {
  let bestKey: string | null = null;
  let bestNorm = -1;
  for (const [key, item] of Object.entries(area.breakdown)) {
    if (item.normalized > bestNorm && STRENGTH_LABELS[key]) {
      bestNorm = item.normalized;
      bestKey = key;
    }
  }
  return bestKey ? STRENGTH_LABELS[bestKey] : null;
}

export function TopZonesRail({
  topResults,
  selectedAreaId,
  onSelectArea,
  compareIds,
  onToggleCompare,
  onOpenCompare,
  aiInterpretation,
  aiExplanation,
  aiEngine,
  aiLoading,
  aiError,
  onDismissAi,
  loading,
}: TopZonesRailProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-4 w-36 animate-pulse rounded-md bg-surface-subtle" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border bg-surface/80 p-4"
          />
        ))}
      </div>
    );
  }

  const canCompare = compareIds.length >= 2;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-serif text-base font-semibold text-ink">
            Tus 3 mejores zonas
          </h2>
          <span className="text-[11px] text-muted">Haz clic para explorar</span>
        </div>

        <AiExplanation
          interpretation={aiInterpretation}
          explanationText={aiExplanation}
          engine={aiEngine}
          loading={aiLoading}
          error={aiError}
          onDismiss={onDismissAi}
        />

        {topResults.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="text-sm font-medium text-ink">
              Ninguna zona encaja con filtros tan estrictos
            </p>
            <p className="mt-1 text-xs text-muted">
              Prueba a ampliar la distancia máxima o desactivar algún filtro.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topResults.map((area, index) => {
              const isFirst = index === 0;
              const isSelected = area.id === selectedAreaId;
              const isCompared = compareIds.includes(area.id);
              const fitLevel = getFitLevel(area.score, area.excluded);
              const no2 = area.breakdown.air_no2?.value;
              const strength = getTopStrength(area);

              return (
                <div
                  key={area.id}
                  className={`group rounded-2xl border transition duration-200 ease-out ${
                    isSelected
                      ? 'border-accent bg-surface shadow-floating'
                      : 'border-border bg-surface/95 shadow-card hover:border-accent-border hover:bg-surface'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectArea(area.id)}
                    className="w-full p-4 pb-3 text-left focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold tabular-nums ${
                              isFirst
                                ? 'bg-accent text-surface'
                                : 'bg-surface-subtle text-ink'
                            }`}
                          >
                            #{area.rank}
                          </span>
                          <span className="truncate text-xs text-muted">{area.district}</span>
                        </div>
                        <h3 className="mt-1 truncate text-sm font-semibold text-ink group-hover:text-accent">
                          {area.name}
                        </h3>
                      </div>

                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-muted transition duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                        strokeWidth={1.5}
                      />
                    </div>

                    {/* Big Fraunces price + fit badge */}
                    <div className="mt-2.5 flex items-baseline justify-between gap-2">
                      <div>
                        <span className="font-serif text-xl font-semibold text-ink tabular-nums">
                          {area.est_rent_eur_month != null
                            ? `~${formatEuro(area.est_rent_eur_month)}`
                            : 'Sin dato'}
                        </span>
                        <span className="text-xs text-muted"> /mes</span>
                      </div>

                      {area.fits_budget !== null && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            area.fits_budget
                              ? 'bg-fit-soft text-fit'
                              : 'bg-nofit-soft text-nofit'
                          }`}
                        >
                          {area.fits_budget ? 'Encaja' : 'Por encima'}
                        </span>
                      )}
                    </div>

                    {/* 1 key strength pill */}
                    {strength && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-[11px] text-ink">
                        <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
                        <span>{strength}</span>
                      </div>
                    )}

                    {/* Real-unit metadata line */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-2 text-[11px] text-muted tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Compass className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                        {formatKm(area.distance_km)}
                      </span>
                      {no2 != null && (
                        <span className="inline-flex items-center gap-1">
                          <Wind className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                          NO₂ {Math.round(no2)} µg/m³
                        </span>
                      )}
                      <span className="ml-auto font-medium text-ink">
                        {getFitLabel(fitLevel)}
                      </span>
                    </div>
                  </button>

                  {/* Compare toggle footer */}
                  <div className="flex items-center justify-end border-t border-border/60 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleCompare(area.id)}
                      disabled={!isCompared && compareIds.length >= 3}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-40 ${
                        isCompared
                          ? 'bg-accent-soft text-accent'
                          : 'text-muted hover:bg-surface-subtle hover:text-ink'
                      }`}
                    >
                      {isCompared ? (
                        <>
                          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                          En comparativa
                        </>
                      ) : (
                        <>
                          <Scale className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Comparar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Compare CTA bar when >= 1 selected */}
      {compareIds.length > 0 && (
        <div className="shrink-0 border-t border-border bg-surface/95 p-3">
          <button
            type="button"
            disabled={!canCompare}
            onClick={onOpenCompare}
            className={`flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              canCompare
                ? 'bg-ink text-surface shadow-card hover:bg-ink/90'
                : 'border border-border bg-canvas text-muted'
            }`}
          >
            <Scale className="h-4 w-4" strokeWidth={1.5} />
            {canCompare
              ? `Comparar ${compareIds.length} barrios`
              : 'Elige al menos 2 barrios para comparar'}
          </button>
        </div>
      )}
    </div>
  );
}
