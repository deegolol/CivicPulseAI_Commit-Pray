/**
 * Local mock dataset matching coordination/CONTRACTS.md §3–4.
 * Used when VITE_USE_MOCKS=true so WEB can develop and demo independently of API/DATA.
 */
import type {
  AiExplainRequest,
  AiExplainResponse,
  AiParseRequest,
  AiParseResponse,
  AreaDetailResponse,
  AreaRecord,
  BarriosGeoJSON,
  MetaResponse,
  ScoreRequest,
  ScoreResponse,
  ScoreResultItem,
} from '../api/types';
import { HOUSING_REFERENCE_M2 } from '../config';

export const MOCK_META: MetaResponse = {
  level: 'barrio',
  generated_at: '2026-11-19T13:00:00Z',
  sources: [
    {
      id: 'alquiler',
      name: 'Sistema Estatal de Referencia del Precio del Alquiler',
      publisher: 'MIVAU',
      url: 'https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi',
      license: 'CC BY 4.0',
      retrieved: '2026-11-19',
      granularity: 'barrio',
    },
    {
      id: 'aire',
      name: 'Calidad del aire · Estaciones de vigilancia',
      publisher: 'Ayuntamiento de Madrid',
      url: 'https://datos.madrid.es/',
      license: 'Aviso legal datos.madrid.es',
      retrieved: '2026-11-19',
      granularity: 'estación más cercana',
    },
    {
      id: 'crtm',
      name: 'Red de transporte público (Metro, Cercanías, EMT)',
      publisher: 'CRTM',
      url: 'https://data-crtm.opendata.arcgis.com/',
      license: 'CC BY 4.0',
      retrieved: '2026-11-19',
      granularity: 'barrio',
    },
    {
      id: 'servicios',
      name: 'Bibliotecas, centros culturales e instalaciones deportivas',
      publisher: 'Ayuntamiento de Madrid',
      url: 'https://datos.madrid.es/',
      license: 'Aviso legal datos.madrid.es',
      retrieved: '2026-11-19',
      granularity: 'barrio',
    },
  ],
  indicators: [
    {
      key: 'rent_eur_m2',
      label: 'Alquiler',
      unit: '€/m²',
      higher_is_better: false,
      source: 'alquiler',
    },
    {
      key: 'air_no2',
      label: 'Calidad del aire',
      unit: 'µg/m³ NO₂',
      higher_is_better: false,
      source: 'aire',
    },
    {
      key: 'transit_stops',
      label: 'Transporte',
      unit: 'paradas/km²',
      higher_is_better: true,
      source: 'crtm',
    },
    {
      key: 'services_count',
      label: 'Servicios',
      unit: 'nº',
      higher_is_better: true,
      source: 'servicios',
    },
  ],
  campuses: [
    { id: 'etsisi', name: 'ETSISI · Campus Sur UPM', coords: [-3.6286, 40.3897] },
    { id: 'etsiinf', name: 'ETSIINF · Campus Montegancedo UPM', coords: [-3.8392, 40.4053] },
  ],
  defaults: {
    campus_id: 'etsisi',
    weights: {
      rent_eur_m2: 0.4,
      distance_km: 0.3,
      air_no2: 0.1,
      transit_stops: 0.1,
      services_count: 0.1,
    },
  },
};

export const MOCK_AREAS: AreaRecord[] = [
  {
    id: '182',
    name: 'Santa Eugenia',
    district: 'Villa de Vallecas',
    centroid: [-3.606, 40.3815],
    values: { rent_eur_m2: 13.4, air_no2: 22.5, transit_stops: 28.0, services_count: 9 },
  },
  {
    id: '181',
    name: 'Casco Histórico de Vallecas',
    district: 'Villa de Vallecas',
    centroid: [-3.6235, 40.3785],
    values: { rent_eur_m2: 14.1, air_no2: 25.0, transit_stops: 34.5, services_count: 13 },
  },
  {
    id: '132',
    name: 'Palomeras Sureste',
    district: 'Puente de Vallecas',
    centroid: [-3.642, 40.388],
    values: { rent_eur_m2: 14.6, air_no2: 27.2, transit_stops: 39.0, services_count: 14 },
  },
  {
    id: '144',
    name: 'Pavones',
    district: 'Moratalaz',
    centroid: [-3.635, 40.4025],
    values: { rent_eur_m2: 15.2, air_no2: 24.8, transit_stops: 36.2, services_count: 11 },
  },
  {
    id: '031',
    name: 'Pacífico',
    district: 'Retiro',
    centroid: [-3.675, 40.4055],
    values: { rent_eur_m2: 18.8, air_no2: 29.4, transit_stops: 48.0, services_count: 18 },
  },
  {
    id: '021',
    name: 'Palos de Moguer',
    district: 'Arganzuela',
    centroid: [-3.696, 40.4035],
    values: { rent_eur_m2: 17.3, air_no2: 31.0, transit_stops: 42.5, services_count: 15 },
    notes: { rent_eur_m2: 'dato mock de referencia' },
  },
  {
    id: '104',
    name: 'Aluche',
    district: 'Latina',
    centroid: [-3.758, 40.3895],
    values: { rent_eur_m2: 14.9, air_no2: 23.1, transit_stops: 35.4, services_count: 16 },
  },
  {
    id: '092',
    name: 'Argüelles',
    district: 'Moncloa-Aravaca',
    centroid: [-3.717, 40.4295],
    values: { rent_eur_m2: 21.4, air_no2: 28.0, transit_stops: 52.0, services_count: 21 },
  },
];

/** Helper to create a clean rectangular-ish polygon around a [lon, lat] centroid */
function makeMockPoly(lon: number, lat: number, dLon = 0.011, dLat = 0.0075) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [lon - dLon, lat - dLat * 0.85],
        [lon - dLon * 0.2, lat - dLat],
        [lon + dLon, lat - dLat * 0.7],
        [lon + dLon * 0.9, lat + dLat * 0.85],
        [lon + dLon * 0.1, lat + dLat],
        [lon - dLon * 0.95, lat + dLat * 0.65],
        [lon - dLon, lat - dLat * 0.85],
      ],
    ],
  };
}

export const MOCK_GEOJSON: BarriosGeoJSON = {
  type: 'FeatureCollection',
  features: MOCK_AREAS.map((area) => ({
    type: 'Feature',
    properties: {
      id: area.id,
      name: area.name,
      district_id: area.id.slice(0, 2),
      district: area.district,
    },
    geometry: makeMockPoly(area.centroid[0], area.centroid[1]),
  })),
};

function haversineKm([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(a))).toFixed(1));
}

function buildMockListingLinks(
  areaName: string,
  budget?: number | null,
  housingType: 'room' | 'studio' | 'flat' = 'room',
) {
  const q = encodeURIComponent(`${areaName} Madrid`);
  const maxPrice = budget ? `&maxPrice=${Math.round(budget)}` : '';
  const idealistaPath =
    housingType === 'room' ? 'alquiler-habitacion' : 'alquiler-viviendas';
  return [
    {
      label: 'Idealista',
      url: `https://www.idealista.com/${idealistaPath}/madrid-madrid/?q=${q}${maxPrice}`,
    },
    {
      label: 'Fotocasa',
      url: `https://www.fotocasa.es/es/alquiler/viviendas/madrid-capital/todas-las-zonas/l?q=${q}`,
    },
    {
      label: 'Badi',
      url: `https://badi.com/es/s/Madrid--Espa%C3%B1a?q=${q}`,
    },
  ];
}

export function computeMockScore(req: ScoreRequest): ScoreResponse {
  const campus =
    MOCK_META.campuses.find((c) => c.id === req.campus_id) ?? MOCK_META.campuses[0];
  const housingType = req.housing_type ?? 'room';
  const refM2 = HOUSING_REFERENCE_M2[housingType];

  // Normalize weights so they sum to 1
  const weightEntries = Object.entries(req.weights).filter(([, v]) => v > 0);
  const totalWeight = weightEntries.reduce((acc, [, v]) => acc + v, 0) || 1;
  const normWeights: Record<string, number> = {};
  for (const [k, v] of Object.entries(req.weights)) {
    normWeights[k] = v > 0 ? v / totalWeight : 0;
  }

  const enriched = MOCK_AREAS.map((area) => ({
    area,
    distance_km: haversineKm(area.centroid, campus.coords),
  }));

  // Compute min/max for each indicator
  const keys = ['rent_eur_m2', 'distance_km', 'air_no2', 'transit_stops', 'services_count'] as const;
  const higherIsBetter: Record<string, boolean> = {
    rent_eur_m2: false,
    distance_km: false,
    air_no2: false,
    transit_stops: true,
    services_count: true,
  };

  const bounds: Record<string, { min: number; max: number }> = {};
  for (const key of keys) {
    const vals = enriched
      .map((item) => (key === 'distance_km' ? item.distance_km : item.area.values[key]))
      .filter((v): v is number => v !== null && v !== undefined);
    bounds[key] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }

  const results: ScoreResultItem[] = enriched.map(({ area, distance_km }) => {
    const rent = area.values.rent_eur_m2 ?? null;
    const estRent = rent !== null ? Math.round(rent * refM2) : null;
    const fitsBudget =
      req.budget_eur_month != null && estRent !== null
        ? estRent <= req.budget_eur_month
        : null;
    const affordableM2 =
      req.budget_eur_month != null && rent !== null && rent > 0
        ? Number((req.budget_eur_month / rent).toFixed(1))
        : null;

    let excluded = false;
    if (req.filters?.max_rent_eur_m2 != null && rent !== null && rent > req.filters.max_rent_eur_m2) {
      excluded = true;
    }
    if (req.filters?.max_distance_km != null && distance_km > req.filters.max_distance_km) {
      excluded = true;
    }
    if (req.filters?.only_within_budget && fitsBudget === false) {
      excluded = true;
    }

    const breakdown: ScoreResultItem['breakdown'] = {};
    let totalScore = 0;

    for (const key of keys) {
      const rawVal = key === 'distance_km' ? distance_km : (area.values[key] ?? null);
      const { min, max } = bounds[key];
      let normalized = 0.5;
      if (rawVal !== null) {
        if (max === min) {
          normalized = 1;
        } else {
          const ratio = (rawVal - min) / (max - min);
          normalized = higherIsBetter[key] ? ratio : 1 - ratio;
        }
      }
      const weight = normWeights[key] ?? 0;
      const contribution = Number((normalized * weight * 100).toFixed(1));
      breakdown[key] = {
        value: rawVal,
        normalized: Number(normalized.toFixed(2)),
        weight: Number(weight.toFixed(2)),
        contribution,
      };
      totalScore += contribution;
    }

    return {
      id: area.id,
      name: area.name,
      district: area.district,
      rank: 0,
      score: excluded ? 0 : Number(totalScore.toFixed(1)),
      excluded,
      distance_km,
      est_rent_eur_month: estRent,
      fits_budget: fitsBudget,
      affordable_m2: affordableM2,
      listing_links: buildMockListingLinks(area.name, req.budget_eur_month, housingType),
      breakdown,
    };
  });

  results.sort((a, b) => b.score - a.score);
  results.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const eligible = results.filter((r) => !r.excluded);
  const top = eligible[0] ?? null;
  const highlights: Record<string, string> = {};
  if (eligible.length > 0) {
    const byRent = [...eligible].filter((r) => r.est_rent_eur_month != null).sort((a, b) => (a.est_rent_eur_month ?? 9999) - (b.est_rent_eur_month ?? 9999));
    if (byRent[0]) highlights.cheapest = byRent[0].id;
    const byDist = [...eligible].sort((a, b) => a.distance_km - b.distance_km);
    if (byDist[0]) highlights.closest = byDist[0].id;
    const byAir = [...eligible].filter((r) => r.breakdown.air_no2?.value != null).sort((a, b) => (a.breakdown.air_no2?.value ?? 999) - (b.breakdown.air_no2?.value ?? 999));
    if (byAir[0]) highlights.cleanest_air = byAir[0].id;
    const byTransit = [...eligible].filter((r) => r.breakdown.transit_stops?.value != null).sort((a, b) => (b.breakdown.transit_stops?.value ?? 0) - (a.breakdown.transit_stops?.value ?? 0));
    if (byTransit[0]) highlights.best_transit = byTransit[0].id;
  }

  const recommendation = top
    ? {
        area_id: top.id,
        name: top.name,
        district: top.district,
        headline: `Mejor equilibrio entre precio y cercanía a ${campus.name.split(' · ')[0]}`,
        reasons: [
          top.est_rent_eur_month != null
            ? `Alquiler estimado de ~${top.est_rent_eur_month} €/mes (${top.fits_budget ? 'encaja en tu presupuesto' : 'opción más ajustada'})`
            : 'Referencia de alquiler disponible en detalle',
          `A solo ${top.distance_km} km de tu campus`,
          top.breakdown.air_no2?.value != null
            ? `Calidad del aire de ${top.breakdown.air_no2.value} µg/m³ NO₂`
            : 'Buena puntuación global',
        ],
        caveats:
          top.fits_budget === false && req.budget_eur_month && top.est_rent_eur_month
            ? [`Supera tu presupuesto en ~${top.est_rent_eur_month - req.budget_eur_month} €/mes`]
            : [],
      }
    : null;

  return {
    campus_id: campus.id,
    housing_type: housingType,
    reference_m2: refM2,
    results: req.limit ? results.slice(0, req.limit) : results,
    recommendation,
    highlights,
  };
}

export function getMockAreaDetail(id: string): AreaDetailResponse {
  const area = MOCK_AREAS.find((a) => a.id === id) ?? MOCK_AREAS[0];
  return {
    ...area,
    district_avg: {
      rent_eur_m2: 14.5,
      air_no2: 24.5,
      transit_stops: 33.0,
      services_count: 12,
    },
    city_median: {
      rent_eur_m2: 16.2,
      air_no2: 27.0,
      transit_stops: 38.0,
      services_count: 14,
    },
  };
}

export function mockAiParse(req: AiParseRequest): AiParseResponse {
  const q = req.query.toLowerCase();
  const isEtsiinf = q.includes('etsiinf') || q.includes('montegancedo');
  const budgetMatch = q.match(/(\d{3,4})\s*€?/);
  const budget = budgetMatch ? Number(budgetMatch[1]) : 500;
  const housing_type = q.includes('estudio')
    ? 'studio'
    : q.includes('piso') && !q.includes('compart')
      ? 'flat'
      : 'room';

  return {
    campus_id: isEtsiinf ? 'etsiinf' : 'etsisi',
    weights: {
      rent_eur_m2: 0.4,
      distance_km: 0.25,
      air_no2: q.includes('aire') || q.includes('correr') || q.includes('tranquil') ? 0.25 : 0.1,
      transit_stops: q.includes('metro') || q.includes('transporte') ? 0.2 : 0.05,
      services_count: 0.05,
    },
    filters: { max_rent_eur_m2: null, max_distance_km: null },
    budget_eur_month: budget,
    housing_type,
    interpretation: `Priorizo presupuesto (~${budget} €/mes), cercanía a ${isEtsiinf ? 'ETSIINF' : 'ETSISI'} y calidad del entorno.`,
    engine: 'keywords',
  };
}

export function mockAiExplain(req: AiExplainRequest): AiExplainResponse {
  const topNames = req.area_ids
    .map((id) => MOCK_AREAS.find((a) => a.id === id))
    .filter((a): a is AreaRecord => Boolean(a));

  const lines = topNames.map(
    (a, idx) =>
      `${idx + 1}) ${a.name} (${a.district}): alquiler medio ${a.values.rent_eur_m2} €/m² y NO₂ de ${a.values.air_no2} µg/m³.`,
  );

  return {
    text: lines.join(' '),
    engine: 'keywords',
  };
}
