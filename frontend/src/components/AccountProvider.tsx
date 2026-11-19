import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Bell, Bookmark, CircleUserRound } from 'lucide-react';
import { accountApi, isOfferNotice, saveFavorite, type CatalogOffer, type FavoriteTarget } from '../api/account';
import type { HousingType } from '../api/types';
import { AccountDialog, type PendingWatch } from './AccountDialog';

type AccountControls = { show: (watch?: PendingWatch, favorite?: FavoriteTarget) => void; unread: number };
const AccountContext = createContext<AccountControls | null>(null);
const buttonClass = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-bg px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface';

export function AccountProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has('cuenta') ||
    new URLSearchParams(window.location.hash.slice(1)).has('restablecer'));
  const [pendingWatch, setPendingWatch] = useState<PendingWatch | null>(null);
  const [pendingFavorite, setPendingFavorite] = useState<FavoriteTarget | null>(() => {
    if (new URLSearchParams(window.location.search).get('cuenta') !== 'google') return null;
    try {
      return JSON.parse(window.sessionStorage.getItem('primerallave-favorite') ?? 'null') as FavoriteTarget | null;
    } catch {
      return null;
    }
  });
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
        if (active) setUnread(workspace.notifications.filter((notice) => isOfferNotice(notice) && !notice.read).length);
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

  function show(watch?: PendingWatch, favorite?: FavoriteTarget) {
    setPendingWatch(watch ?? null);
    setPendingFavorite(favorite ?? null);
    setOpen(true);
  }

  return (
    <AccountContext.Provider value={enabled ? { show, unread } : null}>
      {children}
      <AccountDialog open={open} pendingWatch={pendingWatch} pendingFavorite={pendingFavorite} onClose={() => setOpen(false)}
        onFavoriteSaved={() => setPendingFavorite(null)}
        onWatchSaved={() => setPendingWatch(null)} />
    </AccountContext.Provider>
  );
}

export function FavoriteButton({ target }: { target: FavoriteTarget }) {
  const controls = useContext(AccountContext);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!controls) return null;
  async function save() {
    setSaving(true);
    setError('');
    try {
      if (!(await accountApi.session()).username) {
        controls?.show(undefined, target);
        return;
      }
      await saveFavorite(target);
      controls?.show();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar el favorito.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button type="button" onClick={() => void save()} className={buttonClass} disabled={saving}>
        <Bookmark size={15} aria-hidden="true" />
        {saving ? 'Guardando…' : 'area_id' in target ? 'Guardar búsqueda' : 'Añadir favorito'}
      </button>
      {error && <span role="alert" className="text-xs text-ink">{error}</span>}
    </>
  );
}

export function DistrictOffers({ district, housingType }: { district: string; housingType: HousingType }) {
  const enabled = useContext(AccountContext) !== null;
  const [result, setResult] = useState<{ key: string; offers: CatalogOffer[] } | null>(null);
  const key = `${district}/${housingType}`;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void accountApi.offers(district, housingType).then((offers) => {
      if (active) setResult({ key, offers });
    }).catch(() => {});
    return () => { active = false; };
  }, [enabled, district, housingType, key]);
  if (!enabled || result?.key !== key || !result.offers.length) return null;
  return (
    <section className="mt-5 space-y-2" aria-label="Viviendas disponibles en el distrito">
      <h3 className="font-display font-semibold">Viviendas disponibles en {district}</h3>
      {result.offers.map((offer) => (
        <div key={offer.url} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-border p-3 text-sm">
          <div>
            <a href={offer.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">{offer.title}</a>
            <p className="text-muted">{offer.price_eur_month} €/mes</p>
          </div>
          <FavoriteButton target={offer} />
        </div>
      ))}
    </section>
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
