/**
 * Root application for PrimeraLlave (T25 Redesign v2).
 * 2-screen flow:
 *   - Screen A (OnboardingScreen): map-free entry ("¿Dónde vas a vivir este curso?").
 *     Skipped automatically if URL already carries query params (?campus= / ?budget=).
 *   - Screen B (Results): fixed TopFilterBar + list-first ZoneList (left 440px) + blue-scale MadridMap (right)
 *     + slide-over AreaDetailPanel + CompareModal. On mobile: full-screen list with floating Mapa/Lista toggle.
 */
import { useEffect, useMemo, useState } from 'react';
import { List, Map as MapIcon } from 'lucide-react';
import {
  ApiError,
  getAreas,
  getGeo,
  getMeta,
  postAiExplain,
  postAiParse,
  postScore,
  USE_MOCKS,
} from './api/client';
import type {
  BarriosGeoJSON,
  HousingType,
  MetaResponse,
  Recommendation,
  ScoreResultItem,
} from './api/types';
import { HOUSING_TYPE_LABELS } from './config';
import {
  AIR_LEVEL_THRESHOLDS,
  WELL_CONNECTED_THRESHOLD,
  type AirLevelOption,
} from './constants/filters';
import { AreaDetailPanel } from './components/AreaDetailPanel';
import { CompareModal } from './components/CompareModal';
import { MadridMap } from './components/MadridMap';
import { OnboardingScreen } from './components/OnboardingScreen';
import { TopFilterBar } from './components/TopFilterBar';
import { ZoneList } from './components/ZoneList';
import { formatEuro, formatKm } from './utils/format';

function prioritiesToWeights(
  selected: string[],
  availableKeys: Set<string>,
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const key of availableKeys) {
    weights[key] = selected.includes(key) ? 1.0 : 0.2;
  }
  return weights;
}

function readInitialUrlParams() {
  if (typeof window === 'undefined') return { hasParams: false };
  const params = new URLSearchParams(window.location.search);
  const hasParams =
    params.has('campus') || params.has('budget') || params.has('type') || params.has('km');
  const campus = params.get('campus') || undefined;
  const budgetRaw = Number(params.get('budget'));
  const budget =
    Number.isFinite(budgetRaw) && budgetRaw >= 300 && budgetRaw <= 1500
      ? budgetRaw
      : undefined;
  const typeParam = params.get('type');
  const housingType: HousingType | undefined =
    typeParam === 'room' || typeParam === 'studio' || typeParam === 'flat'
      ? typeParam
      : undefined;
  const kmParam = params.get('km');
  const maxDistanceKm =
    kmParam === 'any'
      ? null
      : kmParam && Number.isFinite(Number(kmParam))
        ? Math.max(2, Math.min(20, Number(kmParam)))
        : undefined;
  return { hasParams, campus, budget, housingType, maxDistanceKm };
}

export function App() {
  const initial = useMemo(() => readInitialUrlParams(), []);

  // Screen A (onboarding) vs Screen B (results)
  const [screen, setScreen] = useState<'onboarding' | 'results'>(
    initial.hasParams ? 'results' : 'onboarding',
  );

  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [geoData, setGeoData] = useState<BarriosGeoJSON | null>(null);
  const [centroidsById, setCentroidsById] = useState<Record<string, [number, number]>>({});
  const [rawResults, setRawResults] = useState<ScoreResultItem[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [referenceM2, setReferenceM2] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  // User search & real-unit filter state
  const [query, setQuery] = useState('');
  const [campusId, setCampusId] = useState(initial.campus ?? 'etsisi');
  const [budget, setBudget] = useState(initial.budget ?? 500);
  const [housingType, setHousingType] = useState<HousingType>(initial.housingType ?? 'room');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(
    initial.maxDistanceKm !== undefined ? initial.maxDistanceKm : 10,
  );
  const [airLevel, setAirLevel] = useState<AirLevelOption>('any');
  const [wellConnectedOnly, setWellConnectedOnly] = useState(false);
  const [onlyWithinBudget, setOnlyWithinBudget] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    'rent_eur_m2',
    'distance_km',
  ]);
  const [aiWeightsOverride, setAiWeightsOverride] = useState<Record<string, number> | null>(null);

  // Search summary & explanation text (from /api/ai/parse & /api/ai/explain)
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Selection, hover, comparison & mobile view state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Bootstrap metadata, GeoJSON, and area centroids
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        const [metaRes, geoRes, areasRes] = await Promise.all([
          getMeta(),
          getGeo(),
          getAreas(),
        ]);
        if (cancelled) return;
        setMeta(metaRes);
        setGeoData(geoRes);
        if (!initial.campus) {
          setCampusId(metaRes.defaults.campus_id);
        }
        const centroidMap: Record<string, [number, number]> = {};
        for (const a of areasRes.areas) {
          centroidMap[a.id] = a.centroid;
        }
        setCentroidsById(centroidMap);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando datos iniciales');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [initial.campus]);

  const availableKeys = useMemo(() => {
    const keys = new Set<string>(['distance_km']);
    for (const ind of meta?.indicators ?? []) {
      keys.add(ind.key);
    }
    return keys;
  }, [meta]);

  const computedWeights = useMemo(() => {
    if (aiWeightsOverride) {
      const filtered: Record<string, number> = {};
      for (const key of availableKeys) {
        if (aiWeightsOverride[key] !== undefined) {
          filtered[key] = aiWeightsOverride[key];
        }
      }
      if (Object.keys(filtered).length > 0) return filtered;
    }
    return prioritiesToWeights(selectedPriorities, availableKeys);
  }, [aiWeightsOverride, selectedPriorities, availableKeys]);

  // Sync URL querystring only when on Screen B (so Screen A stays clean at "/")
  useEffect(() => {
    if (typeof window === 'undefined' || screen !== 'results') return;
    const params = new URLSearchParams(window.location.search);
    params.set('campus', campusId);
    params.set('budget', String(budget));
    params.set('type', housingType);
    params.set('km', maxDistanceKm === null ? 'any' : String(maxDistanceKm));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [screen, campusId, budget, housingType, maxDistanceKm]);

  // Score whenever parameters change on Screen B (debounced 250 ms)
  useEffect(() => {
    if (!meta || screen !== 'results') return;
    let cancelled = false;
    setIsScoring(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await postScore({
          campus_id: campusId,
          weights: computedWeights,
          filters: {
            max_distance_km: maxDistanceKm,
            only_within_budget: onlyWithinBudget,
          },
          budget_eur_month: budget,
          housing_type: housingType,
        });
        if (!cancelled) {
          setRawResults(res.results);
          setRecommendation(res.recommendation ?? null);
          setHighlights(res.highlights ?? {});
          setReferenceM2(res.reference_m2);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error calculando recomendaciones');
        }
      } finally {
        if (!cancelled) setIsScoring(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [meta, screen, campusId, computedWeights, maxDistanceKm, onlyWithinBudget, budget, housingType]);

  // Apply real-unit client-side thresholds for air NO₂ and Metro density
  const results = useMemo(() => {
    const maxNo2 = AIR_LEVEL_THRESHOLDS[airLevel];
    const mapped = rawResults.map((item) => {
      const no2 = item.breakdown.air_no2?.value;
      const transit = item.breakdown.transit_stops?.value;
      let excluded = item.excluded;

      if (maxNo2 !== null && no2 != null && no2 > maxNo2) {
        excluded = true;
      }
      if (wellConnectedOnly && (transit == null || transit < WELL_CONNECTED_THRESHOLD)) {
        excluded = true;
      }

      return {
        ...item,
        excluded,
        score: excluded ? 0 : item.score,
      };
    });

    mapped.sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
      return b.score - a.score;
    });

    return mapped.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [rawResults, airLevel, wellConnectedOnly]);

  const scoresById = useMemo(() => {
    const map: Record<string, ScoreResultItem> = {};
    for (const item of results) map[item.id] = item;
    return map;
  }, [results]);

  // Only Top 10 non-excluded neighborhoods are highlighted in blue on the map (T25)
  const top10RankById = useMemo(() => {
    const map: Record<string, number> = {};
    const top10 = results.filter((r) => !r.excluded).slice(0, 10);
    top10.forEach((item, idx) => {
      map[item.id] = idx + 1;
    });
    return map;
  }, [results]);

  const selectedArea = selectedAreaId ? (scoresById[selectedAreaId] ?? null) : null;
  const comparedAreas = useMemo(
    () =>
      compareIds
        .map((id) => scoresById[id])
        .filter((item): item is ScoreResultItem => Boolean(item)),
    [compareIds, scoresById],
  );
  const activeCampus = useMemo(
    () => meta?.campuses.find((c) => c.id === campusId) ?? null,
    [meta, campusId],
  );

  const handleTogglePriority = (key: string) => {
    setAiWeightsOverride(null);
    setSelectedPriorities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleToggleCompare = (areaId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(areaId)) {
        const next = prev.filter((id) => id !== areaId);
        if (next.length < 2) setCompareOpen(false);
        return next;
      }
      if (prev.length >= 3) return prev;
      return [...prev, areaId];
    });
  };

  /** 1-click compare Top 3 non-excluded zones immediately */
  const handleCompareTop3 = () => {
    const top3Ids = results
      .filter((r) => !r.excluded)
      .slice(0, 3)
      .map((r) => r.id);
    if (top3Ids.length >= 2) {
      setCompareIds(top3Ids);
      setCompareOpen(true);
    }
  };

  /** 1-click compare from AreaDetailPanel: compares this area against the top 2 other zones */
  const handleQuickCompareFromDetail = (areaId: string) => {
    const others = results
      .filter((r) => !r.excluded && r.id !== areaId)
      .slice(0, 2)
      .map((r) => r.id);
    const nextIds = [areaId, ...others];
    if (nextIds.length >= 2) {
      setCompareIds(nextIds);
      setCompareOpen(true);
    }
  };

  const handleSearchSubmit = async (queryText: string) => {
    setScreen('results');
    setSelectedAreaId(null);
    setMobileView('list');
    setAiLoading(true);
    setRateLimitNotice(null);

    try {
      const parsed = await postAiParse({ query: queryText });
      const nextCampus = parsed.campus_id || campusId;
      const nextBudget = parsed.budget_eur_month ?? budget;
      const nextHousing = parsed.housing_type ?? housingType;
      const nextMaxDist =
        parsed.filters?.max_distance_km !== undefined
          ? parsed.filters.max_distance_km
          : maxDistanceKm;
      const nextOnlyWithinBudget =
        parsed.filters?.only_within_budget !== undefined &&
        parsed.filters?.only_within_budget !== null
          ? parsed.filters.only_within_budget
          : false;

      setCampusId(nextCampus);
      setBudget(nextBudget);
      setHousingType(nextHousing);
      setMaxDistanceKm(nextMaxDist);
      setOnlyWithinBudget(nextOnlyWithinBudget);
      setAiInterpretation(parsed.interpretation);

      const exactWeights: Record<string, number> = {};
      for (const [k, w] of Object.entries(parsed.weights)) {
        if (availableKeys.has(k) && typeof w === 'number' && w >= 0) {
          exactWeights[k] = w;
        }
      }
      const nextWeights =
        Object.keys(exactWeights).length > 0
          ? exactWeights
          : prioritiesToWeights(selectedPriorities, availableKeys);
      setAiWeightsOverride(Object.keys(exactWeights).length > 0 ? exactWeights : null);

      const topKeys = Object.entries(nextWeights)
        .filter(([, w]) => w >= 0.2)
        .map(([k]) => k);
      if (topKeys.length > 0) setSelectedPriorities(topKeys);

      const scored = await postScore({
        campus_id: nextCampus,
        weights: nextWeights,
        filters: {
          max_distance_km: nextMaxDist,
          only_within_budget: nextOnlyWithinBudget,
        },
        budget_eur_month: nextBudget,
        housing_type: nextHousing,
      });
      setRawResults(scored.results);
      setRecommendation(scored.recommendation ?? null);
      setHighlights(scored.highlights ?? {});
      setReferenceM2(scored.reference_m2);

      const top3Items = scored.results.filter((r) => !r.excluded).slice(0, 3);
      const top3Ids = top3Items.map((r) => r.id);

      if (top3Ids.length > 0) {
        try {
          const explained = await postAiExplain({
            campus_id: nextCampus,
            weights: nextWeights,
            area_ids: top3Ids,
            query: queryText,
            budget_eur_month: nextBudget,
            housing_type: nextHousing,
            filters: {
              max_distance_km: nextMaxDist,
              only_within_budget: nextOnlyWithinBudget,
            },
          });
          setAiExplanation(explained.text);
        } catch (err) {
          if (err instanceof ApiError && err.status === 429) {
            setRateLimitNotice(err.detail);
          }
          const fallbackSummary = top3Items
            .map((item, i) => {
              const rent =
                item.est_rent_eur_month != null
                  ? `~${formatEuro(item.est_rent_eur_month)}/mes`
                  : 'sin dato de alquiler';
              return `${i + 1}) ${item.name} (${item.district}): ${rent} a ${formatKm(item.distance_km)}.`;
            })
            .join(' ');
          setAiExplanation(fallbackSummary);
        }
      } else {
        setAiExplanation(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitNotice(err.detail);
      }
      setAiInterpretation(null);
      setAiExplanation(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetHome = () => {
    setScreen('onboarding');
    setSelectedAreaId(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const campusShort = activeCampus?.name.split(' · ')[0] ?? campusId.toUpperCase();
  const summaryLine =
    aiInterpretation ||
    `${HOUSING_TYPE_LABELS[housingType]} hasta ${formatEuro(budget)} cerca de ${campusShort}${
      maxDistanceKm !== null ? ` (≤ ${formatKm(maxDistanceKm)})` : ''
    }`;

  // Screen A: Map-free Onboarding
  if (screen === 'onboarding') {
    return (
      <div className="transition-opacity duration-300">
        <OnboardingScreen
          query={query}
          onQueryChange={setQuery}
          onSearchSubmit={handleSearchSubmit}
          campuses={meta?.campuses ?? []}
          campusId={campusId}
          onCampusChange={setCampusId}
          budget={budget}
          onBudgetChange={setBudget}
          housingType={housingType}
          onHousingTypeChange={setHousingType}
          onStartManual={() => {
            setAiInterpretation(null);
            setAiExplanation(null);
            setScreen('results');
          }}
        />
      </div>
    );
  }

  // Screen B: Results (List first on left, blue-scale Map on right)
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg transition-opacity duration-300">
      <TopFilterBar
        availableKeys={availableKeys}
        onResetHome={handleResetHome}
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearchSubmit}
        campuses={meta?.campuses ?? []}
        campusId={campusId}
        onCampusChange={setCampusId}
        budget={budget}
        onBudgetChange={setBudget}
        housingType={housingType}
        onHousingTypeChange={setHousingType}
        maxDistanceKm={maxDistanceKm}
        onMaxDistanceChange={setMaxDistanceKm}
        airLevel={airLevel}
        onAirLevelChange={setAirLevel}
        wellConnectedOnly={wellConnectedOnly}
        onWellConnectedChange={setWellConnectedOnly}
        onlyWithinBudget={onlyWithinBudget}
        onOnlyWithinBudgetChange={setOnlyWithinBudget}
        selectedPriorities={selectedPriorities}
        onTogglePriority={handleTogglePriority}
        compareCount={compareIds.length}
        onOpenCompare={() => setCompareOpen(true)}
      />

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border-b border-border bg-over-soft px-4 py-2 text-xs text-over"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[6px] bg-over px-2.5 py-1 text-[11px] font-medium text-bg"
          >
            Reintentar
          </button>
        </div>
      )}

      {rateLimitNotice && (
        <div
          role="status"
          className="flex items-center justify-between border-b border-border bg-over-soft px-4 py-2 text-xs text-over"
        >
          <span>{rateLimitNotice}</span>
          <button
            type="button"
            onClick={() => setRateLimitNotice(null)}
            className="rounded-[6px] border border-over/30 px-2 py-0.5 text-[11px] font-medium text-over"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left Column: Ordered Zone List (440px desktop, full-screen on mobile when mobileView='list') */}
        <section
          aria-label="Lista de zonas recomendadas"
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden lg:flex'
          } h-full w-full shrink-0 flex-col border-r border-border lg:w-[440px]`}
        >
          <ZoneList
            results={results}
            recommendation={recommendation}
            highlights={highlights}
            budget={budget}
            summaryLine={summaryLine}
            explanationText={aiExplanation}
            explanationLoading={aiLoading}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            onSelectArea={(id) => setSelectedAreaId(id)}
            onHoverArea={setHoveredAreaId}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onOpenCompare={() => setCompareOpen(true)}
            onCompareTop3={handleCompareTop3}
            loading={loading || ((isScoring || aiLoading) && rawResults.length === 0)}
          />
        </section>

        {/* Right Column: Support Map (desktop flex-1, mobile full-screen when mobileView='map') */}
        <main
          className={`${
            mobileView === 'map' ? 'block' : 'hidden lg:block'
          } relative z-0 min-w-0 flex-1`}
        >
          <MadridMap
            geoData={geoData}
            scoresById={scoresById}
            top10RankById={top10RankById}
            centroidsById={centroidsById}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            recommendedAreaId={recommendation?.area_id ?? null}
            onSelectArea={(id) => setSelectedAreaId(id)}
            onHoverArea={setHoveredAreaId}
            activeCampus={activeCampus}
            maxDistanceKm={maxDistanceKm}
            budget={budget}
            isScoring={isScoring}
            isVisible={mobileView === 'map' || typeof window === 'undefined' || window.innerWidth >= 1024}
          />
        </main>

        {/* Area Detail Slide-Over Panel (right side on desktop, full-screen on mobile) */}
        {selectedArea && (
          <aside
            aria-label={`Detalle de ${selectedArea.name}`}
            className="fixed inset-0 z-50 border-l border-border bg-bg lg:absolute lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[420px] lg:shadow-popover"
          >
            <AreaDetailPanel
              area={selectedArea}
              indicators={meta?.indicators ?? []}
              sources={meta?.sources ?? []}
              budget={budget}
              housingType={housingType}
              referenceM2={referenceM2}
              onQuickCompare={handleQuickCompareFromDetail}
              onClose={() => setSelectedAreaId(null)}
            />
          </aside>
        )}

        {/* Mobile Floating Toggle Button ("Mapa" / "Lista") */}
        {!selectedArea && (
          <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-bg shadow-popover transition active:scale-95"
            >
              {mobileView === 'list' ? (
                <>
                  <MapIcon className="h-4 w-4" strokeWidth={1.75} />
                  <span>Mapa</span>
                </>
              ) : (
                <>
                  <List className="h-4 w-4" strokeWidth={1.75} />
                  <span>Lista</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {compareOpen && comparedAreas.length >= 2 && (
        <CompareModal
          areas={comparedAreas}
          indicators={meta?.indicators ?? []}
          housingType={housingType}
          budget={budget}
          onRemove={handleToggleCompare}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {/* Ultra-discreet mock indicator only when running in mock mode (top-right inside map, zero attribution overlap) */}
      {(USE_MOCKS || meta?.is_mock) && (
        <div className="pointer-events-none fixed right-3 bottom-7 z-30 hidden rounded-[6px] bg-bg/90 px-2 py-0.5 text-[10px] text-muted lg:block">
          Modo demostración
        </div>
      )}
    </div>
  );
}

export default App;
