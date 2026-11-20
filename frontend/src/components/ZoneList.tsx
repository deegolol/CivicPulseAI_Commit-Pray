/**
 * Ordered list of recommended Madrid neighborhoods with featured Recommendation Hero Card (T28 + T25).
 * - Top: instant "Nuestra recomendación para ti" card from /api/score (headline, reasons with simple Check,
 *   optional "A tener en cuenta" caveats, primary red "Ver pisos" + "Ver detalle"). Does NOT wait for AI.
 * - Below: clean ordered list with discreet highlight tags ("Más barata", "Más cerca", "Mejor aire", "Mejor comunicada").
 * - Bidirectional hover sync with MadridMap. No sparkles, no AI badges, no gradients, zero %.
 */
import { useReducedMotion } from 'motion/react';
import { Expandable } from './Expandable';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { memo as reactMemo } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, Scale, X } from 'lucide-react';
import type { Recommendation, ScoreResultItem } from '../api/types';
import { formatEuro } from '../utils/format';
import { HeroFigure, RealListings, TravelTimes } from './ZoneFacts';
import { normalizedToStars, StarRating } from './StarRating';

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
  renderDetails: (area: ScoreResultItem) => ReactNode;
  onHoverArea: (areaId: string | null) => void;
  compareIds: string[];
  onToggleCompare: (areaId: string) => void;
  onOpenCompare: () => void;
  onCompareTop3: () => void;
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
  loading,
}: ZoneListProps) {
  const reduced = useReducedMotion();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

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
          {visibleResults.length >= 2 && (
            <button type="button" aria-pressed={compareMode}
              onClick={() => setCompareMode((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/40 aria-pressed:border-ink">
              <Scale className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {compareMode ? 'Cancelar' : 'Comparar zonas'}
            </button>
          )}
        </div>
        {compareMode && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-bg px-3 py-2 text-xs text-ink">
            <span>Marca 2 o 3 zonas para compararlas.</span>
            <button type="button" onClick={() => { onCompareTop3(); setCompareMode(false); }} className="font-semibold underline underline-offset-2 hover:text-brand">
              Comparar las 3 mejores
            </button>
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
                    <p className="text-xs text-muted">{recommendation.district}</p>
                    <TravelTimes area={recommendedArea} className="mt-0.5 text-xs text-muted" />
                  </div>
                  <div className="shrink-0"><HeroFigure area={recommendedArea} large /></div>
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

                <RealListings areaId={recommendedArea.id} />

                {(explanationText || explanationLoading) && (
                  <div className="mt-3 rounded-[8px] border border-border">
                    <button type="button" onClick={() => setExplanationOpen((v) => !v)} aria-expanded={explanationOpen}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-surface">
                      <span>{explanationLoading ? 'Preparando la explicación…' : 'Por qué te la recomendamos'}</span>
                      {!explanationLoading && (explanationOpen
                        ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                        : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />)}
                    </button>
                    <Expandable open={explanationOpen && !explanationLoading}>
                      <p className="border-t border-border px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line text-muted">{explanationText}</p>
                    </Expandable>
                  </div>
                )}

                {/* Primary red "Ver pisos" (menu with every portal) + secondary "Ver detalles" */}
                <div className="mt-4 flex items-center gap-2">
                  <ListingsMenu links={recommendedArea.listing_links} primary />
                  <button
                    type="button"
                    aria-expanded={selectedAreaId === recommendedArea.id}
                    onClick={() => onSelectArea(recommendedArea.id)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-[8px] border border-border bg-bg px-3.5 py-2 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface"
                  >
                    {selectedAreaId === recommendedArea.id ? 'Ocultar detalles' : 'Ver detalles'}
                  </button>
                </div>
                {compareMode && <CompareCheck checked={compareIds.includes(recommendedArea.id)} disabled={!compareIds.includes(recommendedArea.id) && compareIds.length >= 3} onChange={() => onToggleCompare(recommendedArea.id)} />}
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
                    className={`rounded-[10px] border bg-bg p-4 transition duration-150 ${
                      isSelected
                        ? 'border-ink ring-1 ring-ink'
                        : isHovered
                          ? 'border-map-5 bg-surface/40'
                          : 'border-border hover:border-ink/40'
                    }`}
                  >
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
                        <HeroFigure area={area} />
                      </div>
                      <RealListings areaId={area.id} />
                    </div>

                    {/* Footer actions: "Ver pisos" menu + details; comparing lives in its own mode */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
                      <ListingsMenu links={area.listing_links} />
                      <button type="button" aria-expanded={isSelected}
                        onClick={() => onSelectArea(area.id)}
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-ink hover:bg-surface">
                        {isSelected ? 'Ocultar detalles' : 'Ver detalles'}
                        <ChevronDown className={isSelected ? 'rotate-180' : ''} size={14} aria-hidden="true" />
                      </button>
                      {compareMode && <span className="ml-auto"><CompareCheck checked={isCompared} disabled={!isCompared && compareIds.length >= 3} onChange={() => onToggleCompare(area.id)} /></span>}
                    </div>
                    <Expandable open={isSelected}>{renderDetails(area)}</Expandable>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky Compare Dock at bottom of list whenever >= 1 zone is picked */}
      <Expandable open={compareIds.length > 0}>
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-bg px-4 py-3 shadow-popover">
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            {compareIds.map((id) => {
              const item = results.find((r) => r.id === id);
              if (!item) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-surface py-0.5 pr-1 pl-2 text-[11px] font-medium text-ink"
                >
                  <span>{item.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleCompare(id)}
                    aria-label={`Quitar ${item.name}`}
                    className="rounded p-0.5 text-muted hover:text-ink"
                  >
                    <X className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            disabled={compareIds.length < 2}
            onClick={onOpenCompare}
            className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-2 text-xs font-medium text-bg transition hover:opacity-90 disabled:bg-surface disabled:text-muted"
          >
            <Scale className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>
              {compareIds.length >= 2
                ? `Comparar ahora (${compareIds.length})`
                : 'Elige 1 barrio más para comparar'}
            </span>
          </button>
        </div>
      </Expandable>
    </div>
  );
}

/** Memoised: only re-renders when its own props change (hovering elsewhere doesn't redraw it). */

/** Labelled checkbox shown on each card while choosing zones to compare. */
function CompareCheck({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label className={'mt-2 inline-flex min-h-[34px] cursor-pointer items-center gap-2 text-xs font-medium text-ink ' + (disabled ? 'opacity-40' : '')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="size-4 accent-brand" />
      Comparar esta zona
    </label>
  );
}

/** "Ver pisos": opens a small menu with every portal where this zone's listings are available. */
function ListingsMenu({ links, primary = false }: { links: ScoreResultItem['listing_links']; primary?: boolean }) {
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
        <div role="menu" className="absolute bottom-full left-0 z-30 mb-1.5 min-w-[200px] rounded-xl border border-border bg-bg p-1 shadow-popover">
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
