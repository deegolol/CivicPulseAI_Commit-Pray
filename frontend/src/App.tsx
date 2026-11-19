/**
 * Root layout for PrimeraLlave.
 * Orchestrates metadata, GeoJSON map, live scoring, left priority panel, and right/mobile detail panel.
 */
import { useEffect, useMemo, useState } from 'react';
import { KeyRound, SlidersHorizontal, X } from 'lucide-react';
import { getGeo, getMeta, postScore, USE_MOCKS } from './api/client';
import type {
  BarriosGeoJSON,
  HousingType,
  MetaResponse,
  ScoreResultItem,
} from './api/types';
import { APP_NAME, APP_TAGLINE } from './config';
import { AreaDetailPanel } from './components/AreaDetailPanel';
import { MadridMap } from './components/MadridMap';
import { PriorityPanel } from './components/PriorityPanel';

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [geoData, setGeoData] = useState<BarriosGeoJSON | null>(null);
  const [results, setResults] = useState<ScoreResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User search state
  const [campusId, setCampusId] = useState('etsisi');
  const [budget, setBudget] = useState(500);
  const [housingType, setHousingType] = useState<HousingType>('room');
  const [weights, setWeights] = useState<Record<string, number>>({
    rent_eur_m2: 0.4,
    distance_km: 0.3,
    air_no2: 0.1,
    transit_stops: 0.1,
    services_count: 0.1,
  });

  // UI selection & mobile drawer state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Initial load: metadata + GeoJSON polygons
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        const [metaRes, geoRes] = await Promise.all([getMeta(), getGeo()]);
        if (cancelled) return;
        setMeta(metaRes);
        setGeoData(geoRes);
        setCampusId(metaRes.defaults.campus_id);
        setWeights(metaRes.defaults.weights);
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

  // Recompute scores whenever user inputs change
  useEffect(() => {
    if (!meta) return;
    let cancelled = false;
    async function runScore() {
      try {
        const res = await postScore({
          campus_id: campusId,
          weights,
          budget_eur_month: budget,
          housing_type: housingType,
        });
        if (!cancelled) {
          setResults(res.results);
          setSelectedAreaId((prev) => prev ?? res.results[0]?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error calculando puntuaciones');
        }
      }
    }
    runScore();
    return () => {
      cancelled = true;
    };
  }, [meta, campusId, weights, budget, housingType]);

  const scoresById = useMemo(() => {
    const map: Record<string, ScoreResultItem> = {};
    for (const item of results) {
      map[item.id] = item;
    }
    return map;
  }, [results]);

  const selectedArea = selectedAreaId ? (scoresById[selectedAreaId] ?? null) : null;
  const activeCampus = useMemo(
    () => meta?.campuses.find((c) => c.id === campusId) ?? null,
    [meta, campusId],
  );

  const handleWeightChange = (key: string, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      {/* Top header */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-base leading-tight font-extrabold tracking-tight text-slate-900">
              {APP_NAME}
            </h1>
            <p className="hidden text-[11px] text-slate-500 sm:block">{APP_TAGLINE}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {USE_MOCKS && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              Modo mock
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 lg:hidden"
          >
            {mobileFiltersOpen ? (
              <>
                <X className="h-4 w-4" /> Cerrar
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-4 w-4 text-teal-600" /> Filtros
              </>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Main 3-column desktop workspace / responsive mobile */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left panel: Priorities (desktop fixed, mobile overlay drawer) */}
        <aside
          className={`${
            mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } absolute inset-y-0 left-0 z-30 w-80 shrink-0 border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:static lg:shadow-none`}
        >
          <PriorityPanel
            campuses={meta?.campuses ?? []}
            campusId={campusId}
            onCampusChange={setCampusId}
            budget={budget}
            onBudgetChange={setBudget}
            housingType={housingType}
            onHousingTypeChange={setHousingType}
            weights={weights}
            onWeightChange={handleWeightChange}
          />
        </aside>

        {/* Center: Madrid interactive map */}
        <main className="relative z-0 min-w-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
              Cargando mapa de Madrid…
            </div>
          ) : (
            <MadridMap
              geoData={geoData}
              scoresById={scoresById}
              selectedAreaId={selectedAreaId}
              onSelectArea={(id) => {
                setSelectedAreaId(id);
                setMobileFiltersOpen(false);
              }}
              activeCampus={activeCampus}
            />
          )}
        </main>

        {/* Right panel (desktop) / Bottom sheet (mobile) */}
        <aside
          className={`${
            selectedArea ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
          } fixed inset-x-0 bottom-0 z-20 max-h-[62dvh] rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:static lg:max-h-none lg:w-88 lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none`}
        >
          {/* Mobile drag handle indicator */}
          <div className="flex justify-center pt-2 lg:hidden">
            <div className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <AreaDetailPanel
            area={selectedArea}
            indicators={meta?.indicators ?? []}
            budget={budget}
            housingType={housingType}
            onClose={() => setSelectedAreaId(null)}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
