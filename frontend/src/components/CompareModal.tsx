/**
 * Clean side-by-side comparison modal for 2–3 Madrid neighborhoods.
 * Shows protagonist ~€/mes price, distance in km, and fractional 0–5 Star Ratings for every dimension,
 * plus an overlaid radar chart and direct "Ver pisos" links. Zero technical unit clutter.
 */
import { useEffect, useMemo, useRef } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { ExternalLink, Scale, X } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { HousingType, IndicatorMeta, ScoreResultItem } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';
import { formatEuro, formatKm, formatMinutes } from '../utils/format';
import { normalizedToStars, StarRating } from './StarRating';

interface CompareModalProps {
  areas: ScoreResultItem[];
  indicators: IndicatorMeta[];
  activeCriteria: Set<string>;
  housingType: HousingType;
  budget: number;
  onRemove: (areaId: string) => void;
  onClose: () => void;
}

const SERIES_COLORS = ['#D7262E', '#1F4FD6', '#12805C'] as const;

const FRIENDLY_LABELS: Record<string, string> = {
  rent_eur_m2: 'Precio',
  distance_km: 'Tiempo al campus',
  air_no2: 'Calidad del aire',
  transit_stops: 'Metro',
  services_count: 'Servicios y deporte',
};

export function CompareModal({
  areas,
  indicators,
  activeCriteria,
  housingType,
  budget,
  onRemove,
  onClose,
}: CompareModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  const allMetrics = useMemo(
    () => [
      { key: 'distance_km', label: FRIENDLY_LABELS.distance_km },
      ...indicators.map((ind) => ({
        key: ind.key,
        label: FRIENDLY_LABELS[ind.key] ?? ind.label,
      })),
    ].filter((metric) => activeCriteria.has(metric.key)),
    [indicators, activeCriteria],
  );

  const radarData = useMemo(() => {
    return allMetrics.map((metric) => {
      const row: Record<string, string | number | null> = { axis: metric.label };
      areas.forEach((area, idx) => {
        const item = area.breakdown[metric.key];
        row[`s${idx}`] = item?.value != null ? normalizedToStars(item.normalized) : null;
      });
      return row;
    });
  }, [allMetrics, areas]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Comparador de barrios"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="compare-motion-dialog backdrop:bg-transparent"
    >
      <m.div
        aria-hidden="true"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: reduced ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.17 }}
        className="fixed inset-0 bg-ink/35"
        onClick={onClose}
      />

      <m.div
        data-ui-motion="comparison"
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.99, transition: { duration: reduced ? 0 : 0.16 } }}
        transition={{ duration: reduced ? 0 : 0.23 }}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-border bg-bg text-ink shadow-popover"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface text-ink">
              <Scale className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Comparativa rápida
              </h2>
              <p className="text-xs text-muted">
                {areas.length} zonas valoradas sobre 5 estrellas ({HOUSING_TYPE_LABELS[housingType].toLowerCase()})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comparador"
            autoFocus
            className="flex h-10 w-10 items-center justify-center rounded-[8px] text-muted transition hover:bg-surface hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
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

          {/* Side-by-side table with Star Ratings */}
          <div className="overflow-x-auto rounded-[10px] border border-border">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 font-medium text-muted">Qué comparamos</th>
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
                <tr className="bg-brand-soft">
                  <th scope="row" className="px-4 py-4 font-display text-sm font-bold text-ink">Valoración global</th>
                  {areas.map((area) => (
                    <td key={area.id} className="px-4 py-4">
                      <StarRating value={normalizedToStars(area.score / 100)} size="lg" />
                    </td>
                  ))}
                </tr>

                {activeCriteria.has('rent_eur_m2') && <tr>
                  <td className="px-4 py-3 font-medium text-muted">Precio oficial (pisos)</td>
                  {areas.map((area) => {
                    const over =
                      area.est_rent_eur_month != null && area.est_rent_eur_month > budget
                        ? Math.round(area.est_rent_eur_month - budget)
                        : 0;
                    return (
                      <td key={area.id} className="px-4 py-3">
                        <div className="font-display text-base font-bold text-ink">
                          {area.est_rent_eur_month != null
                            ? `${formatEuro(area.est_rent_eur_month)}/mes`
                            : area.rent_median_eur_month != null
                              ? <span className="font-sans text-xs font-normal text-muted">Pisos: {formatEuro(area.rent_median_eur_month)}/mes (mediana oficial)</span>
                              : 'Sin dato oficial'}
                        </div>
                        {area.est_rent_eur_month != null && (
                          <span
                            className={`mt-0.5 inline-block rounded-[6px] px-2 py-0.5 text-[10px] font-medium ${
                              over === 0 ? 'bg-fit-soft text-fit' : 'bg-over-soft text-over'
                            }`}
                          >
                            {over === 0 ? 'Encaja' : `Se pasa ${formatEuro(over)}`}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>}

                {/* Real travel times */}
                {activeCriteria.has('distance_km') && <tr>
                  <td className="px-4 py-3 font-medium text-muted">Tiempo hasta el campus</td>
                  {areas.map((area) => (
                    <td key={area.id} className="px-4 py-3 font-semibold text-ink">
                      {area.transit_min != null
                        ? <>{formatMinutes(area.transit_min)} <span className="font-normal text-muted">transporte</span><br />{formatMinutes(area.car_min)} <span className="font-normal text-muted">coche</span></>
                        : formatKm(area.distance_km)}
                    </td>
                  ))}
                </tr>}

                {/* Fractional 0–5 Star Ratings per dimension */}
                {allMetrics.map((metric) => (
                  <tr key={metric.key}>
                    <td className="px-4 py-3 font-medium text-muted">{metric.label}</td>
                    {areas.map((area) => {
                      const item = area.breakdown[metric.key];
                      return (
                        <td key={area.id} className="px-4 py-3">
                          {item?.value != null
                            ? <StarRating value={normalizedToStars(item.normalized)} size="sm" />
                            : <span className="text-muted">Sin dato</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Direct listing link */}
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

          {/* Visual Radar overview below the star table */}
          {radarData.length >= 3 && (
            <section className="rounded-[10px] border border-border bg-surface p-4">
              <h3 className="text-xs font-medium text-muted">
                Perfil visual (0 a 5 estrellas por criterio)
              </h3>
              <div className="mt-1 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#E4E7EC" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: '#0D1117', fontSize: 12 }} />
                    {areas.map((area, idx) => (
                      <Radar
                        key={area.id}
                        name={area.name}
                        dataKey={`s${idx}`}
                        stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                        strokeWidth={2}
                        isAnimationActive={!reduced}
                        fill={SERIES_COLORS[idx % SERIES_COLORS.length]}
                        fillOpacity={0.12}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>
      </m.div>
    </dialog>
  );
}
