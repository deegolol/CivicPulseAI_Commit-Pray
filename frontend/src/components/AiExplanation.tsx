/**
 * Editorial AI explanation card for the Top 3 recommended neighborhoods (T12 + T24).
 * Displays the parsed interpretation, the real-number explanation text, and an
 * "IA" / "Modo sin IA" badge based on the engine returned by /api/ai/*.
 */
import { Sparkles, X } from 'lucide-react';

interface AiExplanationProps {
  interpretation: string | null;
  explanationText: string | null;
  engine: 'llm' | 'keywords' | null;
  loading: boolean;
  error: string | null;
  onDismiss: () => void;
}

export function AiExplanation({
  interpretation,
  explanationText,
  engine,
  loading,
  error,
  onDismiss,
}: AiExplanationProps) {
  if (!loading && !interpretation && !explanationText && !error) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-accent-border bg-accent-soft/60 p-3.5 transition duration-200 ease-out">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-ink">Resumen de tu búsqueda</span>
          {engine && !loading && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                engine === 'llm'
                  ? 'bg-accent text-surface'
                  : 'border border-border bg-surface text-muted'
              }`}
            >
              {engine === 'llm' ? 'IA' : 'Modo sin IA'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar explicación"
          className="rounded-lg p-1 text-muted transition hover:bg-surface/80 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {loading ? (
        <div className="mt-2.5 space-y-2">
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-accent-border/50" />
          <div className="h-3 w-full animate-pulse rounded-full bg-accent-border/40" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-accent-border/40" />
        </div>
      ) : error ? (
        <p className="mt-2 text-xs leading-relaxed text-nofit">{error}</p>
      ) : (
        <div className="mt-2 space-y-2 text-xs leading-relaxed text-ink">
          {interpretation && (
            <p className="font-medium text-ink">{interpretation}</p>
          )}
          {explanationText && (
            <p className="text-muted">{explanationText}</p>
          )}
        </div>
      )}
    </section>
  );
}
