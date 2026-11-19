/**
 * Neighborhood detail panel (right sidebar on desktop, bottom sheet on mobile).
 * Highlights the student's budget estimate ("Con tu presupuesto: ~X €/mes") and listing links.
 */
import { ExternalLink, MapPin, Sparkles, X } from 'lucide-react';
import type { HousingType, IndicatorMeta, ScoreResultItem } from '../api/types';
import { HOUSING_TYPE_LABELS } from '../config';

interface AreaDetailPanelProps {
  area: ScoreResultItem | null;
  indicators: IndicatorMeta[];
  budget: number;
  housingType: HousingType;
  onClose: () => void;
}

export function AreaDetailPanel({
  area,
  indicators,
  budget,
  housingType,
  onClose,
}: AreaDetailPanelProps) {
  if (!area) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <MapPin className="h-6 w-6" />
        </div>
        <h2 className="font-display text-base font-bold text-slate-900">
          Explora un barrio en el mapa
        </h2>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-slate-500">
          Haz clic en cualquier zona de Madrid para ver cuánto cuesta vivir allí con tu presupuesto
          y acceder a pisos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
              #{area.rank}
            </span>
            <span className="text-xs font-medium text-slate-500">{area.district}</span>
          </div>
          <h2 className="font-display mt-1 text-lg font-bold text-slate-900">{area.name}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-teal-50 px-2.5 py-1 text-right">
            <div className="font-display text-base font-extrabold text-teal-700">
              {area.excluded ? '—' : area.score.toFixed(0)}
            </div>
            <div className="text-[10px] font-medium text-teal-700/80">/ 100</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Budget highlight card */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Con tu presupuesto ({budget} €)
          </span>
          {area.fits_budget !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                area.fits_budget
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {area.fits_budget ? 'Encaja' : 'Ajustado'}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold text-slate-900">
            {area.est_rent_eur_month != null ? `~${area.est_rent_eur_month} €/mes` : 'Sin dato'}
          </span>
          <span className="text-xs text-slate-500">
            ({HOUSING_TYPE_LABELS[housingType].toLowerCase()})
          </span>
        </div>

        {area.affordable_m2 != null && (
          <p className="mt-1 text-xs text-slate-600">
            Te da para aprox. <strong>~{area.affordable_m2} m²</strong> según datos oficiales.
          </p>
        )}
      </div>

      {/* Indicator values */}
      <div className="mt-4 space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
          Indicadores clave
        </h3>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-slate-600">Distancia al campus</span>
            <span className="font-semibold text-slate-900">{area.distance_km} km</span>
          </div>
          {indicators.map((ind) => {
            const item = area.breakdown[ind.key];
            return (
              <div key={ind.key} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-slate-600">{ind.label}</span>
                <span className="font-semibold text-slate-900">
                  {item?.value != null ? `${item.value} ${ind.unit}` : 'Sin dato'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Listing links CTA */}
      <div className="mt-5 space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Ver pisos en esta zona
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {area.listing_links.map((link, idx) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                idx === 0
                  ? 'bg-teal-600 text-white shadow-xs hover:bg-teal-700'
                  : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>Ver pisos en {link.label}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
