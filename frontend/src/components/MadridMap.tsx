/**
 * Redesigned Airbnb-style price-pill Madrid map (clean, scannable, auto-fitted to Top 10 + campus).
 * - Floating price pills (~388 €) directly on Top 10 neighborhoods: Madrid red for #1 recommended,
 *   crisp white pills for #2–#10 (turning dark ink on hover/select, synced bidirectionally with ZoneList).
 * - Soft translucent polygon tints so Madrid streets stay legible.
 * - Auto-fit bounds to the active campus + Top 10 zones when results load or campus changes.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Feature } from 'geojson';
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L, {
  type GeoJSON as LeafletGeoJSON,
  type Layer,
  type PathOptions,
  type TooltipEvent,
} from 'leaflet';
import type {
  AreaFeature,
  BarriosGeoJSON,
  Campus,
  ScoreResultItem,
} from '../api/types';
import { MADRID_CENTER, MADRID_DEFAULT_ZOOM } from '../config';
import { formatEuro, formatKm, formatMinutes } from '../utils/format';
import { MapLayersOverlay, MapLayersPanel, MapMoveFade, type LayerId } from './MapLayers';

// Includes mainland Spain, the Balearic Islands and the Canary Islands.
const SPAIN_BOUNDS = L.latLngBounds([27.4, -18.3], [44.1, 4.8]);
const CAMPUS_PIN = L.divIcon({
  className: 'campus-pin',
  iconSize: [36, 46],
  iconAnchor: [18, 44],
  tooltipAnchor: [0, -40],
  html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true">
    <path d="M18 45s15-14.5 15-26A15 15 0 0 0 3 19c0 11.5 15 26 15 26z" fill="#0D1117" stroke="#fff" stroke-width="2.5"/>
    <path d="M9.5 17.5 18 13.5l8.5 4L18 21.5z" fill="#fff"/>
    <path d="M12.5 19v4c3 2.2 8 2.2 11 0v-4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M26.5 17.5v5" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,
});
const BASEMAP_ATTRIBUTION = '&copy; <a href="https://www.ign.es/">IGN</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://datos.madrid.es/">Ayuntamiento de Madrid</a> · CRTM';

interface MadridMapProps {
  geoData: BarriosGeoJSON | null;
  scoresById: Record<string, ScoreResultItem>;
  top10RankById: Record<string, number>;
  centroidsById: Record<string, [number, number]>;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  recommendedAreaId?: string | null;
  onSelectArea: (areaId: string) => void;
  onHoverArea: (areaId: string | null) => void;
  activeCampus: Campus | null;
  budget: number;
  isScoring?: boolean;
  isVisible?: boolean;
  layers: ReadonlySet<LayerId>;
  onToggleLayer: (id: LayerId) => void;
  /** Called once the basemap has loaded (or after 7 s at most), so the page can reveal the results. */
  onReady?: () => void;
}

function createPricePillIcon(
  priceLabel: string,
  isRecommended: boolean,
  isActive: boolean,
) {
  const bg = isActive
    ? '#0D1117'
    : isRecommended
      ? '#D7262E'
      : '#FFFFFF';
  const color = isActive || isRecommended ? '#FFFFFF' : '#0D1117';
  const border = isActive
    ? '2px solid #0D1117'
    : isRecommended
      ? '2px solid #FFFFFF'
      : '1px solid #CFD5DF';
  const shadow = isActive || isRecommended
    ? '0 4px 12px rgba(13,17,23,0.28)'
    : '0 2px 6px rgba(13,17,23,0.14)';
  const scale = isActive ? 'scale(1.1)' : 'scale(1)';

  return L.divIcon({
    className: 'price-pill-marker',
    iconSize: [74, 28],
    iconAnchor: [37, 14],
    html: `<div style="
      display:inline-flex;align-items:center;justify-content:center;gap:3px;
      padding:3px 9px;border-radius:9999px;
      background:${bg};color:${color};border:${border};
      box-shadow:${shadow};transform:${scale};
      transition:transform 140ms ease-out,background-color 140ms ease-out;
      font-family:'Bricolage Grotesque','Instrument Sans',sans-serif;
      font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;
    ">
      <span>${priceLabel}</span>
    </div>`,
  });
}

interface PricePill {
  id: string;
  rank: number;
  name: string;
  district: string;
  distanceKm: number;
  travelMin: number | null;
  priceLabel: string;
  coords: [number, number];
  isRecommended: boolean;
}

const PricePillMarker = memo(function PricePillMarker({
  pill, active, onSelect, onHover,
}: { pill: PricePill; active: boolean; onSelect: (id: string) => void; onHover: (id: string | null) => void }) {
  const handlers = useMemo(() => ({
    click: () => onSelect(pill.id),
    mouseover: () => onHover(pill.id),
    mouseout: () => onHover(null),
  }), [pill.id, onSelect, onHover]);
  const icon = useMemo(() => createPricePillIcon(pill.priceLabel, pill.isRecommended, active), [pill, active]);
  return (
    <Marker position={pill.coords} icon={icon}
      zIndexOffset={active ? 1000 : pill.isRecommended ? 500 : 100 - pill.rank}
      eventHandlers={handlers}>
      <Tooltip direction="top" offset={[0, -14]} className="clean-tooltip">
        <div className="text-xs font-semibold text-ink">{pill.name}</div>
        <div className="text-[11px] text-muted">{pill.district} · {pill.travelMin != null ? `${formatMinutes(pill.travelMin)} a tu campus` : formatKm(pill.distanceKm)}</div>
      </Tooltip>
    </Marker>
  );
});

function buildTooltipHtml(
  name: string,
  district: string,
  result: ScoreResultItem | undefined,
  budget: number,
): string {
  // Only real numbers: travel minutes, and the official flat rent exactly as published (never our estimate).
  const rentText =
    result?.est_rent_eur_month != null
      ? `${formatEuro(result.est_rent_eur_month)}/mes`
      : result?.travel_min != null ? `${formatMinutes(result.travel_min)} a tu campus` : '';
  const distText = result?.transit_min != null
    ? `${formatMinutes(result.transit_min)} en transporte · ${formatMinutes(result.car_min)} en coche${result.est_rent_eur_month != null ? ' · alquiler oficial de pisos' : ''}`
    : result ? `${formatKm(result.distance_km)} de tu campus` : '';
  const over =
    result?.est_rent_eur_month != null && result.est_rent_eur_month > budget
      ? Math.round(result.est_rent_eur_month - budget)
      : 0;
  const badgeHtml = result?.excluded
    ? `<span style="color:#5D6673;font-weight:600">Fuera de filtros</span>`
    : result?.est_rent_eur_month != null
      ? over === 0
        ? `<span style="color:#12805C;font-weight:600">Encaja</span>`
        : `<span style="color:#B54708;font-weight:600">Se pasa ${formatEuro(over)}</span>`
      : '';

  return `<div style="min-width:155px">
    <div style="display:flex;align-items:baseline;gap:6px">
      <span style="font-weight:600;font-size:13px;color:#0D1117">${name}</span>
    </div>
    <div style="color:#5D6673;font-size:11px;margin-bottom:5px">${district}</div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
      <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;color:#0D1117">${rentText}</span>
      <span style="font-size:11px">${badgeHtml}</span>
    </div>
    ${distText ? `<div style="margin-top:2px;font-size:11px;color:#5D6673">${distText}</div>` : ''}
  </div>`;
}

/** Handles invalidateSize on mobile toggle, auto-fit bounds on Top 10 + campus, and flyTo on selection */
function MapViewportController({
  boundsPoints,
  boundsSignature,
  selectedCoords,
  visible,
}: {
  boundsPoints: [number, number][];
  boundsSignature: string;
  selectedCoords: [number, number] | null;
  visible: boolean;
}) {
  const map = useMap();
  const lastBoundsSig = useRef<string>('');

  useEffect(() => {
    let dragging = false;

    function closePreviews() {
      map.eachLayer((layer) => {
        if (layer instanceof L.Tooltip && !layer.options.permanent) {
          map.closeTooltip(layer);
        }
      });
    }

    function startDrag() {
      dragging = true;
      closePreviews();
    }

    function suppressPreview({ tooltip }: TooltipEvent) {
      if (dragging && !tooltip.options.permanent) {
        queueMicrotask(() => map.closeTooltip(tooltip));
      }
    }

    function finishDrag() {
      if (!dragging) return;
      // Leaflet reopens delayed hover tooltips in its own moveend handlers.
      queueMicrotask(() => {
        if (!dragging) return;
        closePreviews();
        dragging = false;
      });
    }

    map.on('dragstart', startDrag);
    map.on('tooltipopen', suppressPreview);
    map.on('moveend', finishDrag);
    return () => {
      dragging = false;
      map.off('dragstart', startDrag);
      map.off('tooltipopen', suppressPreview);
      map.off('moveend', finishDrag);
    };
  }, [map]);

  useEffect(() => {
    if (!visible) return;
    function constrainZoom() {
      const size = map.getSize();
      if (size.x && size.y) map.setMinZoom(Math.max(5, map.getBoundsZoom(SPAIN_BOUNDS, true)));
    }
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
      constrainZoom();
    });
    map.on('resize', constrainZoom);
    return () => {
      window.cancelAnimationFrame(frame);
      map.off('resize', constrainZoom);
    };
  }, [map, visible]);

  // Auto-fit bounds cleanly around campus + Top 10 whenever the campus or Top 10 set changes
  useEffect(() => {
    if (!visible || boundsPoints.length < 2) return;
    if (lastBoundsSig.current === boundsSignature) return;
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    lastBoundsSig.current = boundsSignature;
    const bounds = L.latLngBounds(boundsPoints);
    if (!bounds.isValid()) return;
    // Leave room on the right for the layers panel so the recommended zone is never hidden under it.
    const wide = size.x >= 900;
    map.fitBounds(bounds, { paddingTopLeft: [60, 60], paddingBottomRight: [wide ? 300 : 60, 60], maxZoom: 14, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 0.35 });
  }, [map, boundsPoints, boundsSignature, visible]);

  // Smooth pan to selected neighborhood
  useEffect(() => {
    if (!visible || !selectedCoords) return;
    const [lat, lon] = selectedCoords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      map.setView(selectedCoords, Math.max(map.getZoom(), 15), { animate: false });
    } else {
      map.flyTo(selectedCoords, Math.max(map.getZoom(), 15), { duration: 0.5 });
    }
  }, [map, selectedCoords, visible]);

  return null;
}

function MadridMapImpl({
  geoData,
  scoresById,
  top10RankById,
  centroidsById,
  selectedAreaId,
  hoveredAreaId,
  recommendedAreaId = null,
  onSelectArea,
  onHoverArea,
  activeCampus,
  budget,
  isScoring = false,
  isVisible = true,
  layers,
  onToggleLayer,
  onReady,
}: MadridMapProps) {
  const campusLatLng = useMemo<[number, number] | null>(() =>
    activeCampus ? [activeCampus.coords[1], activeCampus.coords[0]] : null, [activeCampus]);
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const layersPanelRef = useRef<HTMLDivElement | null>(null);
  // Nothing is drawn on top of the map until the basemap tiles have arrived (no icons floating on a blank page).
  const [tilesReady, setTilesReady] = useState(false);
  // Same IGN map from a second IGN server if the first one fails or is slow (it happens at peak times).
  const [tileSource, setTileSource] = useState<'tms' | 'wmts'>('tms');
  const tileErrors = useRef(0);
  useEffect(() => {
    const fallback = window.setTimeout(() => setTilesReady(true), 7000);
    const slow = window.setTimeout(() => setTileSource((src) => (tilesReadyRef.current ? src : 'wmts')), 3500);
    return () => { window.clearTimeout(fallback); window.clearTimeout(slow); };
  }, []);
  const tilesReadyRef = useRef(false);
  tilesReadyRef.current = tilesReady;
  useEffect(() => { if (tilesReady) onReady?.(); }, [tilesReady, onReady]);
  const tileEvents = useMemo(() => ({
    load: () => setTilesReady(true),
    tileerror: () => { tileErrors.current += 1; if (tileErrors.current >= 4) setTileSource('wmts'); },
  }), []);
  const pathsById = useRef(new Map<string, { path: L.Path; feature: AreaFeature }>());
  const previousInteraction = useRef({ selectedAreaId, hoveredAreaId });
  const scoresRef = useRef(scoresById);
  const top10Ref = useRef(top10RankById);
  const selectedRef = useRef(selectedAreaId);
  const hoveredRef = useRef(hoveredAreaId);
  const recommendedRef = useRef(recommendedAreaId);
  const budgetRef = useRef(budget);
  const onSelectRef = useRef(onSelectArea);
  const onHoverRef = useRef(onHoverArea);

  scoresRef.current = scoresById;
  top10Ref.current = top10RankById;
  selectedRef.current = selectedAreaId;
  hoveredRef.current = hoveredAreaId;
  recommendedRef.current = recommendedAreaId;
  budgetRef.current = budget;
  onSelectRef.current = onSelectArea;
  onHoverRef.current = onHoverArea;

  /** Soft translucent polygons so Madrid streets remain legible beneath the price pills */
  const getStyleForFeature = useCallback((feature?: AreaFeature): PathOptions => {
    const id = feature?.properties?.id;
    const rank = id ? top10Ref.current[id] : undefined;
    const isSelected = id === selectedRef.current;
    const isHovered = id === hoveredRef.current;
    const isRecommended = id === recommendedRef.current;

    if (isSelected) {
      return {
        fillColor: '#486979',
        fillOpacity: 0.18,
        color: '#0D1117',
        weight: 2.5,
        opacity: 1,
      };
    }
    if (isRecommended) {
      return {
        fillColor: '#D7262E',
        fillOpacity: isHovered ? 0.24 : 0.16,
        color: '#D7262E',
        weight: 2.25,
        opacity: 0.95,
      };
    }
    if (rank) {
      return {
        fillColor: '#3F6FD8',
        fillOpacity: isHovered ? 0.24 : 0.13,
        color: isHovered ? '#2C55B5' : '#4B74C9',
        weight: isHovered ? 2.2 : 1.3,
        opacity: isHovered ? 1 : 0.7,
      };
    }
    return {
      fillColor: '#7A6A58',
      fillOpacity: isHovered ? 0.12 : 0,
      color: isHovered ? '#5D6673' : '#9C8F80',
      weight: isHovered ? 1.2 : 0.5,
      opacity: isHovered ? 0.7 : 0.3,
    };
  }, []);

  const geoStyle = useCallback((feature?: Feature) => getStyleForFeature(feature as AreaFeature | undefined), [getStyleForFeature]);

  // Refresh all neighborhoods only when the ranking or score data changes.
  useEffect(() => {
    const group = geoJsonRef.current;
    if (!group) return;
    group.eachLayer((layer) => {
      const feature = (layer as L.Path & { feature?: AreaFeature }).feature;
      if (!feature) return;
      const { id, name, district } = feature.properties;
      const pathLayer = layer as L.Path;
      pathLayer.setStyle(getStyleForFeature(feature));
      pathLayer.setTooltipContent(
        buildTooltipHtml(name, district, scoresById[id], budget),
      );
    });
  }, [geoData, scoresById, top10RankById, recommendedAreaId, budget, getStyleForFeature]);

  useEffect(() => {
    const previous = previousInteraction.current;
    const changed = new Set([previous.selectedAreaId, previous.hoveredAreaId, selectedAreaId, hoveredAreaId]);
    for (const id of changed) {
      const entry = id ? pathsById.current.get(id) : undefined;
      if (entry) entry.path.setStyle(getStyleForFeature(entry.feature));
    }
    previousInteraction.current = { selectedAreaId, hoveredAreaId };
  }, [selectedAreaId, hoveredAreaId, getStyleForFeature]);

  // Top 10 floating price pill markers
  const pricePills = useMemo<PricePill[]>(() => {
    return Object.entries(top10RankById)
      .map(([id, rank]) => {
        const centroid = centroidsById[id];
        const area = scoresById[id];
        if (!centroid || !area) return null;
        // Pills show the real travel time; a price only when it is an official published figure (flats).
        const priceLabel = area.est_rent_eur_month != null
          ? formatEuro(area.est_rent_eur_month)
          : area.travel_min != null ? formatMinutes(area.travel_min) : formatKm(area.distance_km);
        return {
          id,
          rank,
          name: area.name,
          district: area.district,
          distanceKm: area.distance_km,
          travelMin: area.travel_min ?? null,
          priceLabel,
          coords: [centroid[1], centroid[0]] as [number, number],
          isRecommended: id === recommendedAreaId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.rank - a.rank); // render #1 last so it stays on top
  }, [top10RankById, centroidsById, scoresById, recommendedAreaId]);

  // Bounds points: active campus + the best 3 zones (a tight view: you can still see the streets)
  const boundsPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = pricePills.filter((p) => p.rank <= 3).map((p) => p.coords);
    if (campusLatLng) pts.push(campusLatLng);
    return pts;
  }, [pricePills, campusLatLng]);

  const boundsSignature = useMemo(() => {
    const ids = pricePills.map((p) => p.id).sort().join(',');
    return `${activeCampus?.id ?? 'none'}:${ids}`;
  }, [activeCampus?.id, pricePills]);

  const selectedCoords = useMemo<[number, number] | null>(() => {
    if (selectedAreaId && centroidsById[selectedAreaId]) {
      const [lon, lat] = centroidsById[selectedAreaId];
      return [lat, lon];
    }
    return null;
  }, [selectedAreaId, centroidsById]);

  const onEachFeature = useCallback((feature: AreaFeature, layer: Layer) => {
    const { id, name, district } = feature.properties;
    pathsById.current.set(id, { path: layer as L.Path, feature });
    layer.bindTooltip(
      buildTooltipHtml(name, district, scoresRef.current[id], budgetRef.current),
      { sticky: true, direction: 'top', offset: [0, -8], className: 'clean-tooltip' },
    );

    layer.on({
      mouseover: () => onHoverRef.current(id),
      mouseout: () => onHoverRef.current(null),
      click: () => onSelectRef.current(id),
    });
  }, []);
  const bindFeature = useCallback((feature: Feature, layer: Layer) => onEachFeature(feature as AreaFeature, layer), [onEachFeature]);

  const campusShort = activeCampus?.name.split(' · ')[0] ?? '';

  return (
    <div className={'relative h-full w-full' + (tilesReady ? '' : ' tiles-loading')}>
      <MapContainer
        center={MADRID_CENTER}
        zoom={MADRID_DEFAULT_ZOOM}
        minZoom={5}
        maxBounds={SPAIN_BOUNDS}
        maxBoundsViscosity={1}
        maxZoom={19}
        scrollWheelZoom
        preferCanvas
        zoomSnap={1}
        zoomDelta={1}
        wheelPxPerZoomLevel={120}
        className="watercolor-map h-full w-full"
      >
        {/* Official IGN colour basemap (Instituto Geográfico Nacional) with a soft watercolour treatment (CSS) */}
        <TileLayer
          attribution={BASEMAP_ATTRIBUTION}
          key={tileSource}
          url={tileSource === 'tms'
            ? 'https://tms-ign-base.idee.es/1.0.0/IGNBaseTodo/{z}/{x}/{-y}.jpeg'
            : 'https://www.ign.es/wmts/ign-base?layer=IGNBaseTodo&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'}
          maxNativeZoom={17}
          className="watercolor-basemap"
          updateWhenZooming={false}
          keepBuffer={4}
          eventHandlers={tileEvents}
          noWrap
        />
        <MapLayersOverlay enabled={layers} />
        <MapMoveFade target={layersPanelRef} />

        <MapViewportController
          boundsPoints={boundsPoints}
          boundsSignature={boundsSignature}
          selectedCoords={selectedCoords}
          visible={isVisible}
        />


        {geoData && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData}
            style={geoStyle}
            onEachFeature={bindFeature}
          />
        )}


        {/* Floating price pills */}
        {pricePills.map((pill) => (
          <PricePillMarker key={pill.id} pill={pill} active={pill.id === selectedAreaId || pill.id === hoveredAreaId}
            onSelect={onSelectArea} onHover={onHoverArea} />
        ))}

        {/* Campus: dark pin with a graduation cap (red is reserved for the recommended zone) */}
        {campusLatLng && (
          <Marker position={campusLatLng} icon={CAMPUS_PIN} zIndexOffset={2000} keyboard={false}>
            <Tooltip permanent direction="top" offset={[0, -2]} className="campus-label">
              {campusShort}
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {isScoring && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-muted shadow-popover">
          Actualizando…
        </div>
      )}

      {/* Layer toggles: supermarkets, Metro, parks, libraries, gyms, sports, malls, roads */}
      <div ref={layersPanelRef} className="map-fade pointer-events-none absolute top-3 right-3 z-[500]">
        <MapLayersPanel enabled={layers} onToggle={onToggleLayer} />
      </div>

      {/* Clean minimal map key */}
      <div className="pointer-events-none absolute bottom-20 left-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-bg/95 px-3 py-1.5 text-[11px] text-muted lg:bottom-6 lg:left-4">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          Recomendada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-ink/40 bg-bg" />
          Minutos hasta tu campus
        </span>
      </div>
    </div>
  );
}

/** Memoised: only re-renders when its own props change (hovering elsewhere doesn't redraw it). */
export const MadridMap = memo(MadridMapImpl);
