/**
 * Full-bleed editorial Leaflet map of Madrid neighborhoods (T24).
 * - Single-hue 5-step brass choropleth (no traffic-light colors)
 * - Campus marker in brass accent + live max-distance radius circle in km
 * - Smooth flyTo on neighborhood or campus selection
 * - Editorial hover tooltip with name, fit level, and estimated €/mes
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L, { type Layer, type PathOptions } from 'leaflet';
import type {
  AreaFeature,
  BarriosGeoJSON,
  Campus,
  ScoreResultItem,
} from '../api/types';
import { MADRID_CENTER, MADRID_DEFAULT_ZOOM } from '../config';
import { formatEuro, formatKm, getFitLabel, getFitLevel } from '../utils/format';

interface MadridMapProps {
  geoData: BarriosGeoJSON | null;
  scoresById: Record<string, ScoreResultItem>;
  centroidsById: Record<string, [number, number]>;
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  activeCampus: Campus | null;
  maxDistanceKm: number | null;
}

/** Single-hue 5-step brass scale matching CSS tokens in index.css */
const CHOROPLETH_STEPS = [
  'var(--color-choro-1)',
  'var(--color-choro-2)',
  'var(--color-choro-3)',
  'var(--color-choro-4)',
  'var(--color-choro-5)',
] as const;

function getSingleHueFill(result?: ScoreResultItem): string {
  if (!result || result.excluded) return 'var(--color-choro-excluded)';
  if (result.score >= 76) return CHOROPLETH_STEPS[4];
  if (result.score >= 66) return CHOROPLETH_STEPS[3];
  if (result.score >= 56) return CHOROPLETH_STEPS[2];
  if (result.score >= 46) return CHOROPLETH_STEPS[1];
  return CHOROPLETH_STEPS[0];
}

/** Custom brass circular campus pin with graduation cap icon */
function createCampusIcon() {
  return L.divIcon({
    className: 'campus-pin-wrapper',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="
      width:34px;height:34px;border-radius:9999px;
      background:#B8862B;border:3px solid #FFFFFF;
      box-shadow:0 4px 12px rgba(20,22,26,0.24);
      display:flex;align-items:center;justify-content:center;color:#FFFFFF;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
        <path d="M22 10v6"/>
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
      </svg>
    </div>`,
  });
}

/** Smooth flyTo controller when selected area or campus changes */
function MapFlyController({
  targetCoords,
  zoom,
}: {
  targetCoords: [number, number] | null;
  zoom: number;
}) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!targetCoords) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      map.setView(targetCoords, zoom, { animate: false });
    } else {
      map.flyTo(targetCoords, zoom, { duration: 0.65, easeLinearity: 0.25 });
    }
  }, [map, targetCoords, zoom]);

  return null;
}

export function MadridMap({
  geoData,
  scoresById,
  centroidsById,
  selectedAreaId,
  onSelectArea,
  activeCampus,
  maxDistanceKm,
}: MadridMapProps) {
  const campusIcon = useMemo(() => createCampusIcon(), []);

  const geoLayerKey = useMemo(() => {
    const scoreSig = Object.values(scoresById)
      .slice(0, 8)
      .map((r) => `${r.id}:${r.score}:${r.excluded ? 1 : 0}`)
      .join('|');
    return `${selectedAreaId ?? 'none'}-${scoreSig}`;
  }, [scoresById, selectedAreaId]);

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

  const styleFeature = (feature?: AreaFeature): PathOptions => {
    const id = feature?.properties?.id;
    const result = id ? scoresById[id] : undefined;
    const isSelected = id === selectedAreaId;

    return {
      fillColor: getSingleHueFill(result),
      fillOpacity: result?.excluded ? 0.35 : isSelected ? 0.85 : 0.7,
      color: isSelected ? '#B8862B' : '#FFFFFF',
      weight: isSelected ? 2.5 : 1,
      opacity: 1,
    };
  };

  const onEachFeature = (feature: AreaFeature, layer: Layer) => {
    const { id, name, district } = feature.properties;
    const result = scoresById[id];
    const fitLabel = result ? getFitLabel(getFitLevel(result.score, result.excluded)) : 'Sin dato';
    const rentText =
      result?.est_rent_eur_month != null ? `~${formatEuro(result.est_rent_eur_month)}/mes` : 'Sin dato';
    const distText = result ? formatKm(result.distance_km) : '';

    layer.bindTooltip(
      `<div style="min-width:155px">
        <div style="font-weight:600;font-size:13px;color:#14161A">${name}</div>
        <div style="color:#5B6170;font-size:11px;margin-bottom:6px">${district}</div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
          <span style="font-family:Fraunces,Georgia,serif;font-weight:600;font-size:14px;color:#14161A">${rentText}</span>
          <span style="font-size:11px;font-weight:500;color:#B8862B">${fitLabel}</span>
        </div>
        ${distText ? `<div style="margin-top:2px;font-size:11px;color:#5B6170">A ${distText} del campus</div>` : ''}
      </div>`,
      { sticky: true, direction: 'top', offset: [0, -8], className: 'editorial-tooltip' },
    );

    layer.on({
      mouseover: (e) => {
        const target = e.target as L.Path;
        target.setStyle({
          color: '#B8862B',
          weight: 2.5,
          fillOpacity: result?.excluded ? 0.45 : 0.85,
        });
      },
      mouseout: (e) => {
        const target = e.target as L.Path;
        target.setStyle(styleFeature(feature));
      },
      click: () => onSelectArea(id),
    });
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MADRID_CENTER}
        zoom={MADRID_DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFlyController targetCoords={flyTarget} zoom={selectedAreaId ? 13 : MADRID_DEFAULT_ZOOM} />

        {/* Max distance radius circle around active campus */}
        {activeCampus && maxDistanceKm !== null && (
          <Circle
            center={[activeCampus.coords[1], activeCampus.coords[0]]}
            radius={maxDistanceKm * 1000}
            pathOptions={{
              color: '#B8862B',
              weight: 1.5,
              dashArray: '6 6',
              fillColor: '#B8862B',
              fillOpacity: 0.05,
            }}
          />
        )}

        {geoData && (
          <GeoJSON
            key={geoLayerKey}
            data={geoData}
            style={(feature) => styleFeature(feature as AreaFeature | undefined)}
            onEachFeature={(feature, layer) => onEachFeature(feature as AreaFeature, layer)}
          />
        )}

        {activeCampus && (
          <Marker
            position={[activeCampus.coords[1], activeCampus.coords[0]]}
            icon={campusIcon}
          >
            <Tooltip direction="top" offset={[0, -18]} className="editorial-tooltip">
              <div className="text-xs font-semibold text-ink">{activeCampus.name}</div>
              {maxDistanceKm !== null && (
                <div className="text-[11px] text-muted">Radio: hasta {formatKm(maxDistanceKm)}</div>
              )}
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Single-hue choropleth legend (bottom-center on desktop, hidden when crowded on small mobile) */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-[400] hidden -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface/92 px-4 py-2 shadow-card backdrop-blur-md lg:flex">
        <span className="text-[11px] font-medium text-muted">Encaje bajo</span>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-5 rounded-l-full bg-choro-1" />
          <span className="h-2.5 w-5 bg-choro-2" />
          <span className="h-2.5 w-5 bg-choro-3" />
          <span className="h-2.5 w-5 bg-choro-4" />
          <span className="h-2.5 w-5 rounded-r-full bg-choro-5" />
        </div>
        <span className="text-[11px] font-medium text-ink">Encaje alto</span>
        <span className="mx-1 h-3 w-px bg-border" />
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-choro-excluded opacity-60" />
          Excluido
        </span>
      </div>
    </div>
  );
}
