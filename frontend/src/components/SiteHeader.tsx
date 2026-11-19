/** Full-width site header: back + brand on the left, navigation and account on the right. */
import { useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import type { SourceInfo } from '../api/types';
import { AccountButton } from './AccountProvider';
import { BrandLogo } from './BrandLogo';
import { HowItWorksDialog } from './HowItWorksDialog';

const navBase = 'h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';
const navClass = 'inline-flex ' + navBase;

export function SiteHeader({ onBack, onHome, sources }: {
  onBack?: () => void;
  onHome: () => void;
  sources: SourceInfo[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-30 shrink-0 border-b border-border/70 bg-bg">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button type="button" onClick={onHome} aria-label="Ir al inicio" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            <BrandLogo />
          </button>
          {onBack && (
            <>
              <span className="hidden h-5 w-px bg-border sm:block" />
              <button type="button" onClick={onBack} className={navClass + ' text-ink'} aria-label="Volver">
                <ArrowLeft size={18} aria-hidden="true" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            </>
          )}
        </div>
        <nav aria-label="Principal" className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button type="button" onClick={() => setOpen(true)} className={navClass}>
            <HelpCircle size={17} aria-hidden="true" className="sm:hidden" />
            <span className="hidden sm:inline">Cómo funciona</span>
          </button>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <AccountButton />
        </nav>
      </div>
      <HowItWorksDialog open={open} sources={sources} onClose={() => setOpen(false)} />
    </header>
  );
}
