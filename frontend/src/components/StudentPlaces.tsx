/** Shows official municipal amenities at neighborhood zoom, thinning nearby markers. */
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Dumbbell, TreePine } from 'lucide-react';
import L from 'leaflet';
import { Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import placesData from '../data/studentPlaces.json';

const SPORT_ICON = '<path d="m6 7 3 3m6 4 3 3m-9-2 6-6M4 9l5-5m6 16 5-5M3 7l4-4m10 18 4-4"/>';
const CATEGORIES = {
  park: { label: 'Parque', color: '#287350', icon: '<path d="m12 3 4 6h-2l5 7h-6v4h-2v-4H5l5-7H8z"/>' },
  library: { label: 'Biblioteca', color: '#3d5e88', icon: '<path d="M12 6v14M4 5h4a4 4 0 0 1 4 2 4 4 0 0 1 4-2h4v13h-4a4 4 0 0 0-4 2 4 4 0 0 0-4-2H4z"/>' },
  gym: { label: 'Gimnasio municipal', color: '#854c69', icon: SPORT_ICON },
  sport: { label: 'Deporte municipal', color: '#854c69', icon: SPORT_ICON },
};
const MIN_ZOOM = 13;

type PlaceKind = keyof typeof CATEGORIES;
export type PlaceCategory = Exclude<PlaceKind, 'gym'>;

const PLACE_FILTERS = [
  { category: 'park', label: 'Parques', Icon: TreePine },
  { category: 'library', label: 'Bibliotecas', Icon: BookOpen },
  { category: 'sport', label: 'Deporte', Icon: Dumbbell },
] as const;
const places = placesData as { kind: PlaceKind; name: string; coords: [number, number] }[];
const icons = Object.fromEntries(Object.entries(CATEGORIES).map(([kind, { color, icon }]) => [
  kind,
  L.divIcon({
    className: 'student-place-pin',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span style="background:${color}" aria-hidden="true" data-place-category="${kind === 'gym' ? 'sport' : kind}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>`,
  }),
]));

export function StudentPlaces({ hidden }: { hidden: ReadonlySet<PlaceCategory> }) {
  const map = useMap();
  const [visible, setVisible] = useState<typeof places>([]);

  const refresh = useCallback(() => {
    if (map.getZoom() < MIN_ZOOM) {
      setVisible([]);
      return;
    }
    const bounds = map.getBounds();
    const occupied = new Set<string>();
    const spacing = map.getZoom() < 15 ? 54 : 33;
    setVisible(places.filter((place) => {
      const category = place.kind === 'gym' ? 'sport' : place.kind;
      if (hidden.has(category) || !bounds.contains(place.coords)) return false;
      const point = map.project(place.coords);
      const cell = Math.floor(point.x / spacing) + ':' + Math.floor(point.y / spacing);
      if (occupied.has(cell)) return false;
      occupied.add(cell);
      return true;
    }).slice(0, 85));
  }, [map, hidden]);

  useEffect(() => {
    refresh();
    map.on('moveend', refresh);
    return () => { map.off('moveend', refresh); };
  }, [map, refresh]);

  return visible.map(({ kind, name, coords }) => (
    <Marker key={kind + coords.join(',') + name} position={coords} icon={icons[kind]}
      title={name} alt={name} zIndexOffset={-1000} autoPanOnFocus={false}>
      <Tooltip direction="top" offset={[0, -7]}>{name}</Tooltip>
      <Popup offset={[0, -8]} autoPan={false}>
        <strong>{name}</strong><br />{CATEGORIES[kind].label}
      </Popup>
    </Marker>
  ));
}

export function StudentPlacesKey({ hidden, onToggle }: {
  hidden: ReadonlySet<PlaceCategory>;
  onToggle: (category: PlaceCategory) => void;
}) {
  return (
    <div role="group" aria-label="Equipamientos visibles en el mapa" className="flex flex-wrap gap-1">
      {PLACE_FILTERS.map(({ category, label, Icon }) => (
        <button
          key={category}
          type="button"
          aria-pressed={!hidden.has(category)}
          onClick={() => onToggle(category)}
          className="pointer-events-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-ink hover:border-ink/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink aria-[pressed=false]:bg-surface aria-[pressed=false]:text-muted lg:min-h-8"
        >
          <Icon size={14} style={{ color: CATEGORIES[category].color }} aria-hidden="true" />
          <span className="relative after:absolute after:inset-x-0 after:top-1/2 after:h-px after:origin-left after:scale-x-0 data-[layer-hidden=true]:after:scale-x-100 after:bg-current after:transition-transform after:content-[''] motion-reduce:after:transition-none"
            data-layer-hidden={hidden.has(category)}>{label}</span>
        </button>
      ))}
    </div>
  );
}
