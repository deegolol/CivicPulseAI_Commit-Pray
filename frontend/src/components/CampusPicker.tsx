/** Searchable picker for the campuses supported by the recommendation engine. */
import { useId, useState } from 'react';
import type { Campus } from '../api/types';

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function CampusPicker({
  campuses, campusId, onChange,
}: { campuses: Campus[]; campusId: string; onChange: (campusId: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = campuses.find((item) => item.id === campusId);
  const terms = normalize(draft ?? '').trim().split(/\s+/).filter(Boolean);
  const matches = campuses.filter((item) => {
    const name = normalize(item.name + ' ' + item.id + (item.name.includes('UPM') ? ' Universidad Politécnica de Madrid' : ''));
    return terms.every((term) => name.includes(term));
  });

  const select = (campus: Campus) => {
    onChange(campus.id);
    setDraft(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">Universidad o campus</label>
      <input
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
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange('');
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (!matches.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
          if (!open && event.key === 'Enter') return;
          event.preventDefault();
          if (event.key === 'Enter') select(matches[active]);
          else {
            setOpen(true);
            setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
          }
        }}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-ink"
      />
      {open && (matches.length ? (
        <ul id={id + '-options'} role="listbox" className="absolute inset-x-0 z-20 mt-1 rounded-lg border border-border bg-bg p-1 shadow-popover">
          {matches.map((campus, index) => (
            <li
              key={campus.id}
              id={id + '-' + campus.id}
              role="option"
              aria-selected={active === index}
              className={'cursor-pointer rounded-md px-3 py-2 text-sm ' + (active === index ? 'bg-surface' : '')}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(campus)}
            >
              {campus.name}
            </li>
          ))}
        </ul>
      ) : <p className="mt-1 text-xs text-muted">No hay campus compatibles con esa búsqueda.</p>)}
    </div>
  );
}
