/**
 * Root workspace for PrimeraLlave (T24 editorial redesign).
 * - Desktop: full-bleed Madrid map + floating left glass control panel + floating right Top 3 / Detail rail.
 * - Mobile (< 768px): full-bleed map + top floating search/filters bar + 3-height bottom sheet (peek / half / full).
 * - Zero percentages in UI: real units (€/mes, km, µg/m³ NO₂, paradas) + qualitative priority chips.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, KeyRound, Search, SlidersHorizontal, X } from 'lucide-react';
import { getAreas, getGeo, getMeta, postAiParse, postScore, USE_MOCKS } from './api/client';
import type {
  BarriosGeoJSON,
  HousingType,
  MetaResponse,
  ScoreResultItem,
} from './api/types';
import { APP_NAME } from './config';
import { AreaDetailPanel } from './components/AreaDetailPanel';
import { CompareModal } from './components/CompareModal';
import { MadridMap } from './components/MadridMap';
import {
  AIR_LEVEL_THRESHOLDS,
  PriorityPanel,
  type AirLevelOption,
} from './components/PriorityPanel';
import { TopZonesRail } from './components/TopZonesRail';
import { formatEuro, formatKm, getFitLabel, getFitLevel } from './utils/format';

type MobileSheetHeight = 'peek' | 'half' | 'full';

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

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [geoData, setGeoData] = useState<BarriosGeoJSON | null>(null);
  const [centroidsById, setCentroidsById] = useState<Record<string, [number, number]>>({});
  const [rawResults, setRawResults] = useState<ScoreResultItem[]>([]);
  const [referenceM2, setReferenceM2] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User search & real-unit filter state
  const [query, setQuery] = useState('');
  const [campusId, setCampusId] = useState('etsisi');
  const [budget, setBudget] = useState(500);
  const [housingType, setHousingType] = useState<HousingType>('room');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(10);
  const [airLevel, setAirLevel] = useState<AirLevelOption>('any');
  const [wellConnectedOnly, setWellConnectedOnly] = useState(false);
  const [onlyWithinBudget, setOnlyWithinBudget] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    'rent_eur_m2',
    'distance_km',
  ]);

  // Selection, comparison & responsive UI state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheetHeight>('peek');

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
        setCampusId(metaRes.defaults.campus_id);

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
  }, []);

  const availableKeys = useMemo(() => {
    const keys = new Set<string>(['distance_km']);
    for (const ind of meta?.indicators ?? []) {
      keys.add(ind.key);
    }
    return keys;
  }, [meta]);

  const computedWeights = useMemo(
    () => prioritiesToWeights(selectedPriorities, availableKeys),
    [selectedPriorities, availableKeys],
  );

  // Fetch scores whenever inputs change (debounced 250 ms per T09)
  useEffect(() => {
    if (!meta) return;
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
  }, [meta, campusId, computedWeights, maxDistanceKm, onlyWithinBudget, budget, housingType]);

  // Apply client-side real-unit thresholds for air NO₂ and transit ("Bien comunicado")
  const results = useMemo(() => {
    const maxNo2 = AIR_LEVEL_THRESHOLDS[airLevel];
    const mapped = rawResults.map((item) => {
      const no2 = item.breakdown.air_no2?.value;
      const transit = item.breakdown.transit_stops?.value;
      let excluded = item.excluded;

      if (maxNo2 !== null && no2 != null && no2 > maxNo2) {
        excluded = true;
      }
      if (wellConnectedOnly && transit != null && transit < 35) {
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
    for (const item of results) {
      map[item.id] = item;
    }
    return map;
  }, [results]);

  const topResults = useMemo(
    () => results.filter((r) => !r.excluded).slice(0, 3),
    [results],
  );

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

  const handleTogglePriority = (key: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSelectArea = (areaId: string) => {
    setSelectedAreaId(areaId);
    setMobileFiltersOpen(false);
    setMobileSheet('full');
  };

  const handleQuerySubmit = async (queryText: string) => {
    try {
      const parsed = await postAiParse({ query: queryText });
      if (parsed.campus_id) setCampusId(parsed.campus_id);
      if (parsed.budget_eur_month) setBudget(parsed.budget_eur_month);
      if (parsed.housing_type) setHousingType(parsed.housing_type);
      if (parsed.filters?.max_distance_km != null) {
        setMaxDistanceKm(parsed.filters.max_distance_km);
      }
      // Translate top returned weights to active chips without showing any %
      const topKeys = Object.entries(parsed.weights)
        .filter(([, w]) => w >= 0.2)
        .map(([k]) => k);
      if (topKeys.length > 0) {
        setSelectedPriorities(topKeys);
      }
      setMobileFiltersOpen(false);
    } catch {
      // Fallback: ignore parse errors silently in preview mode
    }
  };

  const cycleMobileSheet = () => {
    setMobileSheet((prev) => {
      if (prev === 'peek') return 'half';
      if (prev === 'half') return 'full';
      return 'peek';
    });
  };

  const isMockMode = USE_MOCKS || meta?.is_mock;
  const firstResult = topResults[0] ?? null;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-canvas">
      {/* Full-bleed interactive Madrid map */}
      <main className="relative z-0 h-full w-full">
        {loading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-canvas">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-accent-soft" />
            <div className="h-3 w-44 animate-pulse rounded-full bg-surface-subtle" />
          </div>
        ) : (
          <MadridMap
            geoData={geoData}
            scoresById={scoresById}
            centroidsById={centroidsById}
            selectedAreaId={selectedAreaId}
            onSelectArea={handleSelectArea}
            activeCampus={activeCampus}
            maxDistanceKm={maxDistanceKm}
            isScoring={isScoring}
          />
        )}
      </main>

      {/* Error banner if API fails */}
      {error && (
        <div className="fixed top-4 left-1/2 z-[650] -translate-x-1/2 rounded-xl border border-nofit/30 bg-nofit-soft px-4 py-2 text-xs font-medium text-nofit shadow-floating">
          {error}
        </div>
      )}

      {/* DESKTOP: Floating left editorial glass panel (~380px) */}
      <aside className="fixed top-4 bottom-4 left-4 z-[500] hidden w-[380px] overflow-hidden rounded-2xl border border-border bg-surface/92 shadow-floating backdrop-blur-md lg:block">
        <PriorityPanel
          availableKeys={availableKeys}
          query={query}
          onQueryChange={setQuery}
          onQuerySubmit={handleQuerySubmit}
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
        />
      </aside>

      {/* DESKTOP: Floating right rail (Top 3 cards OR Area Detail) */}
      <aside className="fixed top-4 right-4 bottom-4 z-[500] hidden w-[348px] overflow-hidden rounded-2xl border border-border bg-surface/92 shadow-floating backdrop-blur-md lg:block">
        {selectedArea ? (
          <AreaDetailPanel
            area={selectedArea}
            indicators={meta?.indicators ?? []}
            sources={meta?.sources ?? []}
            budget={budget}
            housingType={housingType}
            referenceM2={referenceM2}
            isCompared={compareIds.includes(selectedArea.id)}
            canAddCompare={compareIds.length < 3}
            onToggleCompare={handleToggleCompare}
            onBack={() => setSelectedAreaId(null)}
          />
        ) : (
          <TopZonesRail
            topResults={topResults}
            selectedAreaId={selectedAreaId}
            onSelectArea={handleSelectArea}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onOpenCompare={() => setCompareOpen(true)}
            loading={loading}
          />
        )}
      </aside>

      {/* MOBILE (< 1024px): Floating top search + Filters trigger */}
      <div className="fixed inset-x-3 top-3 z-[520] flex items-center gap-2 lg:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) handleQuerySubmit(query.trim());
          }}
          className="relative flex min-h-[46px] flex-1 items-center rounded-2xl border border-border bg-surface/95 px-3 shadow-floating backdrop-blur-md"
        >
          <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-surface">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${APP_NAME}: ETSISI, 500 €…`}
            aria-label="Buscar zona"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted/75 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-accent"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          aria-label="Abrir filtros"
          className="flex min-h-[46px] min-w-[46px] items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface/95 px-3.5 text-xs font-medium text-ink shadow-floating backdrop-blur-md transition active:scale-95"
        >
          <SlidersHorizontal className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </div>

      {/* MOBILE: Slide-over Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[600] flex lg:hidden">
          <div
            className="fixed inset-0 bg-ink/25 backdrop-blur-xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-[360px] flex-col bg-surface shadow-floating">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-serif text-base font-semibold text-ink">
                Ajusta tu búsqueda
              </span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Cerrar filtros"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-subtle hover:text-ink"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <PriorityPanel
                availableKeys={availableKeys}
                query={query}
                onQueryChange={setQuery}
                onQuerySubmit={handleQuerySubmit}
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
              />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE: 3-height Bottom Sheet (peek = #1, half = Top 3, full = Detail) */}
      <section
        aria-label="Recomendaciones"
        className={`fixed inset-x-0 bottom-0 z-[510] flex flex-col rounded-t-3xl border-t border-border bg-surface shadow-floating transition-all duration-200 ease-out lg:hidden ${
          mobileSheet === 'peek'
            ? 'h-[124px]'
            : mobileSheet === 'half'
              ? 'h-[52dvh]'
              : 'h-[84dvh]'
        }`}
      >
        {/* Sheet handle & height toggle */}
        <button
          type="button"
          onClick={cycleMobileSheet}
          aria-label="Cambiar altura del panel"
          className="flex min-h-[36px] w-full shrink-0 flex-col items-center justify-center gap-1 pt-2 pb-1"
        >
          <span className="h-1 w-10 rounded-full bg-border" />
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
            {mobileSheet === 'peek' ? (
              <>
                Ver top 3 <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              </>
            ) : mobileSheet === 'half' ? (
              <>
                Ampliar <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              </>
            ) : (
              <>
                Minimizar <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              </>
            )}
          </span>
        </button>

        {/* Sheet content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobileSheet === 'peek' ? (
            firstResult ? (
              <button
                type="button"
                onClick={() => handleSelectArea(firstResult.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-2 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 items-center rounded-full bg-accent px-2 text-[11px] font-semibold text-surface">
                      #1
                    </span>
                    <span className="truncate text-sm font-semibold text-ink">
                      {firstResult.name}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted tabular-nums">
                    {firstResult.district} · {formatKm(firstResult.distance_km)} ·{' '}
                    {getFitLabel(getFitLevel(firstResult.score, firstResult.excluded))}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-serif text-lg font-semibold text-ink tabular-nums">
                    {firstResult.est_rent_eur_month != null
                      ? `~${formatEuro(firstResult.est_rent_eur_month)}`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-muted">/mes</div>
                </div>
              </button>
            ) : (
              <div className="px-5 py-2 text-xs text-muted">
                Ajusta tus filtros para ver zonas recomendadas.
              </div>
            )
          ) : mobileSheet === 'half' && !selectedArea ? (
            <TopZonesRail
              topResults={topResults}
              selectedAreaId={selectedAreaId}
              onSelectArea={handleSelectArea}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              onOpenCompare={() => setCompareOpen(true)}
              loading={loading}
            />
          ) : selectedArea ? (
            <AreaDetailPanel
              area={selectedArea}
              indicators={meta?.indicators ?? []}
              sources={meta?.sources ?? []}
              budget={budget}
              housingType={housingType}
              referenceM2={referenceM2}
              isCompared={compareIds.includes(selectedArea.id)}
              canAddCompare={compareIds.length < 3}
              onToggleCompare={handleToggleCompare}
              onBack={() => {
                setSelectedAreaId(null);
                setMobileSheet('half');
              }}
            />
          ) : (
            <TopZonesRail
              topResults={topResults}
              selectedAreaId={selectedAreaId}
              onSelectArea={handleSelectArea}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              onOpenCompare={() => setCompareOpen(true)}
              loading={loading}
            />
          )}
        </div>
      </section>

      {/* Side-by-side comparison modal (2–3 neighborhoods) */}
      {compareOpen && comparedAreas.length >= 2 && (
        <CompareModal
          areas={comparedAreas}
          indicators={meta?.indicators ?? []}
          housingType={housingType}
          onRemove={handleToggleCompare}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {/* Discreet mock indicator pill (bottom-center-left, never overlaps Leaflet attribution) */}
      {isMockMode && (
        <div className="pointer-events-none fixed bottom-1.5 left-[410px] z-[450] hidden rounded-full bg-surface/80 px-2 py-0.5 text-[10px] text-muted lg:block">
          Datos de demostración
        </div>
      )}
    </div>
  );
}

export default App;
