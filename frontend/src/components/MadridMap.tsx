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
  Circle,
  CircleMarker,
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
import { formatEuro, formatKm } from '../utils/format';
import { DEFAULT_LAYERS, MapLayersOverlay, MapLayersPanel, type LayerId } from './MapLayers';

// Includes mainland Spain, the Balearic Islands and the Canary Islands.
const SPAIN_BOUNDS = L.latLngBounds([27.4, -18.3], [44.1, 4.8]);
const CAMPUS_STYLE = { color: '#FFFFFF', weight: 2.5, fillColor: '#D7262E', fillOpacity: 1 };
const RADIUS_STYLE = { color: '#7A6A58', weight: 1.2, dashArray: '6 6', fillOpacity: 0 };
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
  maxDistanceKm: number | null;
  budget: number;
  isScoring?: boolean;
  isVisible?: boolean;
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
        <div className="text-[11px] text-muted">{pill.district} · {formatKm(pill.distanceKm)}</div>
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
  const rentText =
    result?.est_rent_eur_month != null
      ? `~${formatEuro(result.est_rent_eur_month)}/mes`
      : 'Sin dato';
  const distText = result ? `${formatKm(result.distance_km)} de tu campus` : '';
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
    map.fitBounds(bounds, { padding: [46, 46], maxZoom: 13, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 0.35 });
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
      map.setView(selectedCoords, Math.max(map.getZoom(), 13), { animate: false });
    } else {
      map.flyTo(selectedCoords, Math.max(map.getZoom(), 13), { duration: 0.45 });
    }
  }, [map, selectedCoords, visible]);

  return null;
}

export function MadridMap({
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
  maxDistanceKm,
  budget,
  isScoring = false,
  isVisible = true,
}: MadridMapProps) {
  const [layers, setLayers] = useState<Set<LayerId>>(() => new Set(DEFAULT_LAYERS));
  const toggleLayer = useCallback((id: LayerId) => setLayers((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const campusLatLng = useMemo<[number, number] | null>(() =>
    activeCampus ? [activeCampus.coords[1], activeCampus.coords[0]] : null, [activeCampus]);
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
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
        const priceLabel =
          area.est_rent_eur_month != null ? `~${formatEuro(area.est_rent_eur_month)}` : 'Sin dato';
        return {
          id,
          rank,
          name: area.name,
          district: area.district,
          distanceKm: area.distance_km,
          priceLabel,
          coords: [centroid[1], centroid[0]] as [number, number],
          isRecommended: id === recommendedAreaId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.rank - a.rank); // render #1 last so it stays on top
  }, [top10RankById, centroidsById, scoresById, recommendedAreaId]);

  // Bounds points: active campus + Top 10 price pills
  const boundsPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = pricePills.map((p) => p.coords);
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
    <div className="relative h-full w-full">
      <MapContainer
        center={MADRID_CENTER}
        zoom={MADRID_DEFAULT_ZOOM}
        minZoom={5}
        maxBounds={SPAIN_BOUNDS}
        maxBoundsViscosity={1}
        maxZoom={19}
        scrollWheelZoom
        preferCanvas
        zoomSnap={0.25}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={90}
        className="watercolor-map h-full w-full"
      >
        {/* Official IGN colour basemap (Instituto Geográfico Nacional) with a soft watercolour treatment (CSS) */}
        <TileLayer
          attribution={BASEMAP_ATTRIBUTION}
          url="https://tms-ign-base.idee.es/1.0.0/IGNBaseTodo/{z}/{x}/{-y}.jpeg"
          maxNativeZoom={17}
          className="watercolor-basemap"
          updateWhenZooming={false}
          keepBuffer={4}
          noWrap
        />
        <MapLayersOverlay enabled={layers} />

        <MapViewportController
          boundsPoints={boundsPoints}
          boundsSignature={boundsSignature}
          selectedCoords={selectedCoords}
          visible={isVisible}
        />

        {/* Max distance circle around active campus */}
        {campusLatLng && maxDistanceKm !== null && (
          <Circle
            center={campusLatLng}
            radius={maxDistanceKm * 1000}
            pathOptions={RADIUS_STYLE}
          />
        )}

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

        {/* Campus marker: Madrid red dot (#D7262E) with clean label */}
        {campusLatLng && (
          <CircleMarker
            center={campusLatLng}
            radius={8}
            pathOptions={CAMPUS_STYLE}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} className="campus-label">
              {campusShort}
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {isScoring && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-muted shadow-popover">
          Actualizando…
        </div>
      )}

      {/* Layer toggles: supermarkets, Metro, parks, libraries, gyms, sports, malls, roads */}
      <div className="pointer-events-none absolute top-3 right-3 z-[500]">
        <MapLayersPanel enabled={layers} onToggle={toggleLayer} />
      </div>

      {/* Clean minimal map key */}
      <div className="pointer-events-none absolute bottom-20 left-3 z-[400] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border bg-bg/95 px-3 py-1.5 text-[11px] text-muted lg:bottom-6 lg:left-4">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          Recomendada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-ink/40 bg-bg" />
          Alquiler estimado
        </span>
      </div>
    </div>
  );
}
