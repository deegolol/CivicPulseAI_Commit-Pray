/**
 * Root application for PrimeraLlave (T25 Redesign v2).
 * 2-screen flow:
 *   - Screen A (OnboardingScreen): map-free entry ("¿Dónde vas a vivir este curso?").
 *     Skipped automatically if URL already carries query params (?campus= / ?budget=).
 *   - Screen B (Results): fixed TopFilterBar + list-first ZoneList (left 440px) + blue-scale MadridMap (right)
 *     + inline neighborhood details + CompareModal. On mobile: full-screen list with floating Mapa/Lista toggle.
 */
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DEFAULT_LAYERS, type LayerId } from './components/MapLayers';
// Heavy parts (Leaflet map, Recharts comparison) are downloaded only when the results page needs them.
const MadridMap = lazy(() => import('./components/MadridMap').then((m) => ({ default: m.MadridMap })));
const CompareModal = lazy(() => import('./components/CompareModal').then((m) => ({ default: m.CompareModal })));
import { OnboardingScreen } from './components/OnboardingScreen';
import { TopFilterBar } from './components/TopFilterBar';
import type { ResultFilters } from './components/ResultsFilters';
import { ZoneList } from './components/ZoneList';
import { formatEuro, formatMinutes } from './utils/format';
import { looksLikeLanguage } from './utils/sanity';
import { searchPreferences } from './utils/searchPreferences';

function readInitialUrlParams() {
  if (typeof window === 'undefined') return { hasParams: false };
  const params = new URLSearchParams(window.location.search);
  const hasParams =
    params.has('campus') || params.has('budget') || params.has('type') || params.has('mins');
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
  const minsParam = params.get('mins');
  const maxTravelMin =
    minsParam === 'any'
      ? null
      : minsParam && Number.isFinite(Number(minsParam))
        ? Math.max(5, Math.min(180, Number(minsParam)))
        : undefined;
  const min = Number(params.get('min'));
  const minBudget = min > 0 && budget !== undefined && min <= budget ? min : null;
  const preferences = params.get('criteria')?.split(',').flatMap((entry) => {
    const [key, raw = '1'] = entry.split(':');
    const weight = Number(raw);
    return key && Number.isFinite(weight) && weight > 0 ? [[key, weight] as const] : [];
  });
  const mode = params.get('mode');
  const transportMode = mode && Object.prototype.hasOwnProperty.call(TRANSPORT_LABELS, mode) ? mode as TransportMode : 'transit';
  const onlyWithinBudget = params.get('range') === '1' || minBudget !== null;
  const locationParam = params.get('location') ?? '';
  const location = /^(area|district):.+$/.test(locationParam) ? locationParam : '';
  return { hasParams: hasParams || Boolean(location), campus, budget, housingType, maxTravelMin, minBudget, preferences, transportMode, onlyWithinBudget, location };
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
  const metaRequest = useRef<Promise<MetaResponse> | null>(null);
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
  const [maxTravelMin, setMaxTravelMin] = useState<number | null>(
    initial.maxTravelMin !== undefined ? initial.maxTravelMin : 45,
  );
  const [airLevel, setAirLevel] = useState<AirLevelOption>('any');
  const [wellConnectedOnly, setWellConnectedOnly] = useState(false);
  const [onlyWithinBudget, setOnlyWithinBudget] = useState(initial.onlyWithinBudget ?? false);
  const [transportMode, setTransportMode] = useState<TransportMode>(initial.transportMode ?? 'transit');
  const [preferenceWeights, setPreferenceWeights] = useState<Record<string, number>>(
    () => Object.fromEntries(initial.preferences?.length ? initial.preferences : DEFAULT_PRIORITIES.map((key) => [key, 1])),
  );

  // Natural-language search and explanation state.
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const pendingExplanation = useRef<string | null>(null);

  // Selection, hover, comparison & mobile view state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [mapLayers, setMapLayers] = useState<ReadonlySet<LayerId>>(() => new Set(DEFAULT_LAYERS));
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
        const metaRes = await (metaRequest.current ??= getMeta());
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
    max_travel_min: maxTravelMin,
    only_within_budget: onlyWithinBudget,
    // Only flats have an official price to compare with; for rooms/studios a minimum would exclude everything.
    min_budget_eur_month: housingType === 'flat' ? minBudget : null,
    max_air_no2: activeCriteria.has('air_no2') ? AIR_LEVEL_THRESHOLDS[airLevel] : null,
    min_transit_stops: activeCriteria.has('transit_stops') && wellConnectedOnly ? WELL_CONNECTED_THRESHOLD : null,
  }), [maxTravelMin, onlyWithinBudget, minBudget, housingType, activeCriteria, airLevel, wellConnectedOnly]);

  // Sync URL querystring only when on Screen B (so Screen A stays clean at "/")
  useEffect(() => {
    if (typeof window === 'undefined' || screen !== 'results') return;
    const params = new URLSearchParams(window.location.search);
    params.set('campus', campusId);
    params.set('budget', String(budget));
    params.set('type', housingType);
    params.set('mins', maxTravelMin === null ? 'any' : String(maxTravelMin));
    if (minBudget !== null) params.set('min', String(minBudget));
    else params.delete('min');
    params.set('criteria', Object.entries(computedWeights).map(([key, weight]) => weight === 1 ? key : key + ':' + weight).join(','));
    params.set('mode', transportMode);
    if (onlyWithinBudget) params.set('range', '1');
    else params.delete('range');
    if (location) params.set('location', location);
    else params.delete('location');
    window.history.replaceState(window.history.state, '', `${ROUTE_PATHS.results}?${params.toString()}`);
  }, [screen, campusId, budget, housingType, maxTravelMin, minBudget, computedWeights, transportMode, onlyWithinBudget, location]);

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
          travel_mode: transportMode,
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
              travel_mode: transportMode,
              filters: scoreFilters,
            });
            if (!controller.signal.aborted) setAiExplanation(explained.text);
          } catch (err) {
            if (controller.signal.aborted) return;
            if (err instanceof ApiError && err.status === 429) setRateLimitNotice(err.detail);
            setAiExplanation(top3.map((item, index) =>
              item.transit_min != null
                ? `${index + 1}) ${item.name}: ${formatMinutes(item.transit_min)} en transporte público y ${formatMinutes(item.car_min)} en coche.`
                : `${index + 1}) ${item.name} (${item.district}).`,
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
    // Small debounce: dragging a slider fires many changes; only score once it settles (keeps clicks snappy).
    const timer = window.setTimeout(updateScore, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [meta, screen, campusId, computedWeights, scoreFilters, budget, housingType, transportMode]);

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

  const handleTransportModeChange = (mode: TransportMode) => setTransportMode(mode);

  const handleToggleCompare = useCallback((areaId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(areaId)) {
        const next = prev.filter((id) => id !== areaId);
        if (next.length < 2) setCompareOpen(false);
        return next;
      }
      if (prev.length >= 3) return prev;
      return [...prev, areaId];
    });
  }, []);

  /** 1-click compare Top 3 non-excluded zones immediately */
  const handleCompareTop3 = useCallback(() => {
    const top3Ids = results
      .filter((r) => !r.excluded)
      .slice(0, 3)
      .map((r) => r.id);
    if (top3Ids.length >= 2) {
      setCompareIds(top3Ids);
      setCompareOpen(true);
    }
  }, [results]);

  function startResults(phrase: string | null = null) {
    pendingExplanation.current = phrase;
    setLocation('');
    setSelectedAreaId(null);
    setHoveredAreaId(null);
    setCompareIds([]);
    setCompareOpen(false);
    setMobileView('list');
    setRawResults([]);
    setRecommendation(null);
    setHighlights({});
    setAiExplanation(null);
    setIsScoring(true);
    if (route !== 'results') navigate('results');
  }

  async function handleSearchSubmit(queryText: string): Promise<boolean> {
    if (searching) return false;
    const fromPath = window.location.pathname;
    setSearching(true);
    setSearchError(null);
    setRateLimitNotice(null);

    try {
      if (!looksLikeLanguage(queryText)) {  // instant check, no AI call for keyboard mashing
        setSearchError('No he entendido lo que has escrito. Cuéntame con palabras qué buscas, por ejemplo dónde estudias y cuánto puedes pagar.');
        return false;
      }
      const [parsed, searchMeta] = await Promise.all([
        postAiParse({ query: queryText }),
        (metaRequest.current ??= getMeta()).catch(() => null),
      ]);
      if (window.location.pathname !== fromPath) return false;
      if (parsed.understood === false) {  // off-topic or nonsense: tell the user, don't search
        setSearchError(parsed.interpretation);
        return false;
      }
      const campus = searchMeta?.campuses.find((item) => item.id === parsed.campus_id);
      const indicatorKeys = searchMeta?.indicators.map(({ key }) => key) ?? Object.keys(parsed.weights);
      const inferred = searchPreferences(queryText, parsed, new Set([...DEFAULT_PRIORITIES, ...indicatorKeys]), campus);
      if (inferred.inferredFields.has('campus')) setCampusId(parsed.campus_id);
      if (inferred.inferredFields.has('housing')) setHousingType(parsed.housing_type);
      setMinBudget(inferred.minBudget);  // a new phrase never keeps the previous phrase's minimum
      if (inferred.budget !== null) {
        setBudget(inferred.budget);
        setOnlyWithinBudget(inferred.minBudget !== null || (parsed.filters.only_within_budget ?? true));
      }
      setMaxTravelMin(parsed.filters.max_travel_min ?? maxTravelMin);
      setAirLevel('any');
      setWellConnectedOnly(false);
      setTransportMode(parsed.travel_mode ?? inferred.transportMode);
      setPreferenceWeights(Object.fromEntries(inferred.selectedPriorities.map((key) => {
        const weight = parsed.weights[key] ?? 0;
        return [key, weight >= 0.5 ? weight : 1];
      })));
      startResults(queryText);
      return true;
    } catch (err) {
      if (window.location.pathname === fromPath) {
        setSearchError(err instanceof ApiError && err.status === 429
          ? err.detail
          : 'No se ha podido interpretar la búsqueda. Prueba con otra frase.');
      }
      return false;
    } finally {
      setSearching(false);
    }
  }

  const handleStart = () => {
    setOnlyWithinBudget(true);
    startResults();
  };

  const handleResetHome = () => {
    setSelectedAreaId(null);
    navigate('home');
  };

  function toggleMapLayer(layer: LayerId) {
    setMapLayers((current) => {
      const next = new Set(current);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  function handleApplyFilters(filters: ResultFilters) {
    setCampusId(filters.campusId);
    setBudget(filters.budget);
    setMinBudget(filters.minBudget);
    setHousingType(filters.housingType);
    setMaxTravelMin(filters.maxTravelMin);
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

  // Stable callbacks so the map and the list don't re-render on every hover/click elsewhere (performance).
  const scoresLatest = useRef(scoresById);
  scoresLatest.current = scoresById;
  const locationLatest = useRef(location);
  locationLatest.current = location;
  const handleListSelect = useCallback((id: string) => setSelectedAreaId((current) => current === id ? null : id), []);
  const handleMapSelect = useCallback((id: string) => {
    if (locationLatest.current && !scoresLatest.current[id]) return;
    setSelectedAreaId(id);
    setMobileView('list');
  }, []);
  const handleMapHover = useCallback((id: string | null) => {
    setHoveredAreaId(id && locationLatest.current && !scoresLatest.current[id] ? null : id);
  }, []);
  const openCompare = useCallback(() => setCompareOpen(true), []);
  const renderDetails = useCallback((area: ScoreResultItem) => (
    <AreaDetailPanel area={area} indicators={meta?.indicators ?? []}
      activeCriteria={activeCriteria} sources={meta?.sources ?? []} budget={budget} housingType={housingType} />
  ), [meta, activeCriteria, budget, housingType]);

  const campusName = activeCampus?.name ?? campusId.toUpperCase();
  const budgetRange = minBudget === null ? `hasta ${formatEuro(budget)}` : `${formatEuro(minBudget)}–${formatEuro(budget)}`;
  const summaryLine = `${HOUSING_TYPE_LABELS[housingType]} · ${budgetRange}/mes · ${campusName}${
    maxTravelMin !== null ? ` (≤ ${maxTravelMin} min en ${transportMode === 'car' ? 'coche' : 'transporte público'})` : ''
  }${locationLabel ? ' · ' + locationLabel : ''}`;

  const screenView = screen === 'onboarding' ? (
    <m.div key={route} data-ui-motion="screen" {...viewMotion}>
      <OnboardingScreen
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearchSubmit}
        searching={searching}
        searchError={searchError}
        view={route === 'form' ? 'form' : 'phrase'}
        onOpenForm={() => navigate('form')}
        onBack={() => goBack('home')}
        onHome={handleResetHome}
        campuses={meta?.campuses ?? []}
        campusId={campusId}
        onCampusChange={setCampusId}
        budget={budget}
        minBudget={minBudget}
        onBudgetChange={setBudget}
        onMinBudgetChange={setMinBudget}
        housingType={housingType}
        onHousingTypeChange={setHousingType}
        maxTravelMin={maxTravelMin}
        onMaxTravelChange={setMaxTravelMin}
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
          campusId, budget, minBudget, housingType, maxTravelMin, airLevel, wellConnectedOnly, onlyWithinBudget,
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
            onSelectArea={handleListSelect}
            renderDetails={renderDetails}
            onHoverArea={setHoveredAreaId}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onOpenCompare={openCompare}
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
          {(mapVisible || geoData) && <Suspense fallback={<div className="h-full w-full bg-surface" />}><MadridMap
            layers={mapLayers}
            onToggleLayer={toggleMapLayer}
            geoData={geoData}
            scoresById={scoresById}
            top10RankById={top10RankById}
            centroidsById={centroidsById}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            recommendedAreaId={visibleRecommendation?.area_id ?? null}
            onSelectArea={handleMapSelect}
            onHoverArea={handleMapHover}
            activeCampus={activeCampus}
            budget={budget}
            isScoring={isScoring}
            isVisible={mapVisible}
          /></Suspense>}
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
          <Suspense fallback={null}>
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
          </Suspense>
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
