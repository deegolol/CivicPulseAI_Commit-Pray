/** PrimeraLlave wordmark with the same mark used by the favicon. */
import { APP_NAME } from '../config';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'text-base' : 'text-xl';
  const iconSize = compact ? 'h-8' : 'h-9';

  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap leading-none ${size}`}>
      <img src={import.meta.env.BASE_URL + 'favicon.svg'} alt="" className={`${iconSize} w-auto shrink-0`} />
      <span className={`font-display leading-none font-bold tracking-[-0.045em] text-ink ${compact ? 'hidden sm:inline' : ''}`}>
        {APP_NAME}
      </span>
    </span>
  );
}
