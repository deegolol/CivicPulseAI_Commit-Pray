import { Expandable } from './Expandable';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, Bookmark, Check, ExternalLink, Trash2, X } from 'lucide-react';
import { accountApi, isOfferNotice, saveFavorite, type AccountSession, type AccountWorkspace, type FavoriteTarget, type WatchInput } from '../api/account';
import { HOUSING_TYPE_LABELS } from '../config';
import { formatEuro } from '../utils/format';

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium transition disabled:opacity-50';
const primaryClass = `${actionClass} bg-brand text-bg hover:bg-brand-hover`;
const secondaryClass = `${actionClass} border border-border bg-bg text-ink hover:bg-surface`;
const inputClass = 'mt-1 w-full rounded-[8px] border border-border bg-bg px-3 py-2 text-sm focus:border-ink focus:outline-none';
const money = (value: number) => `${formatEuro(value)} /mes`;
const googleButtonClass = 'flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-bg px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted';

export type PendingWatch = WatchInput & { area_name: string };

export interface AccountDialogProps {
  open: boolean;
  pendingWatch: PendingWatch | null;
  pendingFavorite: FavoriteTarget | null;
  onClose: () => void;
  onWatchSaved: () => void;
  onFavoriteSaved: () => void;
}

export function AccountDialog({ open, pendingWatch, pendingFavorite, onClose, onWatchSaved, onFavoriteSaved }: AccountDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const googleReturn = useRef(new URLSearchParams(window.location.search).get('cuenta'));
  const listingForm = useRef<HTMLFormElement>(null);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('restablecer'));
  const [session, setSession] = useState<AccountSession | null>(null);
  const [workspace, setWorkspace] = useState<AccountWorkspace | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [tab, setTab] = useState<'saved' | 'notices' | 'settings'>('saved');
  const [manual, setManual] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'clear' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (resetToken) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [resetToken]);

  useEffect(() => {
    if (!open) {
      setManual(false);
      setConfirmAction(null);
    }
  }, [open]);

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
    setTab('saved');
    const outcome = googleReturn.current;
    setError(outcome === 'google_error' ? 'No se pudo continuar con Google. Si ya tienes una cuenta con ese correo, entra con tu contraseña y vincula Google.' : '');
    setFeedback(outcome === 'google' ? 'Sesión de Google iniciada.' : '');
    accountApi.session().then(async (nextSession) => {
      if (!current) return;
      setSession(nextSession);
      let entries = null;
      if (nextSession.username) {
        if (pendingFavorite && outcome === 'google') {
          try {
            entries = await saveFavorite(pendingFavorite);
            onFavoriteSaved();
            setFeedback('Guardado. Recibirás avisos cuando haya novedades del catálogo.');
          } finally {
            window.sessionStorage.removeItem('primerallave-favorite');
          }
        } else {
          entries = await accountApi.workspace();
        }
      }
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
      if (mode === 'forgot') {
        if (!session?.recovery_enabled) return;
        await accountApi.forgotPassword(String(form.get('email')));
        setFeedback('Si hay una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.');
        return;
      }
      const nextSession = await accountApi.authenticate(mode, String(form.get('email')), String(form.get('password')));
      setSession(nextSession);
      setTab('saved');
      if (pendingFavorite) {
        setWorkspace(await saveFavorite(pendingFavorite));
        onFavoriteSaved();
        setFeedback('Guardado. Recibirás avisos cuando haya novedades del catálogo.');
      } else {
        setWorkspace(await accountApi.workspace());
      }
    });
  }

  function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void perform(async () => {
      setWorkspace(await accountApi.saveListing({
        title: String(form.get('title')).trim(),
        url: String(form.get('url')).trim(),
        remind_on: null,
      }));
      listingForm.current?.reset();
      setManual(false);
      onFavoriteSaved();
      setFeedback('Vivienda guardada. Si el catálogo sigue este anuncio, recibirás avisos de cambios.');
    });
  }

  function signedOut() {
    setSession((current) => current && { ...current, username: null, email: null, google_linked: false });
    setMode('login');
    setWorkspace(null);
    setConfirmAction(null);
    setTab('saved');
  }

  const notices = workspace?.notifications.filter(isOfferNotice) ?? [];
  const unread = notices.filter((notice) => !notice.read).length;
  const guest = session?.enabled && !session.username && !resetToken;
  const heading = mode === 'forgot' ? 'Recupera tu contraseña' : 'Entra en PrimeraLlave';

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="account-title"
      className={`account-motion m-auto max-h-[min(90dvh,52rem)] w-[calc(100%-2rem)] overflow-y-auto border border-border bg-bg p-0 text-ink shadow-popover backdrop:bg-ink/40 ${guest
        ? 'max-w-md rounded-[18px]'
        : 'max-w-xl rounded-[10px]'}`}>
      <div className={`sticky top-0 z-10 flex items-start justify-between gap-3 bg-bg px-6 ${guest ? 'pt-6' : 'border-b border-border py-3.5'}`}>
        <div>
          {guest && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Tu cuenta</p>}
          <h2 id="account-title" className={`font-display font-bold ${guest ? 'text-2xl' : 'text-xl'}`}>{guest ? heading : 'Mi cuenta'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar mi cuenta" className={secondaryClass}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={`space-y-5 ${guest ? 'px-6 pb-6 pt-3' : 'p-5'}`}>
        {error && <p role="alert" className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm">{error}</p>}
        {feedback && <p role="status" className="text-sm text-fit">{feedback}</p>}
        {!session && !error && <p role="status" className="text-sm text-muted">Cargando tu cuenta…</p>}
        {session && !session.enabled && (
          <p className="text-sm text-muted">Las cuentas todavía no están habilitadas en este despliegue.</p>
        )}
        {session?.enabled && resetToken && (
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            const password = String(new FormData(event.currentTarget).get('new_password'));
            void perform(async () => {
              await accountApi.resetPassword(resetToken, password);
              setResetToken(null);
              signedOut();
              setFeedback('Contraseña restablecida. Ya puedes iniciar sesión.');
            });
          }}>
            <h3 className="font-display font-semibold">Elige una nueva contraseña</h3>
            <label className="block text-sm">Nueva contraseña
              <input name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} />
            </label>
            <button type="submit" className={primaryClass} disabled={busy}>Restablecer contraseña</button>
            <button type="button" className={secondaryClass} onClick={() => { setResetToken(null); setMode('forgot'); setError(''); }}>Volver</button>
          </form>
        )}
        {guest && (
          <form onSubmit={authenticate} className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">
              {mode === 'forgot'
                ? 'Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.'
                : pendingFavorite ? 'El favorito se guardará en cuanto entres en tu cuenta.'
                  : pendingWatch ? `Entra para guardar un aviso de ${pendingWatch.area_name}.`
                    : 'Guarda tus búsquedas y viviendas para recibir avisos cuando haya cambios.'}
            </p>
            {mode !== 'forgot' && (
              <>
                {session.google_enabled ? (
                  <a className={googleButtonClass} href="/api/account/google/start" onClick={() => {
                    if (pendingFavorite) window.sessionStorage.setItem('primerallave-favorite', JSON.stringify(pendingFavorite));
                    else window.sessionStorage.removeItem('primerallave-favorite');
                  }}><GoogleMark /> Continuar con Google</a>
                ) : (
                  <div className="space-y-1.5">
                    <button type="button" className={googleButtonClass} disabled><GoogleMark /> Continuar con Google</button>
                    <p className="text-center text-xs text-muted">Esta instalación todavía necesita un cliente de Google OAuth.</p>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">o con tu correo</div>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')} className={mode === 'login' ? primaryClass : secondaryClass}>Iniciar sesión</button>
              <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')} className={mode === 'register' ? primaryClass : secondaryClass}>Crear cuenta</button>
            </div>
            <label className="block text-sm font-medium">
              Correo electrónico
              <input name="email" type={mode === 'login' ? 'text' : 'email'} inputMode="email"
                placeholder="tu@correo.com" autoComplete={mode === 'forgot' ? 'email' : 'username'} required maxLength={254} className={inputClass} />
            </label>
            {mode !== 'forgot' && <label className="block text-sm font-medium">
              Contraseña
              <input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={128} className={inputClass} />
            </label>}
            {mode === 'register' && <p className="text-xs text-muted">Usa al menos 8 caracteres.</p>}
            {mode === 'forgot' && !session.recovery_enabled &&
              <p className="rounded-[8px] border border-border bg-surface p-3 text-sm text-muted">
                Este entorno aún necesita un servicio de correo para enviar enlaces de recuperación.
              </p>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy || (mode === 'forgot' && !session.recovery_enabled)} className={`${primaryClass} w-full`}>{mode === 'register' ? 'Registrarme' : mode === 'forgot' ? 'Enviar enlace' : 'Entrar'}</button>
              {mode === 'login' && <button type="button" className={secondaryClass} onClick={() => { setMode('forgot'); setError(''); setFeedback(''); }}>¿Has olvidado tu contraseña?</button>}
            </div>
          </form>
        )}
        {session?.username && !resetToken && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{session.username}</p>
              <button type="button" className={secondaryClass} disabled={busy} onClick={() => void perform(async () => {
                await accountApi.logout();
                signedOut();
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
                  setTab('settings');
                })}>Guardar aviso</button>
              </div>
            )}
            <nav aria-label="Secciones de mi cuenta" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={tab === 'saved'} onClick={() => setTab('saved')} className={tab === 'saved' ? primaryClass : secondaryClass}>
                <Bookmark size={16} aria-hidden="true" /> Guardados
              </button>
              <button type="button" aria-pressed={tab === 'notices'} onClick={() => setTab('notices')} className={tab === 'notices' ? primaryClass : secondaryClass}>
                <Bell size={16} aria-hidden="true" /> Avisos{unread ? ` (${unread})` : ''}
              </button>
              <button type="button" aria-pressed={tab === 'settings'} onClick={() => setTab('settings')} className={tab === 'settings' ? primaryClass : secondaryClass}>
                Gestionar cuenta
              </button>
            </nav>
            {tab === 'saved' && (
              <div className="account-tab-in space-y-5">
                {workspace && workspace.listings.length === 0 && <p className="text-sm text-muted">Todavía no tienes favoritos.</p>}
                {!manual && <button type="button" className={secondaryClass} onClick={() => setManual(true)}>
                  <Bookmark size={16} aria-hidden="true" /> Añadir favorito
                </button>}
                <Expandable open={manual}><form ref={listingForm} onSubmit={saveListing} className="space-y-3 rounded-[8px] border border-border p-3">
                  <h3 className="font-display font-semibold">Guardar una vivienda</h3>
                  <label className="block text-sm">Nombre del anuncio<input required name="title" maxLength={120} className={inputClass} /></label>
                  <label className="block text-sm">Enlace del anuncio<input required name="url" type="url" maxLength={2048} placeholder="https://…" className={inputClass} /></label>
                  <button type="submit" disabled={busy} className={secondaryClass}>Guardar vivienda</button>
                  <button type="button" className={secondaryClass} onClick={() => { setManual(false); onFavoriteSaved(); }}>Cancelar</button>
                </form></Expandable>
                <ul className="space-y-2" aria-label="Viviendas guardadas">
                  {workspace?.listings.map((listing) => (
                    <li key={listing.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-border p-3">
                      <div className="min-w-0">
                        <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium underline">
                          <span className="break-words">{listing.title}</span><ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                        </a>
                        {listing.price_eur_month !== undefined && <p className="mt-1 text-xs text-muted">{money(listing.price_eur_month)}</p>}
                        {listing.search_type && listing.search_budget &&
                          <p className="mt-1 text-xs text-muted">{HOUSING_TYPE_LABELS[listing.search_type]} · Hasta {money(listing.search_budget)}</p>}
                        <p className="mt-1 text-xs text-muted">Avisos automáticos del catálogo</p>
                        {listing.available === false && <p className="mt-1 text-xs text-muted">Ya no disponible</p>}
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
              <div className="account-tab-in space-y-4">
                {workspace && !notices.length && <p className="text-sm text-muted">Todavía no tienes avisos de viviendas.</p>}
                <ul className="space-y-2" aria-label="Notificaciones">
                  {notices.map((notice) => (
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
              </div>
            )}
            {tab === 'settings' && (
              <div className="account-tab-in space-y-4">
                <form className="space-y-3 rounded-[8px] border border-border p-3" onSubmit={(event) => {
                  event.preventDefault();
                  const target = event.currentTarget;
                  const form = new FormData(target);
                  void perform(async () => {
                    await accountApi.changePassword(String(form.get('password')), String(form.get('new_password')));
                    target.reset();
                    setFeedback('Contraseña actualizada. Se han cerrado las demás sesiones.');
                  });
                }}>
                  <h3 className="font-display font-semibold">Cambiar contraseña</h3>
                  <label className="block text-sm">Contraseña actual<input name="password" type="password" autoComplete="current-password" required maxLength={128} className={inputClass} /></label>
                  <label className="block text-sm">Nueva contraseña<input name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} /></label>
                  <button type="submit" disabled={busy} className={secondaryClass}>Cambiar contraseña</button>
                </form>
                {confirmAction === 'clear' ? (
                  <div className="space-y-2 rounded-[8px] border border-border p-3">
                    <p className="text-sm">Se borrarán todas las viviendas guardadas.</p>
                    <button type="button" disabled={busy} className={primaryClass} onClick={() => void perform(async () => {
                      setWorkspace(await accountApi.clearListings());
                      setConfirmAction(null);
                      setFeedback('Favoritos borrados.');
                    })}>Confirmar borrado de favoritos</button>
                    <button type="button" disabled={busy} className={secondaryClass} onClick={() => setConfirmAction(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button type="button" disabled={busy || !workspace?.listings.length} className={secondaryClass} onClick={() => setConfirmAction('clear')}>Borrar todos los favoritos</button>
                )}
                {confirmAction === 'delete' ? (
                  <form className="space-y-3 rounded-[8px] border border-border p-3" onSubmit={(event) => {
                    event.preventDefault();
                    const password = String(new FormData(event.currentTarget).get('delete_password'));
                    void perform(async () => {
                      await accountApi.deleteAccount(password);
                      signedOut();
                      setFeedback('Tu cuenta se ha eliminado.');
                    });
                  }}>
                    <p className="text-sm">Se eliminarán de forma permanente tu cuenta, tus favoritos y tus avisos. Si te registraste con Google, usa primero el enlace de recuperación para establecer una contraseña.</p>
                    <label className="block text-sm">Confirma tu contraseña<input name="delete_password" type="password" autoComplete="current-password" required maxLength={128} className={inputClass} /></label>
                    <button type="submit" disabled={busy} className={primaryClass}>Eliminar cuenta definitivamente</button>
                    <button type="button" disabled={busy} className={secondaryClass} onClick={() => setConfirmAction(null)}>Cancelar</button>
                  </form>
                ) : (
                  <button type="button" disabled={busy} className={secondaryClass} onClick={() => setConfirmAction('delete')}>Eliminar cuenta</button>
                )}
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

function GoogleMark() {
  return <span aria-hidden="true" className="bg-[conic-gradient(#4285f4_0_28%,#34a853_28%_50%,#fbbc05_50%_67%,#ea4335_67%_100%)] bg-clip-text text-lg font-black text-transparent">G</span>;
}
