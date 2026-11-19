/**
 * Ordered list of recommended Madrid neighborhoods with featured Recommendation Hero Card (T28 + T25).
 * - Top: instant "Nuestra recomendación para ti" card from /api/score (headline, reasons with simple Check,
 *   optional "A tener en cuenta" caveats, primary red "Ver pisos" + "Ver detalle"). Does NOT wait for AI.
 * - Below: clean ordered list with discreet highlight tags ("Más barata", "Más cerca", "Mejor aire", "Mejor comunicada").
 * - Bidirectional hover sync with MadridMap. No sparkles, no AI badges, no gradients, zero %.
 */
import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import type { Recommendation, ScoreResultItem } from '../api/types';
import { formatEuro, formatKm } from '../utils/format';

interface ZoneListProps {
  results: ScoreResultItem[];
  recommendation: Recommendation | null;
  highlights: Record<string, string>;
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

const HIGHLIGHT_LABELS: Record<string, string> = {
  cheapest: 'Más barata',
  closest: 'Más cerca',
  cleanest_air: 'Mejor aire',
  best_transit: 'Mejor comunicada',
};

export function ZoneList({
  results,
  recommendation,
  highlights,
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

  const visibleResults = useMemo(
    () => results.filter((r) => !r.excluded).slice(0, 15),
    [results],
  );

  // Match the featured recommendation to its live ScoreResultItem (only if not excluded)
  const recommendedArea = useMemo(() => {
    if (!recommendation) return null;
    const found = results.find((r) => r.id === recommendation.area_id && !r.excluded);
    return found ?? null;
  }, [recommendation, results]);

  // Map area_id -> discreet highlight tags (never repeating on the already-featured recommended card)
  const tagsByAreaId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [key, areaId] of Object.entries(highlights)) {
      const label = HIGHLIGHT_LABELS[key];
      if (!label || !areaId) continue;
      if (recommendedArea && areaId === recommendedArea.id) continue;
      if (!map[areaId]) map[areaId] = [];
      map[areaId].push(label);
    }
    return map;
  }, [highlights, recommendedArea]);

  // Remaining list excludes the featured recommended card to avoid duplicate #1 right underneath
  const listResults = useMemo(() => {
    if (!recommendedArea) return visibleResults;
    return visibleResults.filter((r) => r.id !== recommendedArea.id);
  }, [visibleResults, recommendedArea]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-5 w-48 animate-pulse rounded-[6px] bg-surface" />
        <div className="h-52 animate-pulse rounded-[10px] border border-border bg-surface" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[10px] border border-border bg-surface"
          />
        ))}
      </div>
    );
  }

  const recOver =
    recommendedArea?.est_rent_eur_month != null && recommendedArea.est_rent_eur_month > budget
      ? Math.round(recommendedArea.est_rent_eur_month - budget)
      : 0;
  const recPrimaryLink = recommendedArea?.listing_links[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      {/* One-line search summary + collapsible explanation */}
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs leading-relaxed text-ink">{summaryLine}</p>
          {(explanationText || explanationLoading) && (
            <button
              type="button"
              onClick={() => setExplanationOpen((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium text-ink underline decoration-border underline-offset-2 hover:bg-bg"
            >
              <span>
                {explanationLoading
                  ? 'Preparando explicación…'
                  : explanationOpen
                    ? 'Ocultar'
                    : 'Leer explicación'}
              </span>
              {!explanationLoading &&
                (explanationOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                ))}
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

      {/* Main scrollable list body */}
      <div className="space-y-3 p-4 pb-20 lg:pb-6">
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
          <>
            {/* Featured Recommendation Hero Card (instant from /api/score, T28) */}
            {recommendation && recommendedArea && (
              <article
                onMouseEnter={() => onHoverArea(recommendedArea.id)}
                onMouseLeave={() => onHoverArea(null)}
                className={`rounded-[10px] border-2 bg-bg p-4 transition duration-150 ${
                  selectedAreaId === recommendedArea.id || hoveredAreaId === recommendedArea.id
                    ? 'border-brand'
                    : 'border-brand/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-brand uppercase">
                    Nuestra recomendación para ti
                  </span>
                  {recommendedArea.est_rent_eur_month != null && (
                    <span
                      className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                        recOver === 0 ? 'bg-fit-soft text-fit' : 'bg-over-soft text-over'
                      }`}
                    >
                      {recOver === 0 ? 'Encaja' : `Se pasa ${formatEuro(recOver)}`}
                    </span>
                  )}
                </div>

                {/* Big neighborhood name + protagonist price */}
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display truncate text-xl font-bold text-ink">
                      {recommendation.name}
                    </h2>
                    <p className="text-xs text-muted">
                      {recommendation.district} · {formatKm(recommendedArea.distance_km)} de tu campus
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-display text-2xl font-bold text-ink tabular-nums">
                    {recommendedArea.est_rent_eur_month != null
                      ? `~${formatEuro(recommendedArea.est_rent_eur_month)}`
                      : 'Sin dato'}
                    <span className="font-sans text-xs font-normal text-muted">/mes</span>
                  </div>
                </div>

                {/* Headline */}
                {recommendation.headline && (
                  <p className="mt-2.5 text-xs font-medium text-ink">
                    {recommendation.headline}
                  </p>
                )}

                {/* Reasons with simple Check icon (no emoji) */}
                {recommendation.reasons.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {recommendation.reasons.slice(0, 4).map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-xs text-ink">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fit"
                          strokeWidth={2}
                        />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Discreet caveats block ("A tener en cuenta") */}
                {recommendation.caveats && recommendation.caveats.length > 0 && (
                  <div className="mt-3 rounded-[8px] border border-border bg-over-soft/60 px-3 py-2">
                    <p className="text-[11px] font-semibold text-over">A tener en cuenta</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-ink">
                      {recommendation.caveats.map((caveat) => (
                        <li key={caveat}>· {caveat}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Primary red "Ver pisos" + secondary "Ver detalle" */}
                <div className="mt-4 flex items-center gap-2">
                  {recPrimaryLink && (
                    <a
                      href={recPrimaryLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-brand px-3.5 py-2 text-xs font-medium text-bg transition hover:bg-brand-hover"
                    >
                      <span>Ver pisos</span>
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectArea(recommendedArea.id)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-[8px] border border-border bg-bg px-3.5 py-2 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface"
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            )}

            {/* Section heading for remaining zones */}
            {listResults.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-muted">
                  {recommendedArea
                    ? 'Otras alternativas para ti'
                    : `Mostrando las ${Math.min(visibleResults.length, 10)} mejores zonas en azul`}
                </span>
              </div>
            )}

            {/* Ordered zone cards with discreet highlight tags */}
            <div className="space-y-2.5">
              {listResults.map((area) => {
                const isSelected = area.id === selectedAreaId;
                const isHovered = area.id === hoveredAreaId;
                const isCompared = compareIds.includes(area.id);
                const firstLink = area.listing_links[0];
                const tags = tagsByAreaId[area.id] ?? [];
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
                      {/* Discreet highlight tags (Más barata, Más cerca, Mejor aire, Mejor comunicada) */}
                      {tags.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-[6px] border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-ink"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

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
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
