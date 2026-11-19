import { createContext, useContext, useState, type ReactNode } from 'react';
import { Bell, CircleUserRound } from 'lucide-react';
import { AccountDialog, type PendingWatch } from './AccountDialog';

const AccountContext = createContext<((watch?: PendingWatch) => void) | null>(null);
const buttonClass = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-bg px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface';

export function AccountProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingWatch, setPendingWatch] = useState<PendingWatch | null>(null);
  function show(watch?: PendingWatch) {
    setPendingWatch(watch ?? null);
    setOpen(true);
  }

  return (
    <AccountContext.Provider value={show}>
      {children}
      <AccountDialog open={open} pendingWatch={pendingWatch} onClose={() => setOpen(false)}
        onWatchSaved={() => setPendingWatch(null)} />
    </AccountContext.Provider>
  );
}

export function AccountButton() {
  const show = useContext(AccountContext);
  if (!show) return null;
  return (
    <button type="button" onClick={() => show()} className={buttonClass}>
      <CircleUserRound size={16} aria-hidden="true" /> Mi cuenta
    </button>
  );
}

export function WatchZoneButton({ watch }: { watch: PendingWatch }) {
  const show = useContext(AccountContext);
  if (!show) return null;
  return (
    <button type="button" onClick={() => show(watch)} className={buttonClass}>
      <Bell size={15} aria-hidden="true" /> Recibir avisos
    </button>
  );
}
