/** API de la cuenta y sus datos privados. */
import type { HousingType } from './types';

export type AccountSession = { enabled: boolean; username: string | null; email?: string | null; google_enabled?: boolean; google_linked?: boolean; recovery_enabled?: boolean };
export type ListingInput = { title: string; url: string; remind_on: string | null };
export type WatchInput = { area_id: string; housing_type: HousingType; budget_eur_month: number };
export type SavedListing = ListingInput & {
  id: number; price_eur_month?: number; available?: boolean;
  search_district?: string | null; search_type?: HousingType | null; search_budget?: number | null;
};
export type SavedWatch = WatchInput & {
  id: number;
  area_name: string;
  estimated_rent_eur_month: number | null;
};
export type AccountNotice = {
  id: number; message: string; created_at: string; read: boolean; url: string | null;
  kind: 'price_drop' | 'unavailable' | 'suggestion' | 'reminder' | 'budget' | 'general';
};
export const isOfferNotice = (notice: AccountNotice) => ['price_drop', 'unavailable', 'suggestion'].includes(notice.kind);
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
  forgotPassword: (email: string) => accountRequest('/password/forgot', 'POST', { email }),
  resetPassword: (token: string, new_password: string) => accountRequest<void>('/password/reset', 'POST', { token, new_password }),
  changePassword: (password: string, new_password: string) => accountRequest<void>('/password/change', 'POST', { password, new_password }),
  deleteAccount: (password: string) => accountRequest<void>('/profile', 'DELETE', { password }),
  workspace: () => accountRequest<AccountWorkspace>('/workspace'),
  saveListing: (listing: ListingInput) =>
    accountRequest<AccountWorkspace>('/listings', 'POST', listing),
  saveSearch: (search: WatchInput) => accountRequest<AccountWorkspace>('/searches', 'POST', search),
  removeListing: (id: number) => accountRequest<AccountWorkspace>(`/listings/${id}`, 'DELETE'),
  clearListings: () => accountRequest<AccountWorkspace>('/listings', 'DELETE'),
  offers: (district: string, housing_type: HousingType) =>
    accountRequest<CatalogOffer[]>(`/offers?${new URLSearchParams({ district, housing_type })}`),
  saveWatch: (watch: WatchInput) => accountRequest<AccountWorkspace>('/watches', 'POST', watch),
  removeWatch: (id: number) => accountRequest<AccountWorkspace>(`/watches/${id}`, 'DELETE'),
  markRead: (id: number) => accountRequest<AccountWorkspace>(`/notifications/${id}/read`, 'POST'),
};

export type FavoriteTarget = CatalogOffer | WatchInput;
export const saveFavorite = (target: FavoriteTarget) => 'area_id' in target
  ? accountApi.saveSearch(target)
  : accountApi.saveListing({ title: target.title, url: target.url, remind_on: null });
