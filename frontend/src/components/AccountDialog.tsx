/**
 * "Mi cuenta" (T29, simplified): one short form to sign in or sign up, and a single page with your saved
 * homes and alerts once signed in. Options that are not configured (Google, password recovery) are hidden,
 * not shown disabled. Rarely used settings live in a collapsed section.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, Bookmark, ExternalLink, Trash2, X } from 'lucide-react';
import { accountApi, isOfferNotice, saveFavorite, type AccountSession, type AccountWorkspace, type FavoriteTarget, type WatchInput } from '../api/account';
import { HOUSING_TYPE_LABELS } from '../config';
import { formatEuro } from '../utils/format';

const inputClass = 'mt-1.5 block h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm outline-none transition focus:border-ink';
const primaryClass = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-bg transition hover:bg-brand-hover disabled:opacity-60';
const quietClass = 'text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline';
const iconButton = 'rounded-full p-2 text-muted transition hover:bg-surface hover:text-ink disabled:opacity-50';
const money = (value: number) => `${formatEuro(value)}/mes`;

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
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('restablecer'));
  const [session, setSession] = useState<AccountSession | null>(null);
  const [workspace, setWorkspace] = useState<AccountWorkspace | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (resetToken) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [resetToken]);

  useEffect(() => {
    const element = dialog.current;
    if (element && open && !element.open) element.showModal();
    if (element && !open && element.open) element.close();
    if (!open) setConfirmDelete(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let current = true;
    setSession(null);
    setWorkspace(null);
    const outcome = googleReturn.current;
    setError(outcome === 'google_error' ? 'No se pudo entrar con Google. Si ya tienes cuenta con ese correo, entra con tu contraseña.' : '');
    setFeedback(outcome === 'google' ? 'Has entrado con Google.' : '');
    accountApi.session().then(async (nextSession) => {
      if (!current) return;
      setSession(nextSession);
      let entries = null;
      if (nextSession.username) {
        if (pendingFavorite && outcome === 'google') {
          try {
            entries = await saveFavorite(pendingFavorite);
            onFavoriteSaved();
            setFeedback('Guardado en tu cuenta.');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo completar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void perform(async () => {
      if (mode === 'forgot') {
        await accountApi.forgotPassword(String(form.get('email')));
        setFeedback('Si hay una cuenta con ese correo, te llegará un enlace para elegir otra contraseña.');
        return;
      }
      const nextSession = await accountApi.authenticate(mode, String(form.get('email')), String(form.get('password')));
      setSession(nextSession);
      if (pendingFavorite) {
        setWorkspace(await saveFavorite(pendingFavorite));
        onFavoriteSaved();
        setFeedback('Guardado en tu cuenta.');
      } else {
        setWorkspace(await accountApi.workspace());
      }
    });
  }

  function signedOut() {
    setSession((current) => current && { ...current, username: null, email: null, google_linked: false });
    setMode('login');
    setWorkspace(null);
    setConfirmDelete(false);
  }

  const notices = workspace?.notifications.filter(isOfferNotice) ?? [];
  const guest = Boolean(session?.enabled && !session.username && !resetToken);
  const signedIn = Boolean(session?.username && !resetToken);
  const title = resetToken ? 'Nueva contraseña'
    : signedIn ? 'Mi cuenta'
      : mode === 'register' ? 'Crea tu cuenta'
        : mode === 'forgot' ? 'Recupera tu contraseña'
          : 'Entra en PrimeraLlave';

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="account-title"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="animate-fade-up m-auto max-h-[min(88dvh,44rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-bg p-0 text-ink shadow-popover backdrop:bg-ink/40">
      <div className="flex items-start justify-between gap-3 px-6 pt-6">
        <div className="min-w-0">
          <h2 id="account-title" className="font-display text-2xl font-bold tracking-tight">{title}</h2>
          {signedIn && <p className="mt-1 truncate text-sm text-muted">{session?.email ?? session?.username}</p>}
          {guest && mode !== 'forgot' && (
            <p className="mt-1 text-sm text-muted">
              {pendingFavorite ? 'Entra y lo guardamos en tu cuenta.'
                : pendingWatch ? `Entra para recibir avisos de ${pendingWatch.area_name}.`
                  : 'Guarda zonas y viviendas y recibe avisos.'}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className={iconButton + ' -mt-1 -mr-2'}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 px-6 pt-5 pb-6">
        {error && <p role="alert" className="rounded-xl bg-over-soft px-3.5 py-2.5 text-sm text-over">{error}</p>}
        {feedback && <p role="status" className="rounded-xl bg-fit-soft px-3.5 py-2.5 text-sm text-fit">{feedback}</p>}
        {!session && !error && <p role="status" className="text-sm text-muted">Cargando…</p>}
        {session && !session.enabled && <p className="text-sm text-muted">Las cuentas no están disponibles ahora mismo.</p>}

        {session?.enabled && resetToken && (
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const password = String(new FormData(event.currentTarget).get('new_password'));
            void perform(async () => {
              await accountApi.resetPassword(resetToken, password);
              setResetToken(null);
              signedOut();
              setFeedback('Contraseña cambiada. Ya puedes entrar.');
            });
          }}>
            <label className="block text-sm font-medium">Nueva contraseña
              <input name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} />
            </label>
            <button type="submit" className={primaryClass} disabled={busy}>Guardar contraseña</button>
          </form>
        )}

        {guest && session && (
          <>
            {session.google_enabled && mode !== 'forgot' && (
              <>
                <a className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-surface"
                  href="/api/account/google/start" onClick={() => {
                    if (pendingFavorite) window.sessionStorage.setItem('primerallave-favorite', JSON.stringify(pendingFavorite));
                    else window.sessionStorage.removeItem('primerallave-favorite');
                  }}>
                  <GoogleMark /> Continuar con Google
                </a>
                <div className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">o con tu correo</div>
              </>
            )}
            <form onSubmit={authenticate} className="space-y-4">
              <label className="block text-sm font-medium">Correo electrónico
                <input name="email" type="email" inputMode="email" placeholder="tu@correo.com" autoComplete="email" required maxLength={254} className={inputClass} />
              </label>
              {mode !== 'forgot' && (
                <label className="block text-sm font-medium">
                  <span className="flex items-center justify-between">
                    Contraseña
                    {mode === 'login' && session.recovery_enabled && (
                      <button type="button" className="text-xs font-medium text-muted hover:text-ink" onClick={() => { setMode('forgot'); setError(''); setFeedback(''); }}>
                        ¿La has olvidado?
                      </button>
                    )}
                  </span>
                  <input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required
                    minLength={mode === 'register' ? 8 : undefined} maxLength={128}
                    placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : undefined} className={inputClass} />
                </label>
              )}
              <button type="submit" disabled={busy} className={primaryClass}>
                {busy ? 'Un momento…' : mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Entrar'}
              </button>
            </form>
            <p className="text-center text-sm text-muted">
              {mode === 'login' ? '¿No tienes cuenta? ' : mode === 'register' ? '¿Ya tienes cuenta? ' : ''}
              <button type="button" className="font-semibold text-ink underline-offset-4 hover:underline"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setFeedback(''); }}>
                {mode === 'login' ? 'Créala gratis' : mode === 'register' ? 'Entra' : 'Volver a entrar'}
              </button>
            </p>
          </>
        )}

        {signedIn && session && (
          <>
            {pendingWatch && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
                <p className="text-sm"><strong>{pendingWatch.area_name}</strong><br />
                  <span className="text-muted">{HOUSING_TYPE_LABELS[pendingWatch.housing_type]} · hasta {money(pendingWatch.budget_eur_month)}</span></p>
                <button type="button" disabled={busy} className="shrink-0 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-bg hover:bg-brand-hover"
                  onClick={() => void perform(async () => {
                    const { area_id, housing_type, budget_eur_month } = pendingWatch;
                    setWorkspace(await accountApi.saveWatch({ area_id, housing_type, budget_eur_month }));
                    onWatchSaved();
                    setFeedback('Te avisaremos de esa zona.');
                  })}>Avisarme</button>
              </div>
            )}

            <section aria-label="Guardados">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Bookmark size={15} aria-hidden="true" /> Guardados</h3>
              {workspace && !workspace.listings.length && !workspace.watches.length && (
                <p className="mt-2 rounded-xl bg-surface px-3.5 py-3 text-sm text-muted">Aún no has guardado nada. Usa «Guardar búsqueda» o «Añadir favorito» en tus resultados.</p>
              )}
              <ul className="mt-2 space-y-2">
                {workspace?.listings.map((listing) => (
                  <li key={`l${listing.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5">
                    <a href={listing.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-sm font-medium hover:underline">
                      <span className="flex items-center gap-1.5"><span className="truncate">{listing.title}</span><ExternalLink size={13} className="shrink-0 text-muted" aria-hidden="true" /></span>
                      {listing.price_eur_month !== undefined && <span className="block text-xs font-normal text-muted">{money(listing.price_eur_month)}</span>}
                    </a>
                    <button type="button" disabled={busy} aria-label={`Quitar ${listing.title}`} className={iconButton}
                      onClick={() => void perform(async () => setWorkspace(await accountApi.removeListing(listing.id)))}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {workspace?.watches.map((watch) => (
                  <li key={`w${watch.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">{watch.area_name}</p>
                      <p className="text-xs text-muted">{HOUSING_TYPE_LABELS[watch.housing_type]} · hasta {money(watch.budget_eur_month)}</p>
                    </div>
                    <button type="button" disabled={busy} aria-label={`Quitar ${watch.area_name}`} className={iconButton}
                      onClick={() => void perform(async () => setWorkspace(await accountApi.removeWatch(watch.id)))}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {notices.length > 0 && (
              <section aria-label="Avisos">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Bell size={15} aria-hidden="true" /> Avisos</h3>
                <ul className="mt-2 space-y-2">
                  {notices.slice(0, 10).map((notice) => (
                    <li key={notice.id} className="rounded-xl border border-border px-3.5 py-2.5 text-sm">
                      <p className={notice.read ? 'text-muted' : 'font-medium'}>{notice.message}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                        <time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleDateString('es-ES')}</time>
                        {notice.url && <a className="underline" href={notice.url} target="_blank" rel="noopener noreferrer">Ver anuncio</a>}
                        {!notice.read && <button type="button" disabled={busy} className="underline"
                          onClick={() => void perform(async () => setWorkspace(await accountApi.markRead(notice.id)))}>Marcar leído</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <details className="group rounded-xl border border-border">
              <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-medium text-muted hover:text-ink">Ajustes de la cuenta</summary>
              <div className="space-y-4 border-t border-border px-3.5 py-3.5">
                <form className="space-y-3" onSubmit={(event) => {
                  event.preventDefault();
                  const target = event.currentTarget;
                  const form = new FormData(target);
                  void perform(async () => {
                    await accountApi.changePassword(String(form.get('password')), String(form.get('new_password')));
                    target.reset();
                    setFeedback('Contraseña cambiada.');
                  });
                }}>
                  <p className="text-sm font-semibold">Cambiar contraseña</p>
                  <input name="password" type="password" aria-label="Contraseña actual" placeholder="Contraseña actual" autoComplete="current-password" required maxLength={128} className={inputClass} />
                  <input name="new_password" type="password" aria-label="Nueva contraseña" placeholder="Nueva contraseña (mín. 8)" autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} />
                  <button type="submit" disabled={busy} className="rounded-xl border border-border px-3.5 py-2 text-sm font-medium hover:bg-surface">Cambiar</button>
                </form>
                {confirmDelete ? (
                  <form className="space-y-3" onSubmit={(event) => {
                    event.preventDefault();
                    const password = String(new FormData(event.currentTarget).get('delete_password'));
                    void perform(async () => {
                      await accountApi.deleteAccount(password);
                      signedOut();
                      setFeedback('Tu cuenta se ha eliminado.');
                    });
                  }}>
                    <p className="text-sm text-over">Se borrarán tu cuenta, tus guardados y tus avisos. No se puede deshacer.</p>
                    <input name="delete_password" type="password" aria-label="Confirma tu contraseña" placeholder="Confirma tu contraseña" autoComplete="current-password" required maxLength={128} className={inputClass} />
                    <div className="flex gap-3">
                      <button type="submit" disabled={busy} className="rounded-xl bg-over px-3.5 py-2 text-sm font-semibold text-bg">Eliminar cuenta</button>
                      <button type="button" className={quietClass} onClick={() => setConfirmDelete(false)}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" className="text-sm font-medium text-over hover:underline" onClick={() => setConfirmDelete(true)}>Eliminar cuenta</button>
                )}
              </div>
            </details>

            <button type="button" disabled={busy} className={quietClass + ' block'} onClick={() => void perform(async () => {
              await accountApi.logout();
              signedOut();
            })}>Cerrar sesión</button>
          </>
        )}
      </div>
    </dialog>
  );
}

function GoogleMark() {
  return <span aria-hidden="true" className="bg-[conic-gradient(#4285f4_0_28%,#34a853_28%_50%,#fbbc05_50%_67%,#ea4335_67%_100%)] bg-clip-text text-lg font-black text-transparent">G</span>;
}
