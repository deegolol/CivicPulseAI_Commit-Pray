import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Campus, ScoreResultItem } from '../api/types';
import { EXAMPLE_QUERIES } from '../constants/filters';
import { AccountButton } from './AccountProvider';
import { BrandLogo } from './BrandLogo';
import { ResultsFilters, type ResultFilters } from './ResultsFilters';

interface TopFilterBarProps {
  availableKeys: Set<string>;
  onResetHome: () => void;
  query: string;
  searching: boolean;
  searchError: string | null;
  onQueryChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  campuses: Campus[];
  areas: Pick<ScoreResultItem, 'id' | 'name' | 'district'>[];
  filters: ResultFilters;
  onApplyFilters: (filters: ResultFilters) => void;
}

type Panel = 'search' | 'filters';

const controlClass = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-2 min-[360px]:gap-2 min-[360px]:px-2.5 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:px-3.5';

export function TopFilterBar({
  availableKeys, onResetHome, query, searching, searchError, onQueryChange, onSearchSubmit, campuses, areas, filters, onApplyFilters,
}: TopFilterBarProps) {
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const [filterRevision, setFilterRevision] = useState(0);
  const filterPanelId = `results-filters-panel-${filterRevision}`;
  const panelId = openPanel === 'filters' ? filterPanelId : 'results-search-panel';
  const [anchor, setAnchor] = useState({ left: 12, origin: 20 });
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const filtersRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!openPanel) return;
    const trigger = openPanel === 'search' ? searchRef.current : filtersRef.current;
    const updateAnchor = () => {
      const header = headerRef.current?.getBoundingClientRect();
      const button = trigger?.getBoundingClientRect();
      if (!header || !button) return;
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const width = Math.min(header.width - 24, (openPanel === 'filters' ? 42 : 28) * rootFontSize);
      const left = Math.max(12, Math.min(button.left - header.left, header.width - width - 12));
      setAnchor({ left, origin: button.left + button.width / 2 - header.left - left });
    };
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !searchRef.current?.contains(target) && !filtersRef.current?.contains(target)) {
        setOpenPanel(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpenPanel(null);
      trigger?.focus();
    };
    updateAnchor();
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', updateAnchor);
    (openPanel === 'search' ? searchInputRef.current : panelRef.current)?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [openPanel]);

  function closePanel() {
    (openPanel === 'search' ? searchRef.current : filtersRef.current)?.focus();
    setOpenPanel(null);
  }

  function submitSearch(value: string) {
    if (searching || !value.trim()) return;
    onSearchSubmit(value.trim());
  }

  return (
    <header ref={headerRef} className="relative z-40 shrink-0 border-b border-border bg-bg">
      <nav aria-label="Navegación de resultados" className="flex items-center gap-1.5 px-2 py-2 min-[360px]:gap-2 min-[360px]:px-3 sm:gap-3 sm:px-4">
        <button type="button" onClick={onResetHome} aria-label="Volver al inicio"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg sm:mr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          <BrandLogo compact />
        </button>
        <button ref={searchRef} type="button" aria-label="Buscar por frase" aria-expanded={openPanel === 'search'}
          aria-controls={openPanel === 'search' ? 'results-search-panel' : undefined}
          onClick={() => setOpenPanel((panel) => panel === 'search' ? null : 'search')}
          className={controlClass + ' min-w-0 flex-1 bg-surface text-left sm:w-56 sm:flex-none'}>
          <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate sm:hidden">Buscar</span>
          <span className="hidden truncate sm:inline">Buscar por frase</span>
        </button>
        <button ref={filtersRef} type="button" aria-expanded={openPanel === 'filters'}
          aria-controls={openPanel === 'filters' ? filterPanelId : undefined}
          onClick={() => {
            if (openPanel === 'filters') setOpenPanel(null);
            else {
              setFilterRevision((revision) => revision + 1);
              setOpenPanel('filters');
            }
          }}
          className={controlClass + ' shrink-0 aria-expanded:border-ink aria-expanded:bg-surface'}>
          <SlidersHorizontal size={18} aria-hidden="true" /> Filtros
        </button>
        <div className="ml-auto flex shrink-0"><AccountButton toolbar /></div>
      </nav>

      <AnimatePresence initial={false}>
        {openPanel && (
          <m.div
            key={panelId}
            ref={panelRef}
            id={panelId}
            role="region"
            aria-labelledby={`${panelId}-title`}
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: -7, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -4, pointerEvents: 'none', transition: { duration: reduced ? 0 : 0.14 } }}
            transition={{ duration: reduced ? 0 : 0.21, ease: [0.2, 0.65, 0.25, 1] }}
            style={{ left: anchor.left, transformOrigin: `${anchor.origin}px top` }}
            className={`absolute top-full z-50 mt-2 flex max-h-[calc(100dvh-5.75rem)] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-popover outline-none ${openPanel === 'filters' ? 'max-w-[42rem]' : 'max-w-md'}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border py-1 pr-2 pl-4 sm:pl-5">
              <h2 id={`${panelId}-title`} className="font-display text-base font-bold">
                {openPanel === 'filters' ? 'Filtros' : 'Buscar por frase'}
              </h2>
              <button type="button" onClick={closePanel} aria-label="Cerrar panel"
                className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-ink">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {openPanel === 'filters' ? (
              <ResultsFilters availableKeys={availableKeys} campuses={campuses} areas={areas} filters={filters}
                onApply={(value) => { onApplyFilters(value); closePanel(); }} onCancel={closePanel} />
            ) : (
              <div className="space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
                <form onSubmit={(event) => { event.preventDefault(); submitSearch(query); }} className="flex gap-2">
                  <input ref={searchInputRef} type="search" aria-label="Describe lo que buscas"
                    value={query} onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Ej. Habitación cerca de la ETSISI…"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-ink" />
                  <button type="submit" disabled={searching || !query.trim()}
                    className="min-h-11 rounded-lg bg-brand px-3 text-sm font-semibold text-bg hover:bg-brand-hover disabled:opacity-60">{searching ? 'Buscando…' : 'Buscar'}</button>
                </form>
                {searchError && <p role="alert" className="text-sm text-over">{searchError}</p>}
                {EXAMPLE_QUERIES.map((example) => (
                  <button key={example} type="button" disabled={searching} onClick={() => { onQueryChange(example); submitSearch(example); }}
                    className="block min-h-11 w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-60">
                    {example}
                  </button>
                ))}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
