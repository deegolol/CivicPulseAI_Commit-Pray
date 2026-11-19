/**
 * Support map for Screen B (T25).
 * - Only Top 10 neighborhoods highlighted in 5-step blue scale (#EEF3FF → #1F4FD6); rest muted grey (#ECEEF2)
 * - Bidirectional hover sync with ZoneList (hoveredAreaId)
 * - Campus marker as Madrid red dot (#D7262E) with clean label + optional max-distance circle
 * - Minimalist basemap without noisy labels + labels only for top highlighted neighborhoods
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L, { type GeoJSON as LeafletGeoJSON, type Layer, type PathOptions } from 'leaflet';
import type {
  AreaFeature,
  BarriosGeoJSON,
  Campus,
  ScoreResultItem,
} from '../api/types';
import { MADRID_CENTER, MADRID_DEFAULT_ZOOM } from '../config';
import { formatEuro, formatKm } from '../utils/format';

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

/** 5-step blue scale for Top 10 ranked areas (T25); everything else stays muted grey */
function getTop10BlueFill(rank?: number): string {
  if (!rank) return '#ECEEF2';
  if (rank <= 2) return '#1F4FD6';
  if (rank <= 4) return '#4D7CF5';
  if (rank <= 6) return '#8FB0FF';
  if (rank <= 8) return '#C9D8FF';
  return '#EEF3FF';
}

function buildTooltipHtml(
  name: string,
  district: string,
  result: ScoreResultItem | undefined,
  rank: number | undefined,
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
      ${rank ? `<span style="font-size:11px;font-weight:700;color:#1F4FD6">#${rank}</span>` : ''}
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

function MapFlyController({
  targetCoords,
  zoom,
  visible,
}: {
  targetCoords: [number, number] | null;
  zoom: number;
  visible: boolean;
}) {
  const map = useMap();
  const isFirstRender = useRef(true);

  // Recalculate Leaflet container dimensions whenever the map becomes visible (mobile toggle)
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 60);
    return () => window.clearTimeout(id);
  }, [map, visible]);

  useEffect(() => {
    if (!visible || !targetCoords) return;
    const [lat, lon] = targetCoords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      map.setView(targetCoords, zoom, { animate: false });
    } else {
      map.flyTo(targetCoords, zoom, { duration: 0.55, easeLinearity: 0.25 });
    }
  }, [map, targetCoords, zoom, visible]);

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
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
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

  const getStyleForFeature = useCallback((feature?: AreaFeature): PathOptions => {
    const id = feature?.properties?.id;
    const rank = id ? top10Ref.current[id] : undefined;
    const isSelected = id === selectedRef.current;
    const isHovered = id === hoveredRef.current;
    const isRecommended = id === recommendedRef.current;

    return {
      fillColor: getTop10BlueFill(rank),
      fillOpacity: rank ? (isSelected || isHovered || isRecommended ? 0.88 : 0.72) : isHovered ? 0.55 : 0.35,
      color: isSelected
        ? '#0D1117'
        : isRecommended
          ? '#D7262E'
          : isHovered
            ? '#1F4FD6'
            : '#FFFFFF',
      weight: isSelected || isRecommended ? 2.5 : isHovered ? 2 : 1,
      opacity: 1,
    };
  }, []);

  // In-place update of polygon styles & tooltips (zero layer remounts across 131 barrios)
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
        buildTooltipHtml(name, district, scoresById[id], top10RankById[id], budget),
      );
    });
  }, [scoresById, top10RankById, selectedAreaId, hoveredAreaId, recommendedAreaId, budget, getStyleForFeature]);

  const flyTarget = useMemo<[number, number] | null>(() => {
    if (selectedAreaId && centroidsById[selectedAreaId]) {
      const [lon, lat] = centroidsById[selectedAreaId];
      return [lat, lon];
    }
    if (activeCampus) {
      return [activeCampus.coords[1], activeCampus.coords[0]];
    }
    return null;
  }, [selectedAreaId, centroidsById, activeCampus]);

  const onEachFeature = useCallback(
    (feature: AreaFeature, layer: Layer) => {
      const { id, name, district } = feature.properties;
      layer.bindTooltip(
        buildTooltipHtml(name, district, scoresRef.current[id], top10Ref.current[id], budgetRef.current),
        { sticky: true, direction: 'top', offset: [0, -8], className: 'clean-tooltip' },
      );

      layer.on({
        mouseover: () => onHoverRef.current(id),
        mouseout: () => onHoverRef.current(null),
        click: () => onSelectRef.current(id),
      });
    },
    [],
  );

  const campusShort = activeCampus?.name.split(' · ')[0] ?? '';

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MADRID_CENTER}
        zoom={MADRID_DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFlyController
          targetCoords={flyTarget}
          zoom={selectedAreaId ? 13 : MADRID_DEFAULT_ZOOM}
          visible={isVisible}
        />

        {/* Max distance circle around active campus */}
        {activeCampus && maxDistanceKm !== null && (
          <Circle
            center={[activeCampus.coords[1], activeCampus.coords[0]]}
            radius={maxDistanceKm * 1000}
            pathOptions={{
              color: '#4D7CF5',
              weight: 1.5,
              dashArray: '5 5',
              fillColor: '#4D7CF5',
              fillOpacity: 0.04,
            }}
          />
        )}

        {geoData && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData}
            style={(feature) => getStyleForFeature(feature as AreaFeature | undefined)}
            onEachFeature={(feature, layer) => onEachFeature(feature as AreaFeature, layer)}
          />
        )}

        {/* Campus marker: Madrid red dot (#D7262E) with clean label */}
        {activeCampus && (
          <CircleMarker
            center={[activeCampus.coords[1], activeCampus.coords[0]]}
            radius={8}
            pathOptions={{
              color: '#FFFFFF',
              weight: 2.5,
              fillColor: '#D7262E',
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} className="campus-label">
              {campusShort}
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {isScoring && (
        <div className="pointer-events-none absolute top-3 right-3 z-[400] rounded-[8px] border border-border bg-bg px-3 py-1.5 text-xs text-muted">
          Actualizando…
        </div>
      )}

      {/* Compact 5-step blue legend (top-right on mobile so it never touches the bottom Lista button) */}
      <div className="pointer-events-none absolute top-3 right-3 z-[400] flex items-center gap-2.5 rounded-[8px] border border-border bg-bg px-3 py-1.5 text-[11px] text-muted lg:top-auto lg:right-auto lg:bottom-4 lg:left-4">
        <span>Top 10</span>
        <div className="flex items-center gap-0.5">
          <span className="h-2.5 w-4 rounded-l-sm bg-map-1" />
          <span className="h-2.5 w-4 bg-map-2" />
          <span className="h-2.5 w-4 bg-map-3" />
          <span className="h-2.5 w-4 bg-map-4" />
          <span className="h-2.5 w-4 rounded-r-sm bg-map-5" />
        </div>
        <span className="font-medium text-ink">Mejor encaje</span>
      </div>
    </div>
  );
}
