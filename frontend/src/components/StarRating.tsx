/**
 * Fractional 0–5 star rating component (e.g., 4.3 = 4 full yellow stars + 30%-filled 5th star + "4,3").
 * Replaces technical units in student-facing detail & comparison views.
 */
import { formatDecimal } from '../utils/format';

interface StarRatingProps {
  /** Value from 0 to 5 (e.g. 4.3) */
  value: number;
  size?: 'sm' | 'md';
  showNumber?: boolean;
}

const STAR_PATH =
  'M12 2.25l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.15l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.25z';

export function StarRating({
  value,
  size = 'md',
  showNumber = true,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const px = size === 'sm' ? 14 : 16;

  return (
    <div
      className="inline-flex items-center gap-1.5"
      aria-label={`${formatDecimal(clamped)} sobre 5 estrellas`}
    >
      <div className="inline-flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => {
          const fillFraction = Math.max(0, Math.min(1, clamped - index));
          const fillPct = Math.round(fillFraction * 100);
          return (
            <span
              key={index}
              className="relative inline-block shrink-0"
              style={{ width: px, height: px }}
            >
              {/* Empty grey star base */}
              <svg
                width={px}
                height={px}
                viewBox="0 0 24 24"
                className="block text-border"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
              {/* Partially or fully filled yellow star overlay */}
              {fillPct > 0 && (
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fillPct}%` }}
                >
                  <svg
                    width={px}
                    height={px}
                    viewBox="0 0 24 24"
                    className="block text-star"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={STAR_PATH} />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </div>

      {showNumber && (
        <span
          className={`font-display font-bold text-ink tabular-nums ${
            size === 'sm' ? 'text-xs' : 'text-sm'
          }`}
        >
          {formatDecimal(clamped)}
        </span>
      )}
    </div>
  );
}

/** Converts a 0..1 normalized indicator score to a 0.0–5.0 star rating */
export function normalizedToStars(normalized: number | undefined | null): number {
  if (normalized == null || Number.isNaN(normalized)) return 2.5;
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 50) / 10;
}
