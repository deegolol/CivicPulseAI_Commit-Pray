/**
 * Student layers on the map (T30): supermarkets, gyms, shopping centres, parks, libraries, municipal sports,
 * Metro and main roads. Everything is drawn on one shared canvas (fast and smooth with ~2,000 points) and each
 * layer's static file is only downloaded the first time it is switched on.
 * Sources: OpenStreetMap (ODbL) for shops, gyms, parks and roads; CRTM for Metro; Ayuntamiento de Madrid for
 * libraries and municipal sports centres.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Dumbbell, Layers, Trophy, TreePine, X, type LucideIcon } from 'lucide-react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import officialPlaces from '../data/studentPlaces.json';

export type LayerId = 'supermarkets' | 'metro' | 'parks' | 'libraries' | 'gyms' | 'sports' | 'malls' | 'roads';

/** Icon per layer (24×24 line icons, white on the layer colour). */
const ICONS: Record<Exclude<LayerId, 'roads'>, string> = {
  supermarkets: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.5l2.6 11.4a1.8 1.8 0 0 0 1.8 1.4h8.4a1.8 1.8 0 0 0 1.8-1.4L21 7H6"/>',
  metro: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 14h.01M15 14h.01M8 21l2-4M16 21l-2-4"/>',
  parks: '<path d="m12 3 4.5 6.5h-2.5l5 7H5l5-7H7.5z"/><path d="M12 16.5V21"/>',
  libraries: '<path d="M12 6v14M3.5 5H8a4 4 0 0 1 4 2 4 4 0 0 1 4-2h4.5v13H16a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3.5z"/>',
  gyms: '<path d="M6.5 6.5l11 11M3 9l6-6M15 21l6-6M2 12l3-3M19 22l3-3M9 3l3 3M12 18l3 3"/>',
  sports: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c3 2.5 3 14.5 0 17M3.5 12h17M6 6c3 2 9 2 12 0M6 18c3-2 9-2 12 0"/>',
  malls: '<path d="M6 7h12l1.2 13.2a1 1 0 0 1-1 1.1H5.8a1 1 0 0 1-1-1.1z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
};
const iconCache = new Map<string, L.DivIcon>();
function iconFor(id: Exclude<LayerId, 'roads'>, color: string) {
  if (!iconCache.has(id)) {
    iconCache.set(id, L.divIcon({
      className: 'student-place-pin',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `<span style="background:${color}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</svg></span>`,
    }));
  }
  return iconCache.get(id)!;
}
const MAX_ICONS = 260; // DOM markers are only created for what is on screen, thinned so they don't overlap

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
const SHORTCUT_ICONS: Partial<Record<LayerId, LucideIcon>> = {
  parks: TreePine, libraries: BookOpen, gyms: Dumbbell, sports: Trophy,
};
const SHORTCUT_LAYERS = MAP_LAYERS.flatMap((layer) => {
  const Icon = SHORTCUT_ICONS[layer.id];
  return Icon ? [{ ...layer, Icon }] : [];
});
const OTHER_LAYERS = MAP_LAYERS.filter(({ id }) => !SHORTCUT_ICONS[id]);

export const DEFAULT_LAYERS: LayerId[] = ['metro', 'supermarkets', ...SHORTCUT_LAYERS.map(({ id }) => id)];

const layerLabelClass = "relative after:absolute after:inset-x-0 after:top-1/2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:content-[''] data-[hidden=true]:after:scale-x-100 motion-reduce:after:transition-none";

type Point = [number, number, string];
type LayerData = { kind: 'points'; items: Point[] } | { kind: 'lines'; lines: [number, number][][] };

const official = officialPlaces as { kind: string; name: string; coords: [number, number] }[];
const cache = new Map<LayerId, Promise<LayerData>>();

function loadLayer(id: LayerId): Promise<LayerData> {
  if (!cache.has(id)) {
    const municipalPoints = (kind: string) => official.filter((place) => place.kind === kind)
      .map((place): Point => [place.coords[0], place.coords[1], place.name]);
    let promise: Promise<LayerData>;
    if (id === 'libraries' || id === 'sports') {
      promise = Promise.resolve({ kind: 'points', items: municipalPoints(id === 'libraries' ? 'library' : 'sport') });
    } else {
      promise = fetch(`/layers/${id}.json`).then((response) => {
        if (!response.ok) throw new Error(`Could not load map layer: ${id}`);
        return response.json();
      }).then((data) => (
        id === 'roads'
          ? { kind: 'lines', lines: data.lines }
          : { kind: 'points', items: id === 'gyms' ? [...data.items, ...municipalPoints('gym')] : data.items }
      ));
    }
    cache.set(id, promise.catch((error) => {
      cache.delete(id);
      throw error;
    }));
  }
  return cache.get(id)!;
}

/** Draws the enabled layers: icons for places (only those on screen, thinned) and lines for roads (canvas). */
export function MapLayersOverlay({ enabled }: { enabled: ReadonlySet<LayerId> }) {
  const map = useMap();
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const data = useRef(new Map<LayerId, LayerData>());
  const roads = useRef<L.LayerGroup | null>(null);
  const icons = useRef<L.LayerGroup>(L.layerGroup());
  const markers = useRef(new Map<string, L.Marker>());
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    if (!map.getPane('studentLayers')) map.createPane('studentLayers').style.zIndex = '420';
    icons.current.addTo(map);
    const group = icons.current;
    return () => { group.remove(); roads.current?.remove(); };
  }, [map]);

  // Download each layer the first time it is switched on.
  useEffect(() => {
    let cancelled = false;
    for (const layer of MAP_LAYERS) {
      if (!enabled.has(layer.id) || data.current.has(layer.id)) continue;
      void loadLayer(layer.id).then((d) => {
        if (cancelled || data.current.has(layer.id)) return;
        data.current.set(layer.id, d);
        setLoaded((n) => n + 1);
      }).catch((error) => {
        if (!cancelled) console.warn(error);
      });
    }
    return () => { cancelled = true; };
  }, [enabled]);

  // Roads: one canvas layer.
  useEffect(() => {
    const d = data.current.get('roads');
    if (enabled.has('roads') && d?.kind === 'lines') {
      if (!roads.current) {
        const color = MAP_LAYERS.find((l) => l.id === 'roads')!.color;
        roads.current = L.layerGroup(d.lines.map((line) =>
          L.polyline(line, { renderer, pane: 'studentLayers', color, weight: 2.4, opacity: 0.75, interactive: false })));
      }
      roads.current.addTo(map);
    } else {
      roads.current?.remove();
    }
  }, [map, enabled, loaded, renderer]);

  // Place icons: recompute what is visible after each move/zoom, reusing existing markers.
  useEffect(() => {
    const refresh = () => {
      const zoom = map.getZoom();
      const bounds = map.getBounds().pad(0.1);
      const spacing = zoom >= 16 ? 26 : zoom >= 15 ? 32 : 40;
      const occupied = new Set<string>();
      const wanted = new Map<string, { id: Exclude<LayerId, 'roads'>; color: string; lat: number; lon: number; name: string; label: string }>();
      for (const layer of MAP_LAYERS) {
        if (layer.id === 'roads' || !enabled.has(layer.id) || zoom < layer.minZoom) continue;
        const d = data.current.get(layer.id);
        if (d?.kind !== 'points') continue;
        for (const [lat, lon, name] of d.items) {
          if (wanted.size >= MAX_ICONS) break;
          if (!bounds.contains([lat, lon])) continue;
          const p = map.latLngToContainerPoint([lat, lon]);
          const cell = Math.floor(p.x / spacing) + ':' + Math.floor(p.y / spacing);
          if (occupied.has(cell)) continue;
          occupied.add(cell);
          wanted.set(`${layer.id}|${lat}|${lon}`, { id: layer.id, color: layer.color, lat, lon, name, label: layer.label });
        }
      }
      for (const [key, marker] of markers.current) {
        if (!wanted.has(key)) { icons.current.removeLayer(marker); markers.current.delete(key); }
      }
      for (const [key, w] of wanted) {
        if (markers.current.has(key)) continue;
        const marker = L.marker([w.lat, w.lon], { icon: iconFor(w.id, w.color), pane: 'studentLayers', keyboard: false, riseOnHover: true });
        marker.bindTooltip(`<strong>${w.name || w.label}</strong><br><span style="color:#5D6673">${w.label}</span>`,
          { direction: 'top', offset: [0, -10], className: 'clean-tooltip' });
        markers.current.set(key, marker);
        icons.current.addLayer(marker);
      }
    };
    refresh();
    map.on('moveend', refresh);
    return () => { map.off('moveend', refresh); };
  }, [map, enabled, loaded]);

  return null;
}

type LayerControlsProps = { enabled: ReadonlySet<LayerId>; onToggle: (id: LayerId) => void };

export function MapLayerShortcuts({ enabled, onToggle }: LayerControlsProps) {
  return (
    <div role="group" aria-label="Equipamientos visibles en el mapa" className="flex flex-wrap gap-1">
      {SHORTCUT_LAYERS.map(({ id, label, color, Icon }) => {
        const visible = enabled.has(id);
        return (
          <button key={id} type="button" aria-pressed={visible} onClick={() => onToggle(id)}
            className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-ink hover:border-ink/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink aria-[pressed=false]:bg-surface aria-[pressed=false]:text-muted lg:min-h-8">
            <Icon size={14} style={{ color }} aria-hidden="true" />
            <span className={layerLabelClass} data-hidden={!visible}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Additional layer controls. */
export function MapLayersPanel({ enabled, onToggle }: LayerControlsProps) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-border bg-bg px-4 text-sm font-semibold text-ink shadow-popover transition hover:bg-surface">
        <Layers size={16} aria-hidden="true" /> Más capas
      </button>
    );
  }
  return (
    <div className="pointer-events-auto w-60 rounded-2xl border border-border bg-bg p-3 shadow-popover">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold"><Layers size={15} aria-hidden="true" /> Más capas</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Ocultar capas" className="rounded-full p-1 text-muted hover:bg-surface hover:text-ink">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {OTHER_LAYERS.map((layer) => {
          const on = enabled.has(layer.id);
          return (
            <button key={layer.id} type="button" role="switch" aria-checked={on} onClick={() => onToggle(layer.id)}
              className={'flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-surface ' + (on ? 'text-ink' : 'text-muted')}>
              <span className="flex items-center gap-2">
                {layer.id === 'roads'
                  ? <span className="h-1 w-3.5 rounded-full" style={{ background: layer.color }} />
                  : <span className="h-3 w-3 rounded-full border-2 border-bg shadow-[0_0_0_1px_rgba(13,17,23,0.15)]" style={{ background: layer.color }} />}
                <span className={layerLabelClass} data-hidden={!on}>{layer.label}</span>
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
