/**
 * Small, honest facts shown on every zone card: real door-to-door minutes (public transport and car), the
 * official flat rent only when SERPAVI publishes it, and real listings we checked by hand (with date and link).
 * We never show a price of our own making.
 */
import { Car, ExternalLink, TrainFront } from 'lucide-react';
import type { HousingType, ScoreResultItem } from '../api/types';
import realListings from '../data/realListings.json';
import { formatEuro, formatKm, formatMinutes } from '../utils/format';

type Listing = { title: string; price_eur_month: number; source: string; url: string; seen_on: string };
const LISTINGS = realListings.areas as Record<string, Listing[]>;

/** Real room listings in this zone's DISTRICT within the budget, cheapest first. District level on purpose: it is
 *  exactly what the "Ver pisos" links open (portals search by district), so "desde X €" matches what you see there. */
export function listingsFor(areaId: string, budget: number | null = null): Listing[] {
  const district = areaId.slice(0, 2);  // area ids = 2-digit district + barrio digit
  return Object.entries(LISTINGS)
    .filter(([id]) => id.slice(0, 2) === district)
    .flatMap(([, items]) => items)
    .filter((l) => budget === null || l.price_eur_month <= budget)
    .sort((a, b) => a.price_eur_month - b.price_eur_month);
}

/** "🚇 25 min · 🚗 12 min" with icons; falls back to km by road. */
export function TravelTimes({ area, className = '' }: { area: ScoreResultItem; className?: string }) {
  if (area.transit_min == null) return <span className={className}>{formatKm(area.distance_km)} de tu campus</span>;
  return (
    <span className={'inline-flex flex-wrap items-center gap-x-2 tabular-nums ' + className}>
      <span title="Distancia por carretera">{formatKm(area.distance_km)}</span>
      <span aria-hidden="true">·</span>
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

/** The big number on a card is a price that matches what you search, never something else:
 *  rooms → cheapest real listing within your budget; whole flats → official rent of that barrio. */
export function HeroFigure({ area, budget, housingType, large = false }: {
  area: ScoreResultItem; budget: number | null; housingType: HousingType; large?: boolean;
}) {
  const size = large ? 'text-2xl' : 'text-xl';
  const listings = housingType === 'room' ? listingsFor(area.id, budget) : [];
  const estimated = (area.rent_basis ?? '').startsWith('Estimado');
  const price = listings.length ? Math.min(...listings.map((l) => l.price_eur_month)) : area.est_rent_eur_month;
  const caption = listings.length ? `anuncio real en ${[...new Set(listings.filter((l) => l.price_eur_month === price).map((l) => l.source))].join(' y ')} · ${area.district}` : estimated ? 'precio estimado' : 'alquiler oficial de un piso aquí';
  if (price == null) {
    return <div className="text-right text-sm font-semibold text-muted">Sin dato de precio</div>;
  }
  return (
    <div className="text-right">
      <div className={`font-display ${size} font-bold text-ink tabular-nums`}>
        {listings.length ? <span className="mr-1 font-sans text-sm font-semibold text-muted">desde</span> : null}
        {!listings.length && estimated ? '~' : ''}{formatEuro(price)}<span className="font-sans text-xs font-normal text-muted">/mes</span>
      </div>
      <div className="text-[11px] text-muted">{caption}</div>
    </div>
  );
}

/** Real listings checked by hand for this zone (only some zones have them). */
export function RealListings({ areaId, budget, housingType }: { areaId: string; budget: number | null; housingType: HousingType }) {
  const listings = housingType === 'room' ? listingsFor(areaId, budget) : [];
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
      <p className="mt-1 text-[10px] text-muted">Anuncios publicados en {[...new Set(listings.map((l) => l.source))].join(', ')} · vistos el {[...new Set(listings.map((l) => l.seen_on))].join(', ')}. Pueden haber cambiado.</p>
    </div>
  );
}
