/**
 * Root application for PrimeraLlave (T25 Redesign v2).
 * 2-screen flow:
 *   - Screen A (OnboardingScreen): map-free entry ("¿Dónde vas a vivir este curso?").
 *     Skipped automatically if URL already carries query params (?campus= / ?budget=).
 *   - Screen B (Results): fixed TopFilterBar + list-first ZoneList (left 440px) + blue-scale MadridMap (right)
 *     + inline neighborhood details + CompareModal. On mobile: full-screen list with floating Mapa/Lista toggle.
 */
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  ScoreFilters,
  ScoreResultItem,
} from './api/types';
import { HOUSING_TYPE_LABELS } from './config';
import {
  AIR_LEVEL_THRESHOLDS,
  DEFAULT_PRIORITIES,
  TRANSPORT_LABELS,
  WELL_CONNECTED_THRESHOLD,
  type AirLevelOption,
  type TransportMode,
} from './constants/filters';
import { AreaDetailPanel } from './components/AreaDetailPanel';
import { CompareModal } from './components/CompareModal';
import { MadridMap } from './components/MadridMap';
import { OnboardingScreen, type SearchReview } from './components/OnboardingScreen';
import { TopFilterBar } from './components/TopFilterBar';
import type { ResultFilters } from './components/ResultsFilters';
import { ZoneList } from './components/ZoneList';
import { formatEuro, formatKm } from './utils/format';
import { searchPreferences } from './utils/searchPreferences';

function readInitialUrlParams() {
  if (typeof window === 'undefined') return { hasParams: false };
  const params = new URLSearchParams(window.location.search);
  const hasParams =
    params.has('campus') || params.has('budget') || params.has('type') || params.has('km');
  const campus = params.get('campus') || undefined;
  const budgetRaw = Number(params.get('budget'));
  const budget =
    Number.isFinite(budgetRaw) && budgetRaw > 0
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
        ? Math.max(0.5, Math.min(60, Number(kmParam)))
        : undefined;
  const min = Number(params.get('min'));
  const minBudget = min > 0 && budget !== undefined && min <= budget ? min : null;
  const preferences = params.get('criteria')?.split(',').flatMap((entry) => {
    const [key, raw = '1'] = entry.split(':');
    const weight = Number(raw);
    return key && Number.isFinite(weight) && weight > 0 ? [[key, weight] as const] : [];
  });
  const mode = params.get('mode');
  const transportMode = mode && Object.prototype.hasOwnProperty.call(TRANSPORT_LABELS, mode) ? mode as TransportMode : 'any';
  const onlyWithinBudget = params.get('range') === '1' || minBudget !== null;
  const locationParam = params.get('location') ?? '';
  const location = /^(area|district):.+$/.test(locationParam) ? locationParam : '';
  return { hasParams: hasParams || Boolean(location), campus, budget, housingType, maxDistanceKm, minBudget, preferences, transportMode, onlyWithinBudget, location };
}

/** T29: every page has its own URL so the browser's back button moves between pages of the app. */
type Route = 'home' | 'form' | 'results';
const ROUTE_PATHS: Record<Route, string> = { home: '/', form: '/buscar', results: '/resultados' };

function routeFromPath(pathname: string): Route {
  if (pathname.startsWith('/resultados')) return 'results';
  if (pathname.startsWith('/buscar')) return 'form';
  return 'home';
}

export function App() {
  const reduced = useReducedMotion();
  const initial = useMemo(() => readInitialUrlParams(), []);
  const [route, setRoute] = useState<Route>(() => {
    const fromPath = routeFromPath(window.location.pathname);
    // Old shared links like "/?campus=…" open the results page directly.
    return fromPath === 'home' && initial.hasParams ? 'results' : fromPath;
  });

  /** Go to a page of the app, adding a history entry so "atrás" returns here. */
  const navigate = (to: Route, options: { replace?: boolean } = {}) => {
    const search = to === 'results' ? window.location.search : '';
    const url = ROUTE_PATHS[to] + search;
    if (options.replace) window.history.replaceState({ app: true, depth: window.history.state?.depth ?? 0 }, '', url);
    else window.history.pushState({ app: true, depth: (window.history.state?.depth ?? 0) + 1 }, '', url);
    setRoute(to);
  };
  /** "Volver": previous page of the app if there is one, otherwise the parent page. Never leaves the app. */
  const goBack = (fallback: Route) => {
    if ((window.history.state?.depth ?? 0) > 0) window.history.back();
    else navigate(fallback, { replace: true });
  };

  useEffect(() => {
    // Normalise the first URL (e.g. "/?campus=…" → "/resultados?campus=…") and follow the browser's back/forward.
    const path = ROUTE_PATHS[route];
    if (window.location.pathname !== path) window.history.replaceState({ app: true, depth: 0 }, '', path + window.location.search);
    else if (!window.history.state?.app) window.history.replaceState({ app: true, depth: 0 }, '', window.location.href);
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Screen A (start + form) vs Screen B (results)
  const screen: 'onboarding' | 'results' = route === 'results' ? 'results' : 'onboarding';
  const viewMotion = {
    initial: reduced ? false as const : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: reduced ? 1 : 0, transition: { duration: reduced ? 0 : 0.12 } },
    transition: { duration: reduced ? 0 : screen === 'results' ? 0.32 : 0.20, ease: 'easeOut' as const },
  };

  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [geoData, setGeoData] = useState<BarriosGeoJSON | null>(null);
  const [centroidsById, setCentroidsById] = useState<Record<string, [number, number]>>({});
  const [rawResults, setRawResults] = useState<ScoreResultItem[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  // User search & real-unit filter state
  const [query, setQuery] = useState('');
  const [campusId, setCampusId] = useState(initial.campus ?? 'etsisi');
  const [budget, setBudget] = useState(initial.budget ?? 500);
  const [minBudget, setMinBudget] = useState<number | null>(initial.minBudget ?? null);
  const [location, setLocation] = useState(initial.location ?? '');
  const [housingType, setHousingType] = useState<HousingType>(initial.housingType ?? 'room');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(
    initial.maxDistanceKm !== undefined ? initial.maxDistanceKm : 10,
  );
  const [airLevel, setAirLevel] = useState<AirLevelOption>('any');
  const [wellConnectedOnly, setWellConnectedOnly] = useState(false);
  const [onlyWithinBudget, setOnlyWithinBudget] = useState(initial.onlyWithinBudget ?? false);
  const [transportMode, setTransportMode] = useState<TransportMode>(initial.transportMode ?? 'any');
  const [preferenceWeights, setPreferenceWeights] = useState<Record<string, number>>(
    () => Object.fromEntries(initial.preferences?.length ? initial.preferences : DEFAULT_PRIORITIES.map((key) => [key, 1])),
  );

  // Search summary & explanation text (from /api/ai/parse & /api/ai/explain)
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchReview, setSearchReview] = useState<SearchReview | null>(null);
  const pendingExplanation = useRef<string | null>(null);

  // Selection, hover, comparison & mobile view state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const mapVisible = screen === 'results' && (desktop || mobileView === 'map');

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Load the controls immediately and fetch the larger map data when the map is opened.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        const metaRes = await getMeta();
        if (cancelled) return;
        setMeta(metaRes);
        setCampusId((current) => metaRes.campuses.some((campus) => campus.id === current)
          ? current
          : metaRes.defaults.campus_id);
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
  }, []);

  useEffect(() => {
    if (!mapVisible || geoData) return;
    let cancelled = false;
    Promise.all([getGeo(), getAreas()]).then(([geo, response]) => {
      if (cancelled) return;
      setGeoData(geo);
      setCentroidsById(Object.fromEntries(response.areas.map((area) => [area.id, area.centroid])));
    }).catch(() => {
      if (!cancelled) setError('No se ha podido cargar el mapa.');
    });
    return () => { cancelled = true; };
  }, [mapVisible, geoData]);

  // T29 bug fix: never land on the results screen scrolled down with blank space. Reset the window
  // scroll on every page change and lock page scrolling while the full-height results view is shown.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    const root = document.documentElement;
    root.style.overflow = screen === 'results' ? 'hidden' : '';
    document.body.style.overflow = screen === 'results' ? 'hidden' : '';
    return () => {
      root.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [screen, route]);

  const availableKeys = useMemo(() => {
    const keys = new Set<string>(DEFAULT_PRIORITIES);
    for (const ind of meta?.indicators ?? []) {
      keys.add(ind.key);
    }
    return keys;
  }, [meta]);

  const computedWeights = useMemo(() => {
    const weights = Object.entries(preferenceWeights).filter(([key, value]) => availableKeys.has(key) && value > 0);
    return Object.fromEntries(weights.length ? weights : DEFAULT_PRIORITIES.map((key) => [key, 1]));
  }, [preferenceWeights, availableKeys]);
  const activeCriteria = useMemo(() => new Set(Object.keys(computedWeights)), [computedWeights]);

  const scoreFilters = useMemo<ScoreFilters>(() => ({
    max_distance_km: maxDistanceKm,
    only_within_budget: onlyWithinBudget,
    min_budget_eur_month: minBudget,
    max_air_no2: activeCriteria.has('air_no2') ? AIR_LEVEL_THRESHOLDS[airLevel] : null,
    min_transit_stops: activeCriteria.has('transit_stops') && wellConnectedOnly ? WELL_CONNECTED_THRESHOLD : null,
  }), [maxDistanceKm, onlyWithinBudget, minBudget, activeCriteria, airLevel, wellConnectedOnly]);

  // Sync URL querystring only when on Screen B (so Screen A stays clean at "/")
  useEffect(() => {
    if (typeof window === 'undefined' || screen !== 'results') return;
    const params = new URLSearchParams(window.location.search);
    params.set('campus', campusId);
    params.set('budget', String(budget));
    params.set('type', housingType);
    params.set('km', maxDistanceKm === null ? 'any' : String(maxDistanceKm));
    if (minBudget !== null) params.set('min', String(minBudget));
    else params.delete('min');
    params.set('criteria', Object.entries(computedWeights).map(([key, weight]) => weight === 1 ? key : key + ':' + weight).join(','));
    if (transportMode !== 'any') params.set('mode', transportMode);
    else params.delete('mode');
    if (onlyWithinBudget) params.set('range', '1');
    else params.delete('range');
    if (location) params.set('location', location);
    else params.delete('location');
    window.history.replaceState(window.history.state, '', `${ROUTE_PATHS.results}?${params.toString()}`);
  }, [screen, campusId, budget, housingType, maxDistanceKm, minBudget, computedWeights, transportMode, onlyWithinBudget, location]);

  // Cancel obsolete rankings so a slower response cannot replace a newer search.
  useEffect(() => {
    if (!meta || screen !== 'results' || !campusId || budget <= 0) return;
    const controller = new AbortController();
    setIsScoring(true);
    setAiExplanation(null);
    setAiLoading(Boolean(pendingExplanation.current));
    async function updateScore() {
      try {
        const scored = await postScore({
          campus_id: campusId,
          weights: computedWeights,
          filters: scoreFilters,
          budget_eur_month: budget,
          housing_type: housingType,
        }, controller.signal);
        if (controller.signal.aborted) return;
        setRawResults(scored.results);
        setRecommendation(scored.recommendation ?? null);
        setHighlights(scored.highlights ?? {});
        setError(null);
        setIsScoring(false);

        const confirmedQuery = pendingExplanation.current;
        pendingExplanation.current = null;
        const top3 = scored.results.filter((item) => !item.excluded).slice(0, 3);
        if (confirmedQuery && top3.length) {
          try {
            const explained = await postAiExplain({
              campus_id: campusId,
              weights: computedWeights,
              area_ids: top3.map((item) => item.id),
              query: confirmedQuery,
              budget_eur_month: budget,
              housing_type: housingType,
              filters: scoreFilters,
            });
            if (!controller.signal.aborted) setAiExplanation(explained.text);
          } catch (err) {
            if (controller.signal.aborted) return;
            if (err instanceof ApiError && err.status === 429) setRateLimitNotice(err.detail);
            setAiExplanation(top3.map((item, index) =>
              `${index + 1}) ${item.name}: ${formatEuro(item.est_rent_eur_month)}/mes a ${formatKm(item.distance_km)}.`,
            ).join(' '));
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Error calculando recomendaciones');
      } finally {
        if (!controller.signal.aborted) {
          setIsScoring(false);
          setAiLoading(false);
        }
      }
    }
    updateScore();
    return () => controller.abort();
  }, [meta, screen, campusId, computedWeights, scoreFilters, budget, housingType]);

  const results = useMemo(() => {
    if (location.startsWith('area:')) return rawResults.filter((area) => area.id === location.slice(5));
    if (location.startsWith('district:')) return rawResults.filter((area) => area.district === location.slice(9));
    return rawResults;
  }, [rawResults, location]);
  const locationLabel = location.startsWith('district:')
    ? location.slice(9)
    : results.find((area) => area.id === location.slice(5))?.name;
  const visibleRecommendation = results.some((area) => area.id === recommendation?.area_id) ? recommendation : null;
  const visibleHighlights = useMemo(() => {
    const keys = { cheapest: 'rent_eur_m2', closest: 'distance_km', cleanest_air: 'air_no2', best_transit: 'transit_stops' };
    return Object.fromEntries(Object.entries(highlights).filter(([key]) => activeCriteria.has(keys[key as keyof typeof keys])));
  }, [highlights, activeCriteria]);

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

  const handlePriorityChange = (key: string, weight: number) => {
    if (weight === 0 && activeCriteria.size === 1 && activeCriteria.has(key)) return;
    if (weight === 0 && key === 'air_no2') setAirLevel('any');
    if (weight === 0 && key === 'transit_stops') setWellConnectedOnly(false);
    const next = { ...preferenceWeights, ...computedWeights };
    if (weight > 0) next[key] = weight;
    else delete next[key];
    setPreferenceWeights(next);
    setAiExplanation(null);
  };

  const handleTransportModeChange = (mode: TransportMode) => {
    setTransportMode(mode);
    const key = mode === 'metro' ? 'transit_stops' : 'distance_km';
    if (mode !== 'any' && availableKeys.has(key) && !activeCriteria.has(key)) {
      setPreferenceWeights((previous) => ({ ...previous, ...computedWeights, [key]: 1 }));
    }
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

  const handleSearchSubmit = async (queryText: string) => {
    if (searching) return;
    setSelectedAreaId(null);
    setSearching(true);
    setSearchError(null);
    setRateLimitNotice(null);
    setAiExplanation(null);

    try {
      const parsed = await postAiParse({ query: queryText });
      const inferred = searchPreferences(queryText, parsed, availableKeys, meta?.campuses.find((campus) => campus.id === parsed.campus_id));
      setCampusId(inferred.inferredFields.has('campus') ? parsed.campus_id : campusId || parsed.campus_id);
      setBudget(inferred.budget ?? budget);
      setMinBudget(inferred.minBudget);
      setHousingType(parsed.housing_type || housingType);
      setMaxDistanceKm(parsed.filters.max_distance_km ?? maxDistanceKm);
      setAirLevel('any');
      setWellConnectedOnly(false);
      setTransportMode(inferred.transportMode);
      setPreferenceWeights(Object.fromEntries(inferred.selectedPriorities.map((key) => {
        const weight = parsed.weights[key] ?? 0;
        return [key, weight >= 0.5 ? weight : 1];
      })));
      setAiInterpretation(parsed.interpretation);
      setSearchReview({ query: queryText, inferredFields: inferred.inferredFields });
      navigate('form');
    } catch (err) {
      setSearchError(err instanceof ApiError && err.status === 429
        ? err.detail
        : 'No se ha podido interpretar la búsqueda. Puedes rellenarla a mano.');
    } finally {
      setSearching(false);
    }
  };

  const handleStart = () => {
    pendingExplanation.current = searchReview?.query ?? null;
    if (!searchReview) {
      setAiInterpretation(null);
    }
    setSearchReview(null);
    setOnlyWithinBudget(true);
    setLocation('');
    setSelectedAreaId(null);
    setHoveredAreaId(null);
    setCompareIds([]);
    setCompareOpen(false);
    setMobileView('list');
    setRawResults([]);
    setRecommendation(null);
    setHighlights({});
    setIsScoring(true);
    navigate('results');
  };

  const handleResetHome = () => {
    setSearchReview(null);
    setSelectedAreaId(null);
    navigate('home');
  };

  function handleApplyFilters(filters: ResultFilters) {
    setCampusId(filters.campusId);
    setBudget(filters.budget);
    setMinBudget(filters.minBudget);
    setHousingType(filters.housingType);
    setMaxDistanceKm(filters.maxDistanceKm);
    setAirLevel(filters.airLevel);
    setWellConnectedOnly(filters.wellConnectedOnly);
    setOnlyWithinBudget(filters.onlyWithinBudget);
    setTransportMode(filters.transportMode);
    if (filters.priorityWeights !== computedWeights) setPreferenceWeights(filters.priorityWeights);
    if (location !== filters.location) {
      setSelectedAreaId(null);
      setHoveredAreaId(null);
      setCompareIds([]);
      setCompareOpen(false);
      setAiExplanation(null);
      setLocation(filters.location);
    }
  }

  const campusName = activeCampus?.name ?? campusId.toUpperCase();
  const budgetRange = minBudget === null ? `hasta ${formatEuro(budget)}` : `${formatEuro(minBudget)}–${formatEuro(budget)}`;
  const summaryLine = `${HOUSING_TYPE_LABELS[housingType]} · ${budgetRange}/mes · ${campusName}${
    maxDistanceKm !== null ? ` (≤ ${formatKm(maxDistanceKm)})` : ''
  }${locationLabel ? ' · ' + locationLabel : ''}`;

  const screenView = screen === 'onboarding' ? (
    <m.div key={route} data-ui-motion="screen" {...viewMotion}>
      <OnboardingScreen
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearchSubmit}
        searching={searching}
        searchError={searchError}
        review={searchReview}
        view={route === 'form' ? 'form' : 'phrase'}
        onOpenForm={() => navigate('form')}
        onBack={() => { setSearchReview(null); goBack('home'); }}
        onHome={handleResetHome}
        interpretation={aiInterpretation}
        campuses={meta?.campuses ?? []}
        campusId={campusId}
        onCampusChange={setCampusId}
        budget={budget}
        minBudget={minBudget}
        onBudgetChange={setBudget}
        onMinBudgetChange={setMinBudget}
        housingType={housingType}
        onHousingTypeChange={setHousingType}
        maxDistanceKm={maxDistanceKm}
        onMaxDistanceChange={setMaxDistanceKm}
        transportMode={transportMode}
        onTransportModeChange={handleTransportModeChange}
        availableKeys={availableKeys}
        priorityWeights={computedWeights}
        onPriorityChange={handlePriorityChange}
        onStart={handleStart}
        sources={meta?.sources ?? []}
      />
    </m.div>
    ) : (
    <m.div key="results" data-ui-motion="screen" {...viewMotion} className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      <TopFilterBar
        availableKeys={availableKeys}
        onResetHome={handleResetHome}
        query={query}
        searching={searching}
        searchError={searchError}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearchSubmit}
        campuses={meta?.campuses ?? []}
        areas={rawResults}
        filters={{
          campusId, budget, minBudget, housingType, maxDistanceKm, airLevel, wellConnectedOnly, onlyWithinBudget,
          priorityWeights: computedWeights, transportMode, location,
        }}
        onApplyFilters={handleApplyFilters}
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
          data-mobile-active={mobileView === 'list'}
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden lg:flex'
          } h-full w-full shrink-0 flex-col border-r border-border lg:w-[440px]`}
        >
          <ZoneList
            results={results}
            recommendation={visibleRecommendation}
            highlights={visibleHighlights}
            budget={budget}
            summaryLine={summaryLine}
            explanationText={aiExplanation}
            explanationLoading={aiLoading}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            onSelectArea={(id) => setSelectedAreaId((current) => current === id ? null : id)}
            renderDetails={(area) => <AreaDetailPanel area={area} indicators={meta?.indicators ?? []}
              activeCriteria={activeCriteria} sources={meta?.sources ?? []} budget={budget} housingType={housingType} />}
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
          data-mobile-active={mobileView === 'map'}
          className={`${
            mobileView === 'map' ? 'block' : 'hidden lg:block'
          } relative z-0 min-w-0 flex-1`}
        >
          {(mapVisible || geoData) && <MadridMap
            geoData={geoData}
            scoresById={scoresById}
            top10RankById={top10RankById}
            centroidsById={centroidsById}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            recommendedAreaId={visibleRecommendation?.area_id ?? null}
            onSelectArea={(id) => {
              if (location && !scoresById[id]) return;
              setSelectedAreaId(id);
              setMobileView('list');
            }}
            onHoverArea={(id) => setHoveredAreaId(id && location && !scoresById[id] ? null : id)}
            activeCampus={activeCampus}
            maxDistanceKm={maxDistanceKm}
            budget={budget}
            isScoring={isScoring}
            isVisible={mapVisible}
          />}
        </main>

        {/* Mobile view toggle */}
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
      </div>

      {/* Comparison Modal */}
      <AnimatePresence initial={false}>
        {compareOpen && comparedAreas.length >= 2 && (
          <CompareModal
            key="comparison"
            areas={comparedAreas}
            indicators={meta?.indicators ?? []}
            activeCriteria={activeCriteria}
            housingType={housingType}
            budget={budget}
            onRemove={handleToggleCompare}
            onClose={() => setCompareOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Ultra-discreet mock indicator only when running in mock mode (top-right inside map, zero attribution overlap) */}
      {(USE_MOCKS || meta?.is_mock) && (
        <div className="pointer-events-none fixed right-3 bottom-7 z-30 hidden rounded-[6px] bg-bg/90 px-2 py-0.5 text-[10px] text-muted lg:block">
          Modo demostración
        </div>
      )}
    </m.div>
  );

  return (
    <AnimatePresence initial={false} mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
      {screenView}
    </AnimatePresence>
  );
}

export default App;
