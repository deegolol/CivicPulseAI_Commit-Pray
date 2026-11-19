import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Bell, CircleUserRound } from 'lucide-react';
import { accountApi } from '../api/account';
import { AccountDialog, type PendingWatch } from './AccountDialog';

type AccountControls = { show: (watch?: PendingWatch) => void; unread: number };
const AccountContext = createContext<AccountControls | null>(null);
const buttonClass = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-bg px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface';

export function AccountProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has('cuenta'));
  const [pendingWatch, setPendingWatch] = useState<PendingWatch | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (open) return;
    let active = true;
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const session = await accountApi.session();
        if (!active) return;
        setEnabled(session.enabled);
        if (!session.username) {
          setUnread(0);
          return;
        }
        const workspace = await accountApi.workspace();
        if (active) setUnread(workspace.notifications.filter((notice) => !notice.read).length);
      } catch {
        // Recommendations remain available if the optional account service is unavailable.
      } finally {
        refreshing = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open]);

  function show(watch?: PendingWatch) {
    setPendingWatch(watch ?? null);
    setOpen(true);
  }

  return (
    <AccountContext.Provider value={enabled ? { show, unread } : null}>
      {children}
      <AccountDialog open={open} pendingWatch={pendingWatch} onClose={() => setOpen(false)}
        onWatchSaved={() => setPendingWatch(null)} />
    </AccountContext.Provider>
  );
}

export function AccountButton() {
  const controls = useContext(AccountContext);
  if (!controls) return null;
  return (
    <button type="button" onClick={() => controls.show()} className={buttonClass}>
      <CircleUserRound size={16} aria-hidden="true" /> Mi cuenta
      {controls.unread > 0 && (
        <span aria-label={`${controls.unread} avisos sin leer`} className="rounded-[8px] bg-brand px-1.5 text-xs text-bg">
          {controls.unread}
        </span>
      )}
    </button>
  );
}

export function WatchZoneButton({ watch }: { watch: PendingWatch }) {
  const controls = useContext(AccountContext);
  if (!controls) return null;
  return (
    <button type="button" onClick={() => controls.show(watch)} className={buttonClass}>
      <Bell size={15} aria-hidden="true" /> Recibir avisos
    </button>
  );
}
