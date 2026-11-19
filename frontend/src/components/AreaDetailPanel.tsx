/**
 * Editorial neighborhood detail panel (T10 + T24).
 * - Hero: "Esto es lo que te da tu presupuesto aquí" (~X €/mes in Fraunces) + "Ver pisos en esta zona"
 * - Recharts Radar comparing the selected neighborhood vs Madrid median (/api/areas/{id})
 * - Per-indicator real-unit bars, provenance notes ("valor del distrito", services breakdown), and source links
 * - Mandatory CRTM attribution ("Powered by CRTM") + transformed-data notice per license
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Info, MapPin } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
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
  getFitLabel,
  getFitLevel,
} from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

interface AreaDetailPanelProps {
  area: ScoreResultItem | null;
  indicators: IndicatorMeta[];
  sources: SourceInfo[];
  budget: number;
  housingType: HousingType;
  referenceM2?: number;
  onBack: () => void;
}

function formatIndicatorValue(key: string, value: number | null | undefined, unit: string): string {
  if (value == null) return 'Sin dato';
  if (key === 'rent_eur_m2') return formatEuroPerM2(value);
  if (key === 'distance_km') return formatKm(value);
  if (key === 'air_no2') return `${formatInteger(value)} µg/m³ · ${getAirQualityLabel(value)}`;
  if (key === 'transit_stops') return `${formatDecimal(value)} est./km²`;
  if (key === 'services_count') return `${formatInteger(value)} equipamientos`;
  return `${formatDecimal(value)} ${unit}`;
}

function shortRadarLabel(key: string, fallback: string): string {
  switch (key) {
    case 'rent_eur_m2':
      return 'Precio';
    case 'distance_km':
      return 'Cercanía';
    case 'air_no2':
      return 'Aire';
    case 'transit_stops':
      return 'Metro';
    case 'services_count':
      return 'Servicios';
    default:
      return fallback;
  }
}

export function AreaDetailPanel({
  area,
  indicators,
  sources,
  budget,
  housingType,
  referenceM2,
  onBack,
}: AreaDetailPanelProps) {
  const [detail, setDetail] = useState<AreaDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!area?.id) {
      setDetail(null);
      return;
    }
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
  }, [area?.id]);

  const sourcesById = useMemo(() => {
    const map: Record<string, SourceInfo> = {};
    for (const s of sources) {
      map[s.id] = s;
    }
    return map;
  }, [sources]);

  // Build radar dataset comparing selected neighborhood vs Madrid median (0–10 relative visual scale, no %)
  const radarData = useMemo(() => {
    if (!area || !detail) return [];
    const points: {
      axis: string;
      areaScore: number;
      medianScore: number;
      areaLabel: string;
      medianLabel: string;
    }[] = [];

    for (const ind of indicators) {
      const areaVal = detail.values[ind.key];
      const medianVal = detail.city_median?.[ind.key];
      if (areaVal == null || medianVal == null || medianVal === 0) continue;

      // Relative index centered at 5.0 for Madrid median; >5 means better than median
      const ratio = ind.higher_is_better ? areaVal / medianVal : medianVal / areaVal;
      const clampedArea = Math.max(1.5, Math.min(10, Number((ratio * 5).toFixed(1))));

      points.push({
        axis: shortRadarLabel(ind.key, ind.label),
        areaScore: clampedArea,
        medianScore: 5,
        areaLabel: formatIndicatorValue(ind.key, areaVal, ind.unit),
        medianLabel: formatIndicatorValue(ind.key, medianVal, ind.unit),
      });
    }

    return points;
  }, [area, detail, indicators]);

  if (!area) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <MapPin className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-lg font-semibold text-ink">
          Explora Madrid en el mapa
        </h2>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted">
          Selecciona cualquier barrio para ver qué te da tu presupuesto allí y saltar directo a los
          anuncios.
        </p>
      </div>
    );
  }

  const fitLevel = getFitLevel(area.score, area.excluded);
  const m2Used = referenceM2 ?? HOUSING_REFERENCE_M2[housingType];
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
    <div className="flex h-full flex-col overflow-y-auto p-5">
      {/* Back to top 3 + qualitative fit pill */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Volver al top 3
        </button>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            fitLevel === 'alto'
              ? 'bg-accent-soft text-accent'
              : fitLevel === 'excluido'
                ? 'bg-surface-subtle text-muted'
                : 'bg-info-soft text-info'
          }`}
        >
          {getFitLabel(fitLevel)}
        </span>
      </div>

      {/* Area Title */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold tabular-nums ${
              area.rank === 1 ? 'bg-accent text-surface' : 'bg-surface-subtle text-ink'
            }`}
          >
            #{area.rank}
          </span>
          <span className="text-xs text-muted">{area.district}</span>
        </div>
        <h2 className="font-serif mt-1.5 text-2xl leading-tight font-semibold text-ink">
          {area.name}
        </h2>
      </div>

      {/* Hero Budget Card */}
      <section className="mt-4 rounded-2xl border border-border bg-canvas p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted">
            Esto es lo que te da tu presupuesto aquí
          </p>
          {area.fits_budget !== null && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                area.fits_budget ? 'bg-fit-soft text-fit' : 'bg-nofit-soft text-nofit'
              }`}
            >
              {area.fits_budget ? 'Encaja' : 'Por encima'}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-serif text-3xl font-semibold text-ink">
            {area.est_rent_eur_month != null ? (
              <>
                ~
                <AnimatedNumber
                  value={area.est_rent_eur_month}
                  formatter={(n) => formatEuro(n)}
                />
              </>
            ) : (
              'Sin dato'
            )}
          </span>
          <span className="text-xs text-muted">
            /mes · {HOUSING_TYPE_LABELS[housingType].toLowerCase()}
          </span>
        </div>

        {area.affordable_m2 != null && (
          <p className="mt-2 text-xs leading-relaxed text-ink">
            Con <strong>{formatEuro(budget)}</strong> te da para aprox.{' '}
            <strong className="tabular-nums">~{formatDecimal(area.affordable_m2)} m²</strong>.
          </p>
        )}

        <p className="mt-1.5 text-[11px] text-muted">
          Estimación con datos oficiales (referencia de {m2Used} m²).
        </p>

        {/* Primary CTA */}
        {primaryLink && (
          <a
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-surface shadow-card transition duration-150 ease-out hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span>Ver pisos en esta zona</span>
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          </a>
        )}

        {secondaryLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {secondaryLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition duration-150 hover:border-accent-border hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <span>{link.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Recharts Radar: Barrio vs Mediana de Madrid (rendered when >= 3 indicators available) */}
      {detailLoading ? (
        <div className="mt-5 h-44 animate-pulse rounded-2xl border border-border bg-canvas" />
      ) : (
        radarData.length >= 3 && (
          <section className="mt-5 rounded-2xl border border-border bg-canvas p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-ink">Frente a la mediana de Madrid</h3>
              <div className="flex items-center gap-3 text-[10px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  Este barrio
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted/60" />
                  Mediana
                </span>
              </div>
            </div>

            <div className="mt-1 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="68%">
                  <PolarGrid stroke="#E7E5E0" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: '#5B6170', fontSize: 11 }}
                  />
                  <Radar
                    name="Mediana Madrid"
                    dataKey="medianScore"
                    stroke="#5B6170"
                    strokeDasharray="3 3"
                    fill="#5B6170"
                    fillOpacity={0.08}
                  />
                  <Radar
                    name={area.name}
                    dataKey="areaScore"
                    stroke="#B8862B"
                    strokeWidth={2}
                    fill="#B8862B"
                    fillOpacity={0.22}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as (typeof radarData)[number];
                      return (
                        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-[11px] shadow-floating">
                          <div className="font-semibold text-ink">{item.axis}</div>
                          <div className="mt-0.5 text-ink tabular-nums">
                            Barrio: <strong>{item.areaLabel}</strong>
                          </div>
                          <div className="text-muted tabular-nums">
                            Mediana Madrid: {item.medianLabel}
                          </div>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )
      )}

      {/* Thin proportional indicator bars with real units, median comparison, notes & source links */}
      <section className="mt-5 space-y-3.5">
        <h3 className="text-xs font-medium text-muted">Desglose con datos reales</h3>
        <div className="space-y-3.5">
          {indicatorRows.map((row) => {
            const barWidth = Math.max(8, Math.min(100, Math.round(row.normalized * 100)));
            return (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="font-medium text-ink tabular-nums">
                    {formatIndicatorValue(row.key, row.value, row.unit)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-200 ease-out"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    {row.medianValue != null && (
                      <span className="tabular-nums">
                        Mediana Madrid: {formatIndicatorValue(row.key, row.medianValue, row.unit)}
                      </span>
                    )}
                    {row.note && (
                      <span className="inline-flex items-center gap-0.5 text-muted">
                        {row.medianValue != null && ' · '}
                        <Info className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        {row.note}
                      </span>
                    )}
                  </span>

                  {row.source && (
                    <a
                      href={row.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
                    >
                      <span>Fuente</span>
                      <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Official Sources + Mandatory CRTM Attribution */}
      {sources.length > 0 && (
        <section className="mt-5 border-t border-border pt-4">
          <h3 className="text-[11px] font-medium text-muted">Fuentes oficiales</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((src) => (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] text-muted transition hover:border-accent-border hover:text-ink"
              >
                <span>{src.publisher}</span>
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              </a>
            ))}
          </div>

          {hasCrtm && (
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              Transporte:{' '}
              <a
                href="https://www.crtm.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline decoration-border underline-offset-2 hover:text-accent"
              >
                Powered by CRTM
              </a>
              . Datos transformados y agregados por barrio a partir de fuentes abiertas oficiales.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
