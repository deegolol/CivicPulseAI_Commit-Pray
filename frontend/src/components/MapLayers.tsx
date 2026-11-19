/**
 * Student layers on the map (T30): supermarkets, gyms, shopping centres, parks, libraries, municipal sports,
 * Metro and main roads. Everything is drawn on one shared canvas (fast and smooth with ~2,000 points) and each
 * layer's static file is only downloaded the first time it is switched on.
 * Sources: OpenStreetMap (ODbL) for shops, gyms, parks and roads; CRTM for Metro; Ayuntamiento de Madrid for
 * libraries and municipal sports centres.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import officialPlaces from '../data/studentPlaces.json';

export type LayerId = 'supermarkets' | 'metro' | 'parks' | 'libraries' | 'gyms' | 'sports' | 'malls' | 'roads';

/** minZoom: places appear as you zoom in, so the whole city view stays readable. */
export const MAP_LAYERS: { id: LayerId; label: string; color: string; minZoom: number }[] = [
  { id: 'supermarkets', label: 'Supermercados', color: '#E07A1F', minZoom: 14 },
  { id: 'metro', label: 'Metro', color: '#2B4C9B', minZoom: 11 },
  { id: 'parks', label: 'Parques', color: '#3E9A57', minZoom: 13 },
  { id: 'libraries', label: 'Bibliotecas', color: '#1C8FA8', minZoom: 13 },
  { id: 'gyms', label: 'Gimnasios', color: '#8A4FC7', minZoom: 14 },
  { id: 'sports', label: 'Polideportivos', color: '#14877C', minZoom: 13 },
  { id: 'malls', label: 'Centros comerciales', color: '#CC4A86', minZoom: 12 },
  { id: 'roads', label: 'Carreteras', color: '#E3A13B', minZoom: 0 },
];
export const DEFAULT_LAYERS: LayerId[] = ['metro', 'supermarkets'];

type Point = [number, number, string];
type LayerData = { kind: 'points'; items: Point[] } | { kind: 'lines'; lines: [number, number][][] };

const official = officialPlaces as { kind: string; name: string; coords: [number, number] }[];
const cache = new Map<LayerId, Promise<LayerData>>();

function loadLayer(id: LayerId): Promise<LayerData> {
  if (!cache.has(id)) {
    let promise: Promise<LayerData>;
    if (id === 'libraries' || id === 'sports') {
      const kinds = id === 'libraries' ? ['library'] : ['sport', 'gym'];
      promise = Promise.resolve({
        kind: 'points',
        items: official.filter((p) => kinds.includes(p.kind)).map((p) => [p.coords[0], p.coords[1], p.name] as Point),
      });
    } else {
      promise = fetch(`/layers/${id}.json`).then((r) => r.json()).then((data) => (
        id === 'roads' ? { kind: 'lines', lines: data.lines } : { kind: 'points', items: data.items }
      ));
    }
    cache.set(id, promise);
  }
  return cache.get(id)!;
}

/** Draws the enabled layers. Points grow slightly with zoom; names show on hover. */
export function MapLayersOverlay({ enabled }: { enabled: Set<LayerId> }) {
  const map = useMap();
  const renderer = useMemo(() => L.canvas({ padding: 0.5, tolerance: 4 }), []);
  const groups = useRef(new Map<LayerId, L.LayerGroup>());

  useEffect(() => {
    if (!map.getPane('studentLayers')) {
      const pane = map.createPane('studentLayers');
      pane.style.zIndex = '420'; // above neighbourhood polygons (overlayPane 400), below markers (600)
    }
  }, [map]);

  // Show a layer only when it is switched on AND the map is zoomed in enough for it.
  const sync = useRef<() => void>(() => {});
  sync.current = () => {
    const zoom = map.getZoom();
    for (const layer of MAP_LAYERS) {
      const group = groups.current.get(layer.id);
      if (!group) continue;
      const show = enabled.has(layer.id) && zoom >= layer.minZoom;
      if (show && !map.hasLayer(group)) group.addTo(map);
      if (!show && map.hasLayer(group)) map.removeLayer(group);
    }
  };

  useEffect(() => {
    let cancelled = false;
    for (const layer of MAP_LAYERS) {
      if (!enabled.has(layer.id) || groups.current.has(layer.id)) continue;
      void loadLayer(layer.id).then((data) => {
        if (cancelled || groups.current.has(layer.id)) return;
        const group = L.layerGroup();
        if (data.kind === 'lines') {
          for (const line of data.lines) {
            L.polyline(line, { renderer, pane: 'studentLayers', color: layer.color, weight: 2.4, opacity: 0.75, interactive: false }).addTo(group);
          }
        } else {
          for (const [lat, lon, name] of data.items) {
            const marker = L.circleMarker([lat, lon], {
              renderer, pane: 'studentLayers', radius: 4.5, color: '#FFFFFF', weight: 1.5,
              fillColor: layer.color, fillOpacity: 0.95, bubblingMouseEvents: false,
            });
            marker.bindTooltip(`<strong>${name || layer.label}</strong><br><span style="color:#5D6673">${layer.label}</span>`,
              { direction: 'top', offset: [0, -4], className: 'clean-tooltip' });
            marker.addTo(group);
          }
        }
        groups.current.set(layer.id, group);
        sync.current();
      });
    }
    sync.current();
    return () => { cancelled = true; };
  }, [map, enabled, renderer]);

  useEffect(() => {
    const onZoom = () => sync.current();
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);

  // Points a bit bigger when zoomed in, smaller when zoomed out (keeps the city readable).
  useEffect(() => {
    const resize = () => {
      const z = map.getZoom();
      const radius = z >= 15 ? 6 : z >= 13 ? 4.5 : 3;
      groups.current.forEach((group) => group.eachLayer((l) => {
        if (l instanceof L.CircleMarker) l.setRadius(radius);
      }));
    };
    map.on('zoomend', resize);
    return () => { map.off('zoomend', resize); };
  }, [map]);

  useEffect(() => () => { groups.current.forEach((g) => map.removeLayer(g)); }, [map]);
  return null;
}

/** "Mostrar en el mapa" panel with one toggle per layer. Collapses to a button on small screens. */
export function MapLayersPanel({ enabled, onToggle }: { enabled: Set<LayerId>; onToggle: (id: LayerId) => void }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-border bg-bg px-4 text-sm font-semibold text-ink shadow-popover transition hover:bg-surface">
        <Layers size={16} aria-hidden="true" /> Mostrar en el mapa
      </button>
    );
  }
  return (
    <div className="pointer-events-auto w-60 rounded-2xl border border-border bg-bg p-3 shadow-popover">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold"><Layers size={15} aria-hidden="true" /> Mostrar en el mapa</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Ocultar capas" className="rounded-full p-1 text-muted hover:bg-surface hover:text-ink">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {MAP_LAYERS.map((layer) => {
          const on = enabled.has(layer.id);
          return (
            <button key={layer.id} type="button" role="switch" aria-checked={on} onClick={() => onToggle(layer.id)}
              className={'flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-surface ' + (on ? 'text-ink' : 'text-muted')}>
              <span className="flex items-center gap-2">
                {layer.id === 'roads'
                  ? <span className="h-1 w-3.5 rounded-full" style={{ background: layer.color }} />
                  : <span className="h-3 w-3 rounded-full border-2 border-bg shadow-[0_0_0_1px_rgba(13,17,23,0.15)]" style={{ background: layer.color }} />}
                {layer.label}
              </span>
              <span className={'relative h-5 w-9 rounded-full transition ' + (on ? 'bg-ink' : 'bg-border')}>
                <span className={'absolute top-0.5 h-4 w-4 rounded-full bg-bg shadow transition-all ' + (on ? 'left-[18px]' : 'left-0.5')} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-2 text-[11px] leading-snug text-muted">Acércate al mapa para ver los lugares.</p>
      <p className="mt-1 px-2 text-[10px] leading-snug text-muted">OpenStreetMap (ODbL) · CRTM · Ayuntamiento de Madrid</p>
    </div>
  );
}
