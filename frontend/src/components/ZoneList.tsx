/**
 * Ordered list of recommended Madrid neighborhoods (T25).
 * List-first layout: clean cards with rank, neighborhood name, district, big ~€/mes price,
 * distance from campus, "Encaja" / "Se pasa X €" badge, and secondary "Ver pisos" CTA.
 * Bidirectional hover sync with MadridMap. No sparkles, no AI badges, no gradients.
 */
import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import type { ScoreResultItem } from '../api/types';
import { formatEuro, formatKm } from '../utils/format';

interface ZoneListProps {
  results: ScoreResultItem[];
  budget: number;
  summaryLine: string;
  explanationText: string | null;
  explanationLoading: boolean;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  onHoverArea: (areaId: string | null) => void;
  compareIds: string[];
  onToggleCompare: (areaId: string) => void;
  loading: boolean;
}

export function ZoneList({
  results,
  budget,
  summaryLine,
  explanationText,
  explanationLoading,
  selectedAreaId,
  hoveredAreaId,
  onSelectArea,
  onHoverArea,
  compareIds,
  onToggleCompare,
  loading,
}: ZoneListProps) {
  const [explanationOpen, setExplanationOpen] = useState(false);

  const visibleResults = results.filter((r) => !r.excluded).slice(0, 15);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-5 w-48 animate-pulse rounded-[6px] bg-surface" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-[10px] border border-border bg-surface"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      {/* One-line search summary + collapsible explanation (no AI badges, no sparkles) */}
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs leading-relaxed text-ink">{summaryLine}</p>
          {(explanationText || explanationLoading) && (
            <button
              type="button"
              onClick={() => setExplanationOpen((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium text-ink underline decoration-border underline-offset-2 hover:bg-bg"
            >
              <span>{explanationOpen ? 'Ocultar' : 'Leer explicación'}</span>
              {explanationOpen ? (
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </button>
          )}
        </div>

        {explanationOpen && (
          <div className="mt-2.5 border-t border-border pt-2.5 text-xs leading-relaxed text-muted">
            {explanationLoading ? (
              <div className="space-y-1.5">
                <div className="h-3 w-4/5 animate-pulse rounded bg-border" />
                <div className="h-3 w-full animate-pulse rounded bg-border" />
              </div>
            ) : (
              explanationText
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-xs font-medium text-muted">
          {visibleResults.length > 0
            ? `Mostrando las ${Math.min(visibleResults.length, 10)} mejores zonas en azul`
            : 'Sin resultados'}
        </span>
      </div>

      {/* Cards list */}
      <div className="space-y-2.5 px-4 pb-20 lg:pb-6">
        {visibleResults.length === 0 ? (
          <div className="rounded-[10px] border border-border bg-surface p-5 text-center">
            <p className="text-sm font-medium text-ink">
              Ninguna zona encaja con estos filtros
            </p>
            <p className="mt-1 text-xs text-muted">
              Prueba a ampliar la distancia máxima o desactivar algún filtro en «Más filtros».
            </p>
          </div>
        ) : (
          visibleResults.map((area) => {
            const isSelected = area.id === selectedAreaId;
            const isHovered = area.id === hoveredAreaId;
            const isCompared = compareIds.includes(area.id);
            const firstLink = area.listing_links[0];
            const overAmount =
              area.est_rent_eur_month != null && area.est_rent_eur_month > budget
                ? Math.round(area.est_rent_eur_month - budget)
                : 0;

            return (
              <article
                key={area.id}
                onMouseEnter={() => onHoverArea(area.id)}
                onMouseLeave={() => onHoverArea(null)}
                className={`rounded-[10px] border bg-bg p-4 transition duration-150 ${
                  isSelected
                    ? 'border-ink ring-1 ring-ink'
                    : isHovered
                      ? 'border-map-5 bg-surface/40'
                      : 'border-border hover:border-ink/40'
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectArea(area.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectArea(area.id);
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {/* Top line: Rank + Name + District + Budget status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-muted tabular-nums">
                          #{area.rank}
                        </span>
                        <h3 className="font-display truncate text-base font-bold text-ink">
                          {area.name}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{area.district}</p>
                    </div>

                    {area.est_rent_eur_month != null && (
                      <span
                        className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                          overAmount === 0
                            ? 'bg-fit-soft text-fit'
                            : 'bg-over-soft text-over'
                        }`}
                      >
                        {overAmount === 0 ? 'Encaja' : `Se pasa ${formatEuro(overAmount)}`}
                      </span>
                    )}
                  </div>

                  {/* Hero price + distance */}
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <div className="font-display text-2xl font-bold text-ink tabular-nums">
                      {area.est_rent_eur_month != null
                        ? `~${formatEuro(area.est_rent_eur_month)}`
                        : 'Sin dato'}
                      <span className="font-sans text-xs font-normal text-muted">/mes</span>
                    </div>
                    <span className="text-xs text-muted tabular-nums">
                      {formatKm(area.distance_km)} de tu campus
                    </span>
                  </div>
                </div>

                {/* Footer actions: secondary "Ver pisos" + Compare toggle */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  {firstLink ? (
                    <a
                      href={firstLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[8px] border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface"
                    >
                      <span>Ver pisos</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                    </a>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleCompare(area.id)}
                    disabled={!isCompared && compareIds.length >= 3}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                      isCompared
                        ? 'bg-surface text-ink'
                        : 'text-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {isCompared ? (
                      <>
                        <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
                        <span>Comparando</span>
                      </>
                    ) : (
                      <>
                        <Scale className="h-3.5 w-3.5" strokeWidth={1.75} />
                        <span>Comparar</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
