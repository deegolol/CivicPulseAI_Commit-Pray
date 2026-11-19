/**
 * Neighborhood detail panel (T25).
 * Side panel on desktop, full-screen overlay on mobile.
 * Big Bricolage Grotesque price, Madrid red primary CTA "Ver pisos en Idealista",
 * thin comparison bars vs Madrid median, per-indicator source links, and CRTM attribution.
 */
import { DistrictOffers, FavoriteButton, WatchZoneButton } from './AccountProvider';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Scale, X } from 'lucide-react';
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
  getAirQualityLabel,
} from '../utils/format';

interface AreaDetailPanelProps {
  area: ScoreResultItem;
  indicators: IndicatorMeta[];
  sources: SourceInfo[];
  budget: number;
  housingType: HousingType;
  referenceM2?: number;
  isCompared: boolean;
  canAddCompare: boolean;
  onToggleCompare: (areaId: string) => void;
  onClose: () => void;
}

function formatIndicatorValue(key: string, value: number | null | undefined, unit: string): string {
  if (value == null) return 'Sin dato';
  if (key === 'rent_eur_m2') return formatEuroPerM2(value);
  if (key === 'distance_km') return formatKm(value);
  if (key === 'air_no2') return `${formatInteger(value)} µg/m³ (${getAirQualityLabel(value)})`;
  if (key === 'transit_stops') return `${formatDecimal(value)} est./km²`;
  if (key === 'services_count') return `${formatInteger(value)} equipamientos`;
  return `${formatDecimal(value)} ${unit}`;
}

export function AreaDetailPanel({
  area,
  indicators,
  sources,
  budget,
  housingType,
  referenceM2,
  isCompared,
  canAddCompare,
  onToggleCompare,
  onClose,
}: AreaDetailPanelProps) {
  const [detail, setDetail] = useState<AreaDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    getAreaDetail(area.id)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
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

  const indicatorRows = [
    {
      key: 'distance_km',
      label: 'Distancia al campus',
      unit: 'km',
      value: area.distance_km,
      medianValue: null as number | null,
      normalized: area.breakdown.distance_km?.normalized ?? 0.5,
      note: 'Distancia en línea recta al centroide del barrio',
      source: undefined as SourceInfo | undefined,
    },
    ...indicators.map((ind) => ({
      key: ind.key,
      label: ind.label,
      unit: ind.unit,
      value: area.breakdown[ind.key]?.value ?? detail?.values[ind.key] ?? null,
      medianValue: detail?.city_median?.[ind.key] ?? null,
      normalized: area.breakdown[ind.key]?.normalized ?? 0.5,
      note: detail?.notes?.[ind.key],
      source: sourcesById[ind.source],
    })),
  ];

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Sticky header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          <span>Volver a la lista</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <FavoriteButton target={{ area_id: area.id, housing_type: housingType, budget_eur_month: budget }} />
          <button
            type="button"
            onClick={() => onToggleCompare(area.id)}
            disabled={!isCompared && !canAddCompare}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
              isCompared
                ? 'border-ink bg-surface text-ink'
                : 'border-border bg-bg text-ink hover:bg-surface'
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
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-ink tabular-nums">#{area.rank}</span>
            <span>·</span>
            <span>{area.district}</span>
          </div>
          <h2 className="font-display mt-1 text-2xl leading-tight font-bold text-ink">
            {area.name}
          </h2>
          <p className="mt-1 text-xs text-muted tabular-nums">
            {formatKm(area.distance_km)} de tu campus
          </p>
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
            Estimación con datos oficiales (referencia de {m2Used} m²).
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

        {/* Indicators with thin bars vs Madrid median */}
        <section className="mt-6 space-y-4">
          <h3 className="text-xs font-semibold text-ink">
            Datos del barrio frente a la mediana de Madrid
          </h3>

          {detailLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-[8px] bg-surface" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {indicatorRows.map((row) => {
                const barWidth = Math.max(8, Math.min(100, Math.round(row.normalized * 100)));
                return (
                  <div key={row.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-ink">{row.label}</span>
                      <span className="font-semibold text-ink tabular-nums">
                        {formatIndicatorValue(row.key, row.value, row.unit)}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-map-5 transition-all duration-200"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="tabular-nums">
                        {row.medianValue != null && (
                          <>Mediana Madrid: {formatIndicatorValue(row.key, row.medianValue, row.unit)}</>
                        )}
                        {row.note && (
                          <>
                            {row.medianValue != null ? ' · ' : ''}
                            {row.note}
                          </>
                        )}
                      </span>
                      {row.source && (
                        <a
                          href={row.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 font-medium text-ink underline decoration-border underline-offset-2 hover:text-brand"
                        >
                          <span>Fuente</span>
                          <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.75} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Official Sources + Mandatory CRTM Attribution */}
        {sources.length > 0 && (
          <section className="mt-6 border-t border-border pt-4">
            <h3 className="text-[11px] font-semibold text-muted">Fuentes oficiales</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sources.map((src) => (
                <a
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-surface px-2.5 py-1 text-[11px] text-ink transition hover:border-ink/40"
                >
                  <span>{src.publisher}</span>
                  <ExternalLink className="h-3 w-3 text-muted" strokeWidth={1.75} />
                </a>
              ))}
            </div>

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
                . Datos transformados y agregados por barrio a partir de fuentes abiertas oficiales.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
