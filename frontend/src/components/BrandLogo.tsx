/** PrimeraLlave wordmark with the same doorway mark used by the favicon. */
import { APP_NAME } from '../config';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 28 : 32;
  const wordmarkSize = compact ? 'hidden text-base sm:inline' : 'text-xl';

  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap">
      <img src={import.meta.env.BASE_URL + 'favicon.svg'} alt="" width={size} height={size} />
      <span className={'font-display leading-none font-bold tracking-[-0.045em] text-ink ' + wordmarkSize}>
        {APP_NAME}
      </span>
    </span>
  );
}
