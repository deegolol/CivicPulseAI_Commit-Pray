/** Searchable picker for the campuses supported by the recommendation engine. */
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Campus } from '../api/types';

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/\b(?:infromatica|infomatica|informatcia)\b/g, 'informatica')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function CampusPicker({
  campuses, campusId, onChange, keepSelection = false, openOnMount = false, label = 'Universidad o campus',
}: { campuses: Campus[]; campusId: string; onChange: (campusId: string) => void; keepSelection?: boolean; openOnMount?: boolean; label?: string }) {
  const id = useId();
  const reduced = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const activeOption = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (openOnMount) input.current?.focus();
  }, [openOnMount]);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = campuses.find((item) => item.id === campusId);
  const indexed = useMemo(() => campuses.map((campus) => ({
    campus,
    university: normalize(campus.university ?? ''),
    text: normalize([campus.name, campus.university, campus.acronym, campus.municipality, ...(campus.aliases ?? [])].join(' ')),
  })), [campuses]);
  const query = normalize(draft ?? '');
  const terms = query.split(' ').filter(Boolean);
  const exactUniversity = indexed.find(({ campus, university }) =>
    query && (query === university || query === normalize(campus.acronym ?? '')));
  const matches = indexed.filter(({ campus, text }) =>
    exactUniversity ? campus.acronym === exactUniversity.campus.acronym : terms.every((term) => text.includes(term)),
  ).map(({ campus }) => campus);

  useEffect(() => {
    if (!open || !activeOption.current) return;
    const option = activeOption.current;
    const list = option.parentElement!;
    const offset = option.offsetTop;
    if (offset < list.scrollTop) list.scrollTop = offset;
    else if (offset + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = offset + option.offsetHeight - list.clientHeight;
    }
  }, [active, open]);

  const select = (campus: Campus) => {
    onChange(campus.id);
    setDraft(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={open && matches.length > 0 ? id + '-options' : undefined}
        aria-activedescendant={open && matches[active] ? id + '-' + matches[active].id : undefined}
        autoComplete="off"
        placeholder="Ej. UPM, Campus Sur o Montegancedo"
        value={draft ?? selected?.name ?? ''}
        onFocus={(event) => {
          event.currentTarget.select();
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          if (keepSelection) setDraft(null);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          if (!keepSelection) onChange('');
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
          }
          if (!matches.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
          if (!open && event.key === 'Enter') return;
          event.preventDefault();
          if (event.key === 'Enter') select(matches[active]);
          else {
            setOpen(true);
            setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
          }
        }}
        className="block h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm outline-none transition focus:border-ink"
      />
      <AnimatePresence initial={false}>
      {open && (matches.length ? (
        <m.ul
          key="campuses" data-ui-motion="campus-menu"
          initial={reduced ? false : { opacity: 0, y: -4, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -3 }}
          transition={{ duration: reduced ? 0 : 0.16 }}
          style={{ transformOrigin: 'top center' }}
          id={id + '-options'} role="listbox" className="absolute inset-x-0 z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-bg p-1 shadow-popover">
          {matches.map((campus, index) => (
            <li
              key={campus.id}
              ref={active === index ? activeOption : undefined}
              id={id + '-' + campus.id}
              role="option"
              aria-selected={active === index}
              className={'cursor-pointer rounded-md px-3 py-2 text-sm ' + (active === index ? 'bg-surface' : '')}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(campus)}
            >
              <span className="block">{campus.name}</span>
              {campus.university && <span className="block text-xs text-muted">
                {campus.university}{campus.municipality ? ` · ${campus.municipality}` : ''}
              </span>}
            </li>
          ))}
        </m.ul>
      ) : <m.p key="empty" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 0.15 }} className="mt-1 text-xs text-muted">No hay campus compatibles con esa búsqueda.</m.p>)}
      </AnimatePresence>
    </div>
  );
}
