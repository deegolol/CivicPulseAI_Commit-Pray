/**
 * Small, honest facts shown on every zone card: real door-to-door minutes (public transport and car), the
 * official flat rent only when SERPAVI publishes it, and real listings we checked by hand (with date and link).
 * We never show a price of our own making.
 */
import { Car, ExternalLink, TrainFront } from 'lucide-react';
import type { ScoreResultItem } from '../api/types';
import realListings from '../data/realListings.json';
import { formatEuro, formatKm, formatMinutes } from '../utils/format';

type Listing = { title: string; price_eur_month: number; source: string; url: string; seen_on: string };
const LISTINGS = realListings.areas as Record<string, Listing[]>;

export function listingsFor(areaId: string): Listing[] {
  return LISTINGS[areaId] ?? [];
}

/** "🚇 25 min · 🚗 12 min" with icons; falls back to km by road. */
export function TravelTimes({ area, className = '' }: { area: ScoreResultItem; className?: string }) {
  if (area.transit_min == null) return <span className={className}>{formatKm(area.distance_km)} de tu campus</span>;
  return (
    <span className={'inline-flex items-center gap-2 tabular-nums ' + className}>
      <span className="inline-flex items-center gap-1" title="Transporte público, día laborable en hora punta">
        <TrainFront size={13} aria-hidden="true" /> {formatMinutes(area.transit_min)}
      </span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1" title="En coche, sin tráfico">
        <Car size={13} aria-hidden="true" /> {formatMinutes(area.car_min)}
      </span>
      <span className="sr-only">hasta tu campus</span>
    </span>
  );
}

/** The big number on a card: the cheapest real listing we checked, the official flat rent, or the travel time. */
export function HeroFigure({ area, large = false }: { area: ScoreResultItem; large?: boolean }) {
  const size = large ? 'text-2xl' : 'text-xl';
  const listings = listingsFor(area.id);
  if (listings.length) {
    const cheapest = Math.min(...listings.map((l) => l.price_eur_month));
    return (
      <div className="text-right">
        <div className={`font-display ${size} font-bold text-ink tabular-nums`}>
          {formatEuro(cheapest)}<span className="font-sans text-xs font-normal text-muted">/mes</span>
        </div>
        <div className="text-[11px] text-muted">anuncio real más barato</div>
      </div>
    );
  }
  if (area.est_rent_eur_month != null) {
    return (
      <div className="text-right">
        <div className={`font-display ${size} font-bold text-ink tabular-nums`}>
          {formatEuro(area.est_rent_eur_month)}<span className="font-sans text-xs font-normal text-muted">/mes</span>
        </div>
        <div className="text-[11px] text-muted">mediana oficial de pisos</div>
      </div>
    );
  }
  const byCar = area.travel_min != null && area.travel_min === area.car_min && area.car_min !== area.transit_min;
  return (
    <div className="text-right">
      <div className={`font-display ${size} font-bold text-ink tabular-nums`}>{area.travel_min != null ? formatMinutes(area.travel_min) : formatKm(area.distance_km)}</div>
      <div className="text-[11px] text-muted">{byCar ? 'en coche' : 'en transporte público'}</div>
    </div>
  );
}

/** Real listings checked by hand for this zone (only some zones have them). */
export function RealListings({ areaId }: { areaId: string }) {
  const listings = listingsFor(areaId);
  if (!listings.length) return null;
  return (
    <div className="mt-3 rounded-[8px] border border-border bg-surface px-3 py-2">
      <p className="text-[11px] font-semibold text-ink">Pisos reales en esta zona</p>
      <ul className="mt-1 space-y-1">
        {listings.map((listing) => (
          <li key={listing.url}>
            <a href={listing.url} target="_blank" rel="noopener noreferrer"
              className="flex items-baseline justify-between gap-2 text-xs text-ink hover:underline">
              <span className="min-w-0 truncate">{listing.title}</span>
              <span className="inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                {formatEuro(listing.price_eur_month)}/mes <ExternalLink size={11} className="text-muted" aria-hidden="true" />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-muted">Anuncios publicados en {[...new Set(listings.map((l) => l.source))].join(', ')} · vistos el {listings[0].seen_on}. Pueden haber cambiado.</p>
    </div>
  );
}
