/** API de la cuenta y sus datos privados. */
import type { HousingType } from './types';

export type AccountSession = { enabled: boolean; username: string | null; email?: string | null; google_enabled?: boolean; google_linked?: boolean };
export type ListingInput = { title: string; url: string; remind_on: string | null };
export type WatchInput = { area_id: string; housing_type: HousingType; budget_eur_month: number };
export type SavedListing = ListingInput & { id: number; price_eur_month?: number };
export type SavedWatch = WatchInput & {
  id: number;
  area_name: string;
  estimated_rent_eur_month: number | null;
};
export type AccountNotice = {
  id: number; message: string; created_at: string; read: boolean; url: string | null;
  kind: 'price_drop' | 'suggestion' | 'reminder' | 'budget' | 'general';
};
export type CatalogOffer = {
  id: string; title: string; url: string; district: string; housing_type: HousingType; price_eur_month: number;
};
export type AccountWorkspace = {
  listings: SavedListing[];
  watches: SavedWatch[];
  notifications: AccountNotice[];
  offers: CatalogOffer[];
};

async function accountRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/account${path}`, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = typeof data?.detail === 'string' ? data.detail : 'No se pudo completar la operación.';
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const accountApi = {
  session: () => accountRequest<AccountSession>('/session'),
  authenticate: (mode: 'login' | 'register', email: string, password: string) =>
    accountRequest<AccountSession>(`/${mode}`, 'POST', { email, password }),
  addEmail: (email: string) => accountRequest<AccountSession>('/email', 'POST', { email }),
  logout: () => accountRequest<void>('/logout', 'POST'),
  workspace: () => accountRequest<AccountWorkspace>('/workspace'),
  saveListing: (listing: ListingInput) =>
    accountRequest<AccountWorkspace>('/listings', 'POST', listing),
  removeListing: (id: number) => accountRequest<AccountWorkspace>(`/listings/${id}`, 'DELETE'),
  saveWatch: (watch: WatchInput) => accountRequest<AccountWorkspace>('/watches', 'POST', watch),
  removeWatch: (id: number) => accountRequest<AccountWorkspace>(`/watches/${id}`, 'DELETE'),
  markRead: (id: number) => accountRequest<AccountWorkspace>(`/notifications/${id}/read`, 'POST'),
};
