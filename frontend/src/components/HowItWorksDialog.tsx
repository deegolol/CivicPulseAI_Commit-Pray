/** "Cómo funciona" panel: the three steps of the product and the official open data behind every number. */
import { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { SourceInfo } from '../api/types';

const STEPS = [
  { title: 'Nos dices qué buscas', text: 'Tu campus, tu presupuesto y lo que te importa. Con una frase o eligiéndolo tú.' },
  { title: 'Cruzamos datos oficiales', text: 'Alquiler del Ministerio de Vivienda, calidad del aire y equipamientos del Ayuntamiento y estaciones de Metro del CRTM, barrio a barrio.' },
  { title: 'Te recomendamos dónde buscar', text: 'La zona que mejor encaja contigo, por qué y qué tener en cuenta. Y de ahí, directo a los anuncios ya filtrados.' },
];

export function HowItWorksDialog({ open, onClose, sources, section = 'how' }: {
  open: boolean;
  onClose: () => void;
  sources: SourceInfo[];
  section?: 'how' | 'data';
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dataHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      if (section === 'data') requestAnimationFrame(() => dataHeading.current?.scrollIntoView({ block: 'start' }));
    }
    if (!open && element.open) element.close();
  }, [open, section]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      aria-labelledby="how-title"
      className="animate-fade-up m-auto max-h-[min(88dvh,46rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-bg p-0 text-ink shadow-popover backdrop:bg-ink/40"
    >
      <div className="sticky top-0 flex items-center justify-between bg-bg px-6 pt-6 pb-3">
        <h2 id="how-title" className="font-display text-2xl font-bold tracking-tight">Cómo funciona</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-ink">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="px-6 pb-6">
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-bg">{index + 1}</span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
          <strong className="text-ink">La IA no inventa datos.</strong> Solo entiende tu frase y explica cifras que ya hemos calculado con datos oficiales. El alquiler mensual es una estimación: el precio real está en los anuncios.
        </p>

        <h3 ref={dataHeading} className="mt-7 scroll-mt-20 font-display text-lg font-bold">Datos abiertos que usamos</h3>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {sources.map((source) => (
            <li key={source.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{source.name}</p>
                <p className="text-xs text-muted">{source.publisher}{source.license ? ` · ${source.license}` : ''}</p>
              </div>
              {source.url && (
                <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${source.name}`}
                  className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface hover:text-ink">
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
          {!sources.length && <li className="px-4 py-3 text-sm text-muted">Cargando fuentes…</li>}
        </ul>
      </div>
    </dialog>
  );
}
