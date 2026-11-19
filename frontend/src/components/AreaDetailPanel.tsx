/** Inline criterion ratings and official source details for a neighborhood card. */
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { getAreaDetail } from '../api/client';
import type {
  AreaDetailResponse,
  HousingType,
  IndicatorMeta,
  ScoreResultItem,
  SourceInfo,
} from '../api/types';
import {
  formatDecimal,
  formatEuroPerM2,
  formatInteger,
  formatKm,
} from '../utils/format';
import { DistrictOffers, FavoriteButton, WatchZoneButton } from './AccountProvider';
import { normalizedToStars, StarRating } from './StarRating';

interface AreaDetailPanelProps {
  area: ScoreResultItem;
  indicators: IndicatorMeta[];
  activeCriteria: Set<string>;
  sources: SourceInfo[];
  budget: number;
  housingType: HousingType;
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
}: AreaDetailPanelProps) {
  const [detail, setDetail] = useState<AreaDetailResponse | null>(null);
  const [showTechData, setShowTechData] = useState(false);

  useEffect(() => {
    if (!showTechData) return;
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
  }, [area.id, showTechData]);

  const sourcesById = useMemo(() => {
    const map: Record<string, SourceInfo> = {};
    for (const s of sources) map[s.id] = s;
    return map;
  }, [sources]);

  const hasCrtm = activeCriteria.has('transit_stops') && Boolean(sourcesById.crtm);

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
    <div className="mt-3 border-t border-border pt-3">
    {/* Clean 0–5 Star Ratings section (no noisy technical units) */}
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-ink">Valoración del barrio</h3>
      <div className="divide-y divide-border rounded-[10px] border border-border bg-bg">
        {ratingRows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 px-3 py-2"
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
    <section className="mt-2">
      <button
        type="button"
        aria-expanded={showTechData}
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

      {hasCrtm && showTechData && (
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
      <div className="flex flex-wrap items-center gap-2 [&:empty]:hidden">
        <FavoriteButton target={{ area_id: area.id, housing_type: housingType, budget_eur_month: budget }} />
        <WatchZoneButton watch={{
          area_id: area.id,
          area_name: area.name,
          housing_type: housingType,
          budget_eur_month: Math.round(budget),
        }} />
      </div>
      <DistrictOffers district={area.district} housingType={housingType} />
    </div>
  );
}
