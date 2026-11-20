/**
 * Ordered list of recommended Madrid neighborhoods with featured Recommendation Hero Card (T28 + T25).
 * - Top: instant "Nuestra recomendación para ti" card from /api/score (headline, reasons with simple Check,
 *   the AI explanation in plain sight, red "Ver pisos" menu + "Ver detalles"). Does NOT wait for AI.
 * - Below: clean ordered list with discreet highlight tags ("Más barata", "Más cerca", "Mejor aire", "Mejor comunicada").
 * - Bidirectional hover sync with MadridMap. No sparkles, no AI badges, no gradients, zero %.
 */
import { useReducedMotion } from 'motion/react';
import { Expandable } from './Expandable';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { memo as reactMemo } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import type { HousingType, Recommendation, ScoreResultItem } from '../api/types';
import { NO_BUDGET_LIMIT } from '../config';
import { formatEuro } from '../utils/format';
import { HeroFigure, listingsFor, TravelTimes } from './ZoneFacts';
import { normalizedToStars, StarRating } from './StarRating';

interface ZoneListProps {
  results: ScoreResultItem[];
  recommendation: Recommendation | null;
  highlights: Record<string, string>;
  budget: number;
  housingType: HousingType;
  summaryLine: string;
  explanationText: string | null;
  explanationLoading: boolean;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  renderDetails: (area: ScoreResultItem) => ReactNode;
  onHoverArea: (areaId: string | null) => void;
  compareIds: string[];
  onToggleCompare: (areaId: string) => void;
  onOpenCompare: () => void;
  onCompareTop3: () => void;
  compareMode: boolean;
  onCompareModeChange: (on: boolean) => void;
  loading: boolean;
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  cheapest: 'Más barata',
  closest: 'Más cerca',
  cleanest_air: 'Mejor aire',
  best_transit: 'Mejor comunicada',
};

function ZoneListImpl({
  results,
  recommendation,
  highlights,
  budget,
  housingType,
  summaryLine,
  explanationText,
  explanationLoading,
  selectedAreaId,
  hoveredAreaId,
  onSelectArea,
  renderDetails,
  onHoverArea,
  compareIds,
  onToggleCompare,
  onOpenCompare,
  onCompareTop3,
  compareMode,
  onCompareModeChange,
  loading,
}: ZoneListProps) {
  const reduced = useReducedMotion();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const budgetLimit = budget >= NO_BUDGET_LIMIT ? null : budget;
  /** In compare mode a click anywhere on a card (except its buttons/links) ticks or unticks it. */
  const pickForCompare = (event: React.MouseEvent, id: string) => {
    if (!compareMode || (event.target as HTMLElement).closest('button, a')) return;
    if (!compareIds.includes(id) && compareIds.length >= 3) return;
    onToggleCompare(id);
  };

  const scrollArea = useRef<HTMLDivElement>(null);
  const visibleResults = useMemo(() => {
    const top = results.filter((area) => !area.excluded).slice(0, 15);
    const selected = results.find((area) => area.id === selectedAreaId);
    if (selected && !top.some((area) => area.id === selected.id)) return [...top, selected];
    return top;
  }, [results, selectedAreaId]);

  useEffect(() => {
    if (!selectedAreaId || loading) return;
    const card = scrollArea.current?.querySelector('[data-expanded="true"]');
    card?.querySelector('[aria-expanded="true"]')?.scrollIntoView({
      block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth',
    });
  }, [selectedAreaId, loading, reduced]);

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

  return (
    <div ref={scrollArea} className="flex h-full flex-col overflow-y-auto bg-bg">
      {/* One-line search summary + a clear, labelled way to compare zones */}
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs leading-relaxed text-ink">{summaryLine}</p>
          {visibleResults.length >= 2 && !compareMode && (
            <button type="button" onClick={() => onCompareModeChange(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/40">
              <Scale className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Comparar zonas
            </button>
          )}
        </div>
      </div>
      {compareMode && (
        <div className="sticky top-0 z-20 border-b border-border bg-bg px-4 py-3 shadow-[0_6px_16px_-10px_rgb(13_17_23/0.25)]">
          <p className="text-xs text-ink">
            <span className="font-semibold">Elige 2 o 3 zonas</span> pulsando en la lista o en el mapa
            {compareIds.length > 0 && <span className="text-muted"> · {compareIds.length} {compareIds.length === 1 ? 'elegida' : 'elegidas'}</span>}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" disabled={compareIds.length < 2}
              onClick={() => { onOpenCompare(); onCompareModeChange(false); }}
              className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-brand px-3 text-xs font-semibold text-bg transition hover:bg-brand-hover disabled:bg-surface disabled:text-muted">
              <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
              {compareIds.length >= 2 ? `Listo, ver comparación (${compareIds.length})` : 'Listo, ver comparación'}
            </button>
            <button type="button" onClick={() => onCompareModeChange(false)}
              className="min-h-[36px] rounded-[8px] border border-border px-3 text-xs font-semibold text-ink hover:bg-surface">
              Cancelar
            </button>
          </div>
          <button type="button" onClick={() => { onCompareTop3(); onCompareModeChange(false); }} className="mt-2 text-xs font-medium text-muted underline underline-offset-2 hover:text-ink">
            O compara directamente las 3 mejores
          </button>
        </div>
      )}

      {/* Main scrollable list body */}
      <div className="space-y-3 p-4 pb-20 lg:pb-6">
        {visibleResults.length === 0 ? (
          <div className="rounded-[10px] border border-border bg-surface p-5 text-center">
            <p className="text-sm font-medium text-ink">
              Ninguna zona encaja con estos filtros
            </p>
            <p className="mt-1 text-xs text-muted">
              Prueba a subir el presupuesto, ampliar el tiempo máximo hasta el campus o quitar algún filtro en «Filtros».
            </p>
          </div>
        ) : (
          <>
            {/* Featured Recommendation Hero Card (instant from /api/score, T28) */}
            {recommendation && recommendedArea && (
              <article
                data-expanded={selectedAreaId === recommendedArea.id}
                onMouseEnter={() => onHoverArea(recommendedArea.id)}
                onMouseLeave={() => onHoverArea(null)}
                onClick={(event) => pickForCompare(event, recommendedArea.id)}
                className={`relative rounded-[10px] border-2 bg-bg p-4 transition duration-150 ${compareMode ? 'cursor-pointer' : ''} ${
                  selectedAreaId === recommendedArea.id || hoveredAreaId === recommendedArea.id
                    ? 'border-brand'
                    : 'border-brand/80'
                }`}
              >
                {compareMode && <CompareBadge on={compareIds.includes(recommendedArea.id)} />}
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
                    <p className="text-xs text-muted">{recommendation.district}</p>
                    <TravelTimes area={recommendedArea} className="mt-0.5 text-xs text-muted" />
                  </div>
                  <div className="shrink-0"><HeroFigure area={recommendedArea} budget={budgetLimit} housingType={housingType} large /></div>
                </div>

                <div className="mt-2"><StarRating value={normalizedToStars(recommendedArea.score / 100)} size="md" /></div>

                {/* Headline */}
                {recommendation.headline && (
                  <p className="mt-2.5 text-xs font-medium text-ink">
                    {recommendation.headline}
                  </p>
                )}

                {/* Reasons with simple Check icon (no emoji) */}
                {recommendation.reasons.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {recommendation.reasons
                      // With real listings on the card, the estimate would contradict them: hide that reason.
                      .filter((reason) => !(housingType === 'room' && listingsFor(recommendedArea.id, budgetLimit).length && reason.includes('estimados')))
                      .slice(0, 4).map((reason) => (
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

                {/* Why we recommend it: visible right away in readable text; "Leer más" opens the whole paragraph */}
                {(explanationText || explanationLoading) && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-ink">Por qué te la recomendamos</p>
                    {explanationLoading ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="h-3.5 w-full animate-pulse rounded bg-surface" />
                        <div className="h-3.5 w-11/12 animate-pulse rounded bg-surface" />
                        <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface" />
                      </div>
                    ) : (
                      <>
                        <p className={'mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink ' + (explanationOpen ? '' : 'line-clamp-5')}>
                          {explanationText}
                        </p>
                        {(explanationText?.length ?? 0) > 280 && (
                          <button type="button" onClick={() => setExplanationOpen((v) => !v)} aria-expanded={explanationOpen}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                            {explanationOpen ? 'Leer menos' : 'Leer más'}
                            {explanationOpen ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Primary red "Ver pisos" (menu with every portal) + secondary "Ver detalles" */}
                <div className="mt-4 flex items-center gap-2">
                  <ListingsMenu links={recommendedArea.listing_links} listings={housingType === 'room' ? listingsFor(recommendedArea.id, budgetLimit).slice(0, 5) : []} primary />
                  <button
                    type="button"
                    aria-expanded={selectedAreaId === recommendedArea.id}
                    onClick={() => onSelectArea(recommendedArea.id)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-[8px] border border-border bg-bg px-3.5 py-2 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface"
                  >
                    {selectedAreaId === recommendedArea.id ? 'Ocultar detalles' : 'Ver detalles'}
                  </button>
                </div>
                <Expandable open={selectedAreaId === recommendedArea.id}>{renderDetails(recommendedArea)}</Expandable>
              </article>
            )}

            {/* Section heading + 1-click "Comparar top 3" */}
            {listResults.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-muted">
                  {recommendedArea
                    ? 'Otras zonas por valoración'
                    : `Mostrando las ${Math.min(visibleResults.length, 15)} mejores zonas`}
                </span>
              </div>
            )}

            {/* Ordered zone cards with discreet highlight tags */}
            <div className="space-y-2.5">
              {listResults.map((area) => {
                const isSelected = area.id === selectedAreaId;
                const isHovered = area.id === hoveredAreaId;
                const isCompared = compareIds.includes(area.id);
                const tags = tagsByAreaId[area.id] ?? [];
                const overAmount =
                  area.est_rent_eur_month != null && area.est_rent_eur_month > budget
                    ? Math.round(area.est_rent_eur_month - budget)
                    : 0;

                return (
                  <article
                    key={area.id}
                    data-expanded={isSelected}
                    onMouseEnter={() => onHoverArea(area.id)}
                    onMouseLeave={() => onHoverArea(null)}
                    onClick={(event) => pickForCompare(event, area.id)}
                    className={`relative rounded-[10px] border bg-bg p-4 transition duration-150 ${compareMode ? 'cursor-pointer' : ''} ${isCompared && compareMode ? 'ring-2 ring-brand' : ''} ${
                      isSelected
                        ? 'border-ink ring-1 ring-ink'
                        : isHovered
                          ? 'border-map-5 bg-surface/40'
                          : 'border-border hover:border-ink/40'
                    }`}
                  >
                    {compareMode && <CompareBadge on={isCompared} />}
                    <div>
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
                            <h3 className="font-display truncate text-base font-bold text-ink">
                              {area.name}
                            </h3>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">{area.district}</p>
                        </div>

                        {area.excluded && <span className="text-xs text-muted">Fuera de filtros</span>}
                        {!area.excluded && area.est_rent_eur_month != null && (
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

                      <div className="mt-2"><StarRating value={normalizedToStars(area.score / 100)} size="md" /></div>

                      {/* Real travel times + the one honest figure we have */}
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <TravelTimes area={area} className="text-xs text-muted" />
                        <HeroFigure area={area} budget={budgetLimit} housingType={housingType} />
                      </div>
                    </div>

                    {/* Footer actions: "Ver pisos" menu + details; comparing lives in its own mode */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
                      <ListingsMenu links={area.listing_links} listings={housingType === 'room' ? listingsFor(area.id, budgetLimit).slice(0, 5) : []} />
                      <button type="button" aria-expanded={isSelected}
                        onClick={() => onSelectArea(area.id)}
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-ink hover:bg-surface">
                        {isSelected ? 'Ocultar detalles' : 'Ver detalles'}
                        <ChevronDown className={isSelected ? 'rotate-180' : ''} size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <Expandable open={isSelected}>{renderDetails(area)}</Expandable>
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

/** Memoised: only re-renders when its own props change (hovering elsewhere doesn't redraw it). */

/** Round tick shown on each card while choosing zones to compare. */
function CompareBadge({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={'absolute -top-2.5 -right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition ' +
      (on ? 'border-brand bg-brand text-bg' : 'border-border bg-bg text-transparent')}>
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  );
}

/** "Ver pisos": opens a small menu with every portal where this zone's listings are available. */
function ListingsMenu({ links, listings = [], primary = false }: {
  links: ScoreResultItem['listing_links']; listings?: ReturnType<typeof listingsFor>; primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!links.length) return null;
  const buttonClass = primary
    ? 'inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-[8px] bg-brand px-3.5 py-2 text-xs font-semibold text-bg transition hover:bg-brand-hover'
    : 'inline-flex min-h-[34px] items-center gap-1.5 rounded-[8px] border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface';
  return (
    <div ref={ref} className={'relative ' + (primary ? 'flex-1' : '')}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={buttonClass}>
        Ver pisos <ChevronDown className={'h-3.5 w-3.5 transition ' + (open ? 'rotate-180' : '')} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 z-30 mt-1.5 w-[300px] max-w-[80vw] rounded-xl border border-border bg-bg p-1 shadow-popover">
          {listings.map((listing) => (
            <a key={listing.url} role="menuitem" href={listing.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface">
              <span className="min-w-0 truncate">{listing.title}</span>
              <span className="shrink-0 font-semibold tabular-nums">{formatEuro(listing.price_eur_month)}</span>
            </a>
          ))}
          {listings.length > 0 && <div className="my-1 border-t border-border" />}
          {links.map((link) => (
            <a key={link.url} role="menuitem" href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface">
              {link.label}
              <ExternalLink className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export const ZoneList = reactMemo(ZoneListImpl);
