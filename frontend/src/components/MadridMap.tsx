/**
 * Interactive Leaflet map of Madrid neighborhoods.
 * Renders GeoJSON polygons colored by score and highlights the selected area & active campus.
 */
import { useMemo } from 'react';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { Layer, PathOptions } from 'leaflet';
import type {
  AreaFeature,
  BarriosGeoJSON,
  Campus,
  ScoreResultItem,
} from '../api/types';
import { MADRID_CENTER, MADRID_DEFAULT_ZOOM } from '../config';

interface MadridMapProps {
  geoData: BarriosGeoJSON | null;
  scoresById: Record<string, ScoreResultItem>;
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  activeCampus: Campus | null;
}

/** Maps a 0–100 score to a crisp civic-tech teal/amber palette; excluded areas are grey. */
function getScoreColor(result?: ScoreResultItem): string {
  if (!result || result.excluded) return '#cbd5e1';
  if (result.score >= 75) return '#0d9488'; // teal-600
  if (result.score >= 60) return '#14b8a6'; // teal-500
  if (result.score >= 45) return '#5eead4'; // teal-300
  return '#fbbf24'; // amber-400
}

export function MadridMap({
  geoData,
  scoresById,
  selectedAreaId,
  onSelectArea,
  activeCampus,
}: MadridMapProps) {
  // Key changes when selection or scores change so Leaflet updates styles reliably
  const geoLayerKey = useMemo(() => {
    const scoreSig = Object.values(scoresById)
      .slice(0, 5)
      .map((r) => `${r.id}:${r.score}:${r.excluded ? 1 : 0}`)
      .join('|');
    return `${selectedAreaId ?? 'none'}-${scoreSig}`;
  }, [scoresById, selectedAreaId]);

  const styleFeature = (feature?: AreaFeature): PathOptions => {
    const id = feature?.properties?.id;
    const result = id ? scoresById[id] : undefined;
    const isSelected = id === selectedAreaId;

    return {
      fillColor: getScoreColor(result),
      fillOpacity: result?.excluded ? 0.35 : isSelected ? 0.82 : 0.62,
      color: isSelected ? '#0f172a' : '#ffffff',
      weight: isSelected ? 3 : 1.5,
      opacity: 1,
    };
  };

  const onEachFeature = (feature: AreaFeature, layer: Layer) => {
    const { id, name, district } = feature.properties;
    const result = scoresById[id];

    const rentText =
      result?.est_rent_eur_month != null ? `~${result.est_rent_eur_month} €/mes` : 'Sin dato';
    const scoreText = result
      ? result.excluded
        ? 'Fuera de filtros'
        : `${result.score.toFixed(0)}/100`
      : '—';

    layer.bindTooltip(
      `<div style="min-width:130px">
        <div style="font-weight:600;color:#0f172a">${name}</div>
        <div style="color:#64748b;font-size:11px;margin-bottom:3px">${district}</div>
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:11px">
          <span>Puntuación: <strong>${scoreText}</strong></span>
          <span>${rentText}</span>
        </div>
      </div>`,
      { sticky: true, direction: 'top', offset: [0, -6] },
    );

    layer.on({
      click: () => onSelectArea(id),
    });
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MADRID_CENTER}
        zoom={MADRID_DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && (
          <GeoJSON
            key={geoLayerKey}
            data={geoData}
            style={(feature) => styleFeature(feature as AreaFeature | undefined)}
            onEachFeature={(feature, layer) => onEachFeature(feature as AreaFeature, layer)}
          />
        )}

        {activeCampus && (
          <CircleMarker
            center={[activeCampus.coords[1], activeCampus.coords[0]]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#4f46e5',
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <span className="font-semibold text-indigo-700">{activeCampus.name}</span>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Compact choropleth legend */}
      <div className="pointer-events-none absolute top-3 right-3 z-[400] rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-sm backdrop-blur lg:top-auto lg:right-auto lg:bottom-4 lg:left-4">
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
          Ajuste a tu perfil
        </p>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Alto
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-300" /> Medio
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Bajo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Excluido
          </span>
        </div>
      </div>
    </div>
  );
}
