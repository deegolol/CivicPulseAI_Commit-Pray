/**
 * Editorial comparison modal for 2–3 Madrid neighborhoods (T13 + T24).
 * Overlaid Recharts RadarChart + side-by-side real-unit comparison table (zero %).
 */
import { useEffect, useMemo } from 'react';
import { ExternalLink, Scale, X } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { HousingType, IndicatorMeta, ScoreResultItem } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
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

interface CompareModalProps {
  areas: ScoreResultItem[];
  indicators: IndicatorMeta[];
  housingType: HousingType;
  onRemove: (areaId: string) => void;
  onClose: () => void;
}

/** 3 clean urban series colors (blue, fit-green, ink) */
const SERIES_COLORS = ['#1F4FD6', '#12805C', '#0D1117'] as const;

function shortAxisLabel(key: string, fallback: string): string {
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

function formatCellValue(key: string, value: number | null | undefined, unit: string): string {
  if (value == null) return 'Sin dato';
  if (key === 'rent_eur_m2') return formatEuroPerM2(value);
  if (key === 'distance_km') return formatKm(value);
  if (key === 'air_no2') return `${formatInteger(value)} µg/m³ (${getAirQualityLabel(value)})`;
  if (key === 'transit_stops') return `${formatDecimal(value)} est./km²`;
  if (key === 'services_count') return `${formatInteger(value)}`;
  return `${formatDecimal(value)} ${unit}`;
}

export function CompareModal({
  areas,
  indicators,
  housingType,
  onRemove,
  onClose,
}: CompareModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const allMetrics = useMemo(
    () => [
      { key: 'distance_km', label: 'Distancia al campus', unit: 'km', higherIsBetter: false },
      ...indicators.map((ind) => ({
        key: ind.key,
        label: ind.label,
        unit: ind.unit,
        higherIsBetter: ind.higher_is_better,
      })),
    ],
    [indicators],
  );

  // Build overlaid radar dataset using normalized 0–10 scale (no %)
  const radarData = useMemo(() => {
    return allMetrics.map((metric) => {
      const row: Record<string, string | number> = {
        axis: shortAxisLabel(metric.key, metric.label),
      };
      areas.forEach((area, idx) => {
        const norm = area.breakdown[metric.key]?.normalized ?? 0.5;
        row[`s${idx}`] = Number((norm * 10).toFixed(1));
        const raw =
          metric.key === 'distance_km'
            ? area.distance_km
            : (area.breakdown[metric.key]?.value ?? null);
        row[`label${idx}`] = formatCellValue(metric.key, raw, metric.unit);
      });
      return row;
    });
  }, [allMetrics, areas]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comparador de barrios"
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-ink/35"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-border bg-bg shadow-popover">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface text-ink">
              <Scale className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Comparativa de zonas
              </h2>
              <p className="text-xs text-muted">
                Comparando {areas.length} barrios en unidades reales ({HOUSING_TYPE_LABELS[housingType].toLowerCase()})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comparador"
            className="flex h-10 w-10 items-center justify-center rounded-[8px] text-muted transition hover:bg-surface hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Legend chips */}
          <div className="flex flex-wrap gap-2">
            {areas.map((area, idx) => (
              <div
                key={area.id}
                className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-surface py-1.5 pr-2 pl-3 text-xs font-medium text-ink"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                />
                <span>{area.name}</span>
                <span className="text-muted">({area.district})</span>
                {areas.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemove(area.id)}
                    aria-label={`Quitar ${area.name}`}
                    className="ml-0.5 rounded-[6px] p-0.5 text-muted hover:bg-bg hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Overlaid Radar Chart (when >= 3 metrics) */}
          {radarData.length >= 3 && (
            <section className="rounded-[10px] border border-border bg-surface p-4">
              <h3 className="text-xs font-medium text-muted">
                Perfil comparado (más hacia fuera = mejor resultado en ese indicador)
              </h3>
              <div className="mt-2 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="74%">
                    <PolarGrid stroke="#E4E7EC" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: '#0D1117', fontSize: 12 }}
                    />
                    {areas.map((area, idx) => (
                      <Radar
                        key={area.id}
                        name={area.name}
                        dataKey={`s${idx}`}
                        stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                        strokeWidth={2}
                        fill={SERIES_COLORS[idx % SERIES_COLORS.length]}
                        fillOpacity={0.12}
                      />
                    ))}
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as Record<string, string>;
                        return (
                          <div className="rounded-[8px] border border-border bg-bg px-3 py-2 text-xs shadow-popover">
                            <div className="font-semibold text-ink">{row.axis}</div>
                            <div className="mt-1 space-y-0.5 tabular-nums">
                              {areas.map((area, idx) => (
                                <div key={area.id} className="flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length],
                                    }}
                                  />
                                  <span className="text-muted">{area.name}:</span>
                                  <span className="font-medium text-ink">
                                    {row[`label${idx}`]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Side-by-side table in real units */}
          <div className="overflow-x-auto rounded-[10px] border border-border">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 font-medium text-muted">Indicador</th>
                  {areas.map((area, idx) => (
                    <th key={area.id} className="px-4 py-3 font-semibold text-ink">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                        />
                        <span>{area.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg tabular-nums">
                {/* Estimated monthly rent row */}
                <tr>
                  <td className="px-4 py-3 font-medium text-muted">Coste estimado</td>
                  {areas.map((area) => (
                    <td key={area.id} className="px-4 py-3">
                      <div className="font-display text-base font-bold text-ink">
                        {area.est_rent_eur_month != null
                          ? `~${formatEuro(area.est_rent_eur_month)}/mes`
                          : 'Sin dato'}
                      </div>
                      {area.fits_budget !== null && (
                        <span
                          className={`mt-0.5 inline-block rounded-[6px] px-2 py-0.5 text-[10px] font-medium ${
                            area.fits_budget
                              ? 'bg-fit-soft text-fit'
                              : 'bg-over-soft text-over'
                          }`}
                        >
                          {area.fits_budget ? 'Encaja' : 'Por encima'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Qualitative fit row */}
                <tr>
                  <td className="px-4 py-3 font-medium text-muted">Ajuste a tu perfil</td>
                  {areas.map((area) => (
                    <td key={area.id} className="px-4 py-3 font-medium text-ink">
                      {getFitLabel(getFitLevel(area.score, area.excluded))}
                    </td>
                  ))}
                </tr>

                {/* All metric rows */}
                {allMetrics.map((metric) => {
                  const vals = areas.map((a) =>
                    metric.key === 'distance_km'
                      ? a.distance_km
                      : (a.breakdown[metric.key]?.value ?? null),
                  );
                  const numericVals = vals.filter((v): v is number => v != null);
                  const bestVal =
                    numericVals.length > 0
                      ? metric.higherIsBetter
                        ? Math.max(...numericVals)
                        : Math.min(...numericVals)
                      : null;

                  return (
                    <tr key={metric.key}>
                      <td className="px-4 py-3 font-medium text-muted">{metric.label}</td>
                      {areas.map((area, idx) => {
                        const v = vals[idx];
                        const isBest = bestVal !== null && v === bestVal && numericVals.length > 1;
                        return (
                          <td
                            key={area.id}
                            className={`px-4 py-3 ${
                              isBest ? 'font-semibold text-fit' : 'text-ink'
                            }`}
                          >
                            {formatCellValue(metric.key, v, metric.unit)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Listings link row */}
                <tr>
                  <td className="px-4 py-3 font-medium text-muted">Anuncios</td>
                  {areas.map((area) => {
                    const firstLink = area.listing_links[0];
                    return (
                      <td key={area.id} className="px-4 py-3">
                        {firstLink ? (
                          <a
                            href={firstLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                          >
                            <span>Ver pisos</span>
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
