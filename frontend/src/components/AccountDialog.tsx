import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, Bookmark, Check, ExternalLink, Trash2, X } from 'lucide-react';
import { accountApi, type AccountSession, type AccountWorkspace, type WatchInput } from '../api/account';
import { HOUSING_TYPE_LABELS } from '../config';
import { formatEuro } from '../utils/format';

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium transition disabled:opacity-50';
const primaryClass = `${actionClass} bg-brand text-bg hover:bg-brand-hover`;
const secondaryClass = `${actionClass} border border-border bg-bg text-ink hover:bg-surface`;
const inputClass = 'mt-1 w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-sm focus:border-ink focus:outline-none';
const money = (value: number) => `${formatEuro(value)} /mes`;

export type PendingWatch = WatchInput & { area_name: string };

export interface AccountDialogProps {
  open: boolean;
  pendingWatch: PendingWatch | null;
  onClose: () => void;
  onWatchSaved: () => void;
}

export function AccountDialog({ open, pendingWatch, onClose, onWatchSaved }: AccountDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const googleReturn = useRef(new URLSearchParams(window.location.search).get('cuenta'));
  const listingForm = useRef<HTMLFormElement>(null);
  const [session, setSession] = useState<AccountSession | null>(null);
  const [workspace, setWorkspace] = useState<AccountWorkspace | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [tab, setTab] = useState<'saved' | 'notices'>('saved');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const element = dialog.current;
    if (element && open && !element.open) element.showModal();
    if (element && !open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let current = true;
    setSession(null);
    setWorkspace(null);
    const outcome = googleReturn.current;
    setError(outcome === 'google_error' ? 'No se pudo continuar con Google. Si ya tienes una cuenta con ese correo, entra con tu contraseña y vincula Google.' : '');
    setFeedback(outcome === 'google' ? 'Sesión de Google iniciada.' : '');
    accountApi.session().then(async (nextSession) => {
      if (!current) return;
      setSession(nextSession);
      const entries = nextSession.username ? await accountApi.workspace() : null;
      if (current) {
        setWorkspace(entries);
        if (outcome) {
          googleReturn.current = null;
          const url = new URL(window.location.href);
          url.searchParams.delete('cuenta');
          window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
      }
    }).catch((failure: Error) => {
      if (current) setError(failure.message);
    });
    return () => { current = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !session?.username || busy) return;
    let current = true;
    const interval = window.setInterval(() => {
      void accountApi.workspace().then((entries) => {
        if (current) setWorkspace(entries);
      }).catch(() => {});
    }, 60_000);
    return () => { current = false; window.clearInterval(interval); };
  }, [open, session?.username, busy]);


  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo completar la operación.');
    } finally {
      setBusy(false);
    }
  }

  function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void perform(async () => {
      const nextSession = await accountApi.authenticate(mode, String(form.get('email')), String(form.get('password')));
      setSession(nextSession);
      setTab('saved');
      setWorkspace(await accountApi.workspace());
    });
  }

  function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void perform(async () => {
      setWorkspace(await accountApi.saveListing({
        title: String(form.get('title')).trim(),
        url: String(form.get('url')).trim(),
        remind_on: String(form.get('remind_on')) || null,
      }));
      listingForm.current?.reset();
      setFeedback('Vivienda guardada.');
    });
  }

  const unread = workspace?.notifications.filter((notice) => !notice.read).length ?? 0;

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="account-title"
      className="m-auto max-h-[min(90dvh,52rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[10px] border border-border bg-bg p-0 text-ink shadow-popover backdrop:bg-ink/40">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-bg px-5 py-3.5">
        <h2 id="account-title" className="font-display text-xl font-bold">Mi cuenta</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar mi cuenta" className={secondaryClass}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-5 p-5">
        {error && <p role="alert" className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm">{error}</p>}
        {feedback && <p role="status" className="text-sm text-fit">{feedback}</p>}
        {!session && !error && <p role="status" className="text-sm text-muted">Cargando tu cuenta…</p>}
        {session && !session.enabled && (
          <p className="text-sm text-muted">Las cuentas todavía no están habilitadas en este despliegue.</p>
        )}
        {session?.enabled && !session.username && (
          <form onSubmit={authenticate} className="space-y-4">
            {pendingWatch && <p className="text-sm text-muted">Entra para guardar un aviso de {pendingWatch.area_name}.</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')} className={mode === 'login' ? primaryClass : secondaryClass}>Iniciar sesión</button>
              <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')} className={mode === 'register' ? primaryClass : secondaryClass}>Crear cuenta</button>
            </div>
            <label className="block text-sm font-medium">
              Correo electrónico
              <input name="email" type={mode === 'register' ? 'email' : 'text'} inputMode="email"
                autoComplete="username" required maxLength={254} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Contraseña
              <input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={128} className={inputClass} />
            </label>
            {mode === 'register' && <p className="text-xs text-muted">Usa al menos 8 caracteres.</p>}
            <button type="submit" disabled={busy} className={primaryClass}>{mode === 'register' ? 'Registrarme' : 'Entrar'}</button>
            {session.google_enabled && <a className={secondaryClass} href="/api/account/google/start">Continuar con Google</a>}
          </form>
        )}
        {session?.username && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{session.username}</p>
              <button type="button" className={secondaryClass} disabled={busy} onClick={() => void perform(async () => {
                await accountApi.logout();
                setSession({ ...session, username: null, email: null, google_linked: false });
                setMode('login');
                setWorkspace(null);
              })}>Cerrar sesión</button>
            </div>
            {!session.email && (
              <form className="space-y-2" onSubmit={(event) => {
                event.preventDefault();
                const email = String(new FormData(event.currentTarget).get('legacy_email'));
                void perform(async () => setSession(await accountApi.addEmail(email)));
              }}>
                <label className="block text-sm">Añade un correo a tu cuenta
                  <input name="legacy_email" type="email" autoComplete="email" required className={inputClass} />
                </label>
                <button type="submit" disabled={busy} className={secondaryClass}>Guardar correo</button>
              </form>
            )}
            {session.email && session.google_enabled && !session.google_linked &&
              <a className={secondaryClass} href="/api/account/google/start">Vincular Google</a>}
            {pendingWatch && (
              <div className="space-y-2 rounded-[8px] border border-border bg-surface p-3">
                <p className="text-sm"><strong>{pendingWatch.area_name}</strong> · {HOUSING_TYPE_LABELS[pendingWatch.housing_type]} · {money(pendingWatch.budget_eur_month)}</p>
                <button type="button" disabled={busy} className={primaryClass} onClick={() => void perform(async () => {
                  const { area_id, housing_type, budget_eur_month } = pendingWatch;
                  setWorkspace(await accountApi.saveWatch({ area_id, housing_type, budget_eur_month }));
                  onWatchSaved();
                  setFeedback('Aviso de zona guardado.');
                  setTab('notices');
                })}>Guardar aviso</button>
              </div>
            )}
            <nav aria-label="Secciones de mi cuenta" className="flex gap-2">
              <button type="button" aria-pressed={tab === 'saved'} onClick={() => setTab('saved')} className={tab === 'saved' ? primaryClass : secondaryClass}>
                <Bookmark size={16} aria-hidden="true" /> Guardados
              </button>
              <button type="button" aria-pressed={tab === 'notices'} onClick={() => setTab('notices')} className={tab === 'notices' ? primaryClass : secondaryClass}>
                <Bell size={16} aria-hidden="true" /> Avisos{unread ? ` (${unread})` : ''}
              </button>
            </nav>
            {tab === 'saved' && (
              <div className="space-y-5">
                {!!workspace?.offers?.length && (
                  <section aria-label="Ofertas disponibles" className="space-y-2">
                    <h3 className="font-display font-semibold">Ofertas disponibles</h3>
                    {workspace.offers.map((offer) => (
                      <div key={offer.url} className="flex items-center justify-between gap-2 rounded-[8px] border border-border p-3 text-sm">
                        <div className="min-w-0">
                          <a className="break-words font-medium underline" href={offer.url} target="_blank" rel="noopener noreferrer">{offer.title}</a>
                          <p className="text-muted">{offer.district} · {money(offer.price_eur_month)}</p>
                        </div>
                        <button type="button" className={secondaryClass} disabled={busy} aria-label={"Guardar " + offer.title}
                          onClick={() => void perform(async () => {
                            setWorkspace(await accountApi.saveListing({ title: offer.title, url: offer.url, remind_on: null }));
                            setFeedback('Vivienda guardada.');
                          })}>Guardar</button>
                      </div>
                    ))}
                  </section>
                )}
                <form ref={listingForm} onSubmit={saveListing} className="space-y-3 rounded-[8px] border border-border p-3">
                  <h3 className="font-display font-semibold">Guardar una vivienda</h3>
                  <label className="block text-sm">Nombre del anuncio<input required name="title" maxLength={120} className={inputClass} /></label>
                  <label className="block text-sm">Enlace del anuncio<input required name="url" type="url" maxLength={2048} placeholder="https://…" className={inputClass} /></label>
                  <label className="block text-sm">Recordar el día (opcional)<input name="remind_on" type="date" className={inputClass} /></label>
                  <button type="submit" disabled={busy} className={secondaryClass}>Guardar vivienda</button>
                </form>
                <ul className="space-y-2" aria-label="Viviendas guardadas">
                  {workspace?.listings.map((listing) => (
                    <li key={listing.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-border p-3">
                      <div className="min-w-0">
                        <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium underline">
                          <span className="break-words">{listing.title}</span><ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                        </a>
                        {listing.price_eur_month !== undefined && <p className="mt-1 text-xs text-muted">{money(listing.price_eur_month)}</p>}
                        {listing.remind_on && <p className="mt-1 text-xs text-muted">Recordatorio: {listing.remind_on.split('-').reverse().join('/')}</p>}
                      </div>
                      <button type="button" disabled={busy} aria-label={`Quitar ${listing.title}`} className={secondaryClass} onClick={() => void perform(async () => setWorkspace(await accountApi.removeListing(listing.id)))}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tab === 'notices' && (
              <div className="space-y-4">
                <p className="text-sm text-muted">Consulta bajadas de precio, sugerencias, recordatorios y avisos de presupuesto.</p>
                <ul className="space-y-2" aria-label="Notificaciones">
                  {workspace?.notifications.map((notice) => (
                    <li key={notice.id} className="flex items-start justify-between gap-3 rounded-[8px] border border-border p-3 text-sm">
                      <div>
                        <p className={notice.read ? 'text-muted' : 'font-medium'}>{notice.message}</p>
                        {notice.url && <a className="mt-1 inline-block underline" href={notice.url} target="_blank" rel="noopener noreferrer">Ver anuncio</a>}
                        <time dateTime={notice.created_at} className="mt-1 block text-xs text-muted">
                          {new Date(notice.created_at).toLocaleDateString('es-ES')}
                        </time>
                      </div>
                      {!notice.read && (
                        <button type="button" aria-label="Marcar como leído" disabled={busy} className={secondaryClass} onClick={() => void perform(async () => setWorkspace(await accountApi.markRead(notice.id)))}>
                          <Check size={16} aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <h3 className="font-display font-semibold">Zonas con aviso</h3>
                {!workspace?.watches.length && <p className="text-sm text-muted">Abre el detalle de una zona para guardar un aviso.</p>}
                <ul className="space-y-2">
                  {workspace?.watches.map((watch) => (
                    <li key={watch.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium">{watch.area_name}</p>
                        <p className="text-muted">{HOUSING_TYPE_LABELS[watch.housing_type]} · Presupuesto {money(watch.budget_eur_month)}</p>
                        {watch.estimated_rent_eur_month !== null && <p className="text-muted">Estimación {money(watch.estimated_rent_eur_month)}</p>}
                      </div>
                      <button type="button" disabled={busy} aria-label={`Quitar aviso de ${watch.area_name}`} className={secondaryClass} onClick={() => void perform(async () => setWorkspace(await accountApi.removeWatch(watch.id)))}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
