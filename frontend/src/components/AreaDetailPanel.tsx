/**
 * Neighborhood detail panel with 0–5 fractional star ratings (e.g., 4.3) + 1-click compare.
 * Student-friendly ratings up front; raw technical units & official source links neatly collapsible below.
 */
import { DistrictOffers, FavoriteButton, WatchZoneButton } from './AccountProvider';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Scale, X } from 'lucide-react';
import { getAreaDetail } from '../api/client';
import type {
  AreaDetailResponse,
  HousingType,
  IndicatorMeta,
  ScoreResultItem,
  SourceInfo,
} from '../api/types';
import { HOUSING_REFERENCE_M2, HOUSING_TYPE_LABELS } from '../config';
import {
  formatDecimal,
  formatEuro,
  formatEuroPerM2,
  formatInteger,
  formatKm,
} from '../utils/format';
import { normalizedToStars, StarRating } from './StarRating';

interface AreaDetailPanelProps {
  area: ScoreResultItem;
  indicators: IndicatorMeta[];
  activeCriteria: Set<string>;
  sources: SourceInfo[];
  budget: number;
  housingType: HousingType;
  referenceM2?: number;
  onQuickCompare: (areaId: string) => void;
  onClose: () => void;
}

const FRIENDLY_LABELS: Record<string, string> = {
  rent_eur_m2: 'Precio del alquiler',
  distance_km: 'Cercanía al campus',
  air_no2: 'Calidad del aire',
  transit_stops: 'Transporte en Metro',
  services_count: 'Servicios y deporte',
};

function formatRawTechnical(key: string, value: number | null | undefined, unit: string): string {
  if (value == null) return 'Sin dato';
  if (key === 'rent_eur_m2') return formatEuroPerM2(value);
  if (key === 'distance_km') return formatKm(value);
  if (key === 'air_no2') return `${formatInteger(value)} µg/m³ NO₂`;
  if (key === 'transit_stops') return `${formatDecimal(value)} est./km²`;
  if (key === 'services_count') return `${formatInteger(value)} equipamientos`;
  return `${formatDecimal(value)} ${unit}`;
}

export function AreaDetailPanel({
  area,
  indicators,
  activeCriteria,
  sources,
  budget,
  housingType,
  referenceM2,
  onQuickCompare,
  onClose,
}: AreaDetailPanelProps) {
  const [detail, setDetail] = useState<AreaDetailResponse | null>(null);
  const [showTechData, setShowTechData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAreaDetail(area.id)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [area.id]);

  const sourcesById = useMemo(() => {
    const map: Record<string, SourceInfo> = {};
    for (const s of sources) map[s.id] = s;
    return map;
  }, [sources]);

  const m2Used = referenceM2 ?? HOUSING_REFERENCE_M2[housingType];
  const overAmount =
    area.est_rent_eur_month != null && area.est_rent_eur_month > budget
      ? Math.round(area.est_rent_eur_month - budget)
      : 0;
  const primaryLink = area.listing_links[0];
  const secondaryLinks = area.listing_links.slice(1);
  const hasCrtm = Boolean(sourcesById.crtm);
  const overallStars = Math.round((area.score / 100) * 50) / 10;

  const ratingRows = [
    {
      key: 'distance_km',
      label: FRIENDLY_LABELS.distance_km,
      stars: area.breakdown.distance_km ? normalizedToStars(area.breakdown.distance_km.normalized) : null,
      subtitle: `${formatKm(area.distance_km)} de tu campus`,
      rawValue: formatRawTechnical('distance_km', area.distance_km, 'km'),
      medianValue: null as string | null,
      note: 'Distancia en línea recta al centroide del barrio',
      source: undefined as SourceInfo | undefined,
    },
    ...indicators.map((ind) => {
      const val = area.breakdown[ind.key]?.value ?? detail?.values[ind.key] ?? null;
      const rating = area.breakdown[ind.key];
      const med = detail?.city_median?.[ind.key] ?? null;
      return {
        key: ind.key,
        label: FRIENDLY_LABELS[ind.key] ?? ind.label,
        stars: rating?.value != null ? normalizedToStars(rating.normalized) : null,
        subtitle: null as string | null,
        rawValue: formatRawTechnical(ind.key, val, ind.unit),
        medianValue: med != null ? formatRawTechnical(ind.key, med, ind.unit) : null,
        note: detail?.notes?.[ind.key],
        source: sourcesById[ind.source],
      };
    }),
  ].filter((row) => activeCriteria.has(row.key));

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Sticky header with 1-click Compare button */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          <span>Volver</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <FavoriteButton target={{ area_id: area.id, housing_type: housingType, budget_eur_month: budget }} />
          <button
            type="button"
            onClick={() => onQuickCompare(area.id)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[8px] border border-border bg-bg px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/40 hover:bg-surface"
          >
            <Scale className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Comparar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-muted hover:bg-surface hover:text-ink lg:inline-flex"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Title + overall 0–5 star rating */}
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-ink tabular-nums">#{area.rank}</span>
            <span>·</span>
            <span>{area.district}</span>
          </div>
          <h2 className="font-display mt-1 text-2xl leading-tight font-bold text-ink">
            {area.name}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <StarRating value={overallStars} size="md" />
            <span className="text-xs text-muted">Valoración para tu perfil</span>
          </div>
        </div>
        <DistrictOffers district={area.district} housingType={housingType} />

        {/* Hero budget block */}
        <section className="mt-5 rounded-[10px] border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">
              Coste estimado ({HOUSING_TYPE_LABELS[housingType].toLowerCase()})
            </span>
            {area.est_rent_eur_month != null && (
              <span
                className={`rounded-[6px] px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                  overAmount === 0 ? 'bg-fit-soft text-fit' : 'bg-over-soft text-over'
                }`}
              >
                {overAmount === 0 ? 'Encaja' : `Se pasa ${formatEuro(overAmount)}`}
              </span>
            )}
          </div>

          <div className="mt-2 font-display text-3xl font-bold text-ink tabular-nums">
            {area.est_rent_eur_month != null
              ? `~${formatEuro(area.est_rent_eur_month)}`
              : 'Sin dato'}
            <span className="font-sans text-sm font-normal text-muted">/mes</span>
          </div>

          {area.affordable_m2 != null && (
            <p className="mt-2 text-xs text-ink">
              Con <strong>{formatEuro(budget)}</strong> te da para aprox.{' '}
              <strong className="tabular-nums">~{formatDecimal(area.affordable_m2)} m²</strong>.
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted">
            Estimación oficial con referencia de {m2Used} m².
          </p>

          <div className="mt-3">
            <WatchZoneButton watch={{
              area_id: area.id,
              area_name: area.name,
              housing_type: housingType,
              budget_eur_month: Math.round(budget),
            }} />
          </div>

          {/* Primary Madrid Red CTA */}
          {primaryLink && (
            <a
              href={primaryLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[8px] bg-brand px-4 py-2.5 text-sm font-medium text-bg transition hover:bg-brand-hover"
            >
              <span>Ver pisos en {primaryLink.label}</span>
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
            </a>
          )}

          {secondaryLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {secondaryLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink/40"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Clean 0–5 Star Ratings section (no noisy technical units) */}
        <section className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold text-ink">Valoración del barrio</h3>
          <div className="divide-y divide-border rounded-[10px] border border-border bg-bg">
            {ratingRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink">{row.label}</div>
                  {row.subtitle && (
                    <div className="mt-0.5 text-[11px] text-muted tabular-nums">
                      {row.subtitle}
                    </div>
                  )}
                </div>
                {row.stars !== null
                  ? <StarRating value={row.stars} size="sm" />
                  : <span className="text-xs text-muted">Sin dato</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Collapsible official technical data & sources (for transparency / jury) */}
        <section className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowTechData((v) => !v)}
            className="flex w-full items-center justify-between rounded-[8px] py-1.5 text-xs font-medium text-muted transition hover:text-ink"
          >
            <span>Ver datos oficiales y fuentes</span>
            {showTechData ? (
              <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>

          {showTechData && (
            <div className="mt-3 space-y-2.5 rounded-[10px] border border-border bg-surface p-3.5 text-[11px]">
              {ratingRows.map((row) => (
                <div key={row.key} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{row.label}</span>
                    <span className="font-semibold text-ink tabular-nums">{row.rawValue}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-muted">
                    <span>
                      {row.medianValue ? `Mediana Madrid: ${row.medianValue}` : ''}
                      {row.note ? `${row.medianValue ? ' · ' : ''}${row.note}` : ''}
                    </span>
                    {row.source && (
                      <a
                        href={row.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-medium text-ink underline decoration-border hover:text-brand"
                      >
                        <span>Fuente</span>
                        <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.75} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasCrtm && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Transporte:{' '}
              <a
                href="https://www.crtm.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline decoration-border underline-offset-2 hover:text-brand"
              >
                Powered by CRTM
              </a>
              . Datos transformados y agregados por barrio.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
