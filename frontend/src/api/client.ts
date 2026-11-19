/**
 * Typed HTTP client for PrimeraLlave backend (/api/*).
 * Switches cleanly to local mocks when VITE_USE_MOCKS=true.
 */
import type {
  AiExplainRequest,
  AiExplainResponse,
  AiParseRequest,
  AiParseResponse,
  AreaDetailResponse,
  AreasResponse,
  BarriosGeoJSON,
  MetaResponse,
  ScoreRequest,
  ScoreResponse,
} from './types';
import {
  computeMockScore,
  getMockAreaDetail,
  MOCK_AREAS,
  MOCK_GEOJSON,
  MOCK_META,
  mockAiExplain,
  mockAiParse,
} from '../mocks/mockData';

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getMeta(): Promise<MetaResponse> {
  if (USE_MOCKS) return MOCK_META;
  return fetchJson<MetaResponse>('/api/meta');
}

export async function getAreas(): Promise<AreasResponse> {
  if (USE_MOCKS) return { areas: MOCK_AREAS };
  return fetchJson<AreasResponse>('/api/areas');
}

export async function getAreaDetail(id: string): Promise<AreaDetailResponse> {
  if (USE_MOCKS) return getMockAreaDetail(id);
  return fetchJson<AreaDetailResponse>(`/api/areas/${encodeURIComponent(id)}`);
}

export async function getGeo(): Promise<BarriosGeoJSON> {
  if (USE_MOCKS) return MOCK_GEOJSON;
  return fetchJson<BarriosGeoJSON>('/api/geo');
}

export async function postScore(payload: ScoreRequest): Promise<ScoreResponse> {
  if (USE_MOCKS) return computeMockScore(payload);
  return fetchJson<ScoreResponse>('/api/score', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function postAiParse(payload: AiParseRequest): Promise<AiParseResponse> {
  if (USE_MOCKS) return mockAiParse(payload);
  try {
    return await fetchJson<AiParseResponse>('/api/ai/parse', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // Offline/fallback safety: never break natural-language search during live demo
    return mockAiParse(payload);
  }
}

export async function postAiExplain(payload: AiExplainRequest): Promise<AiExplainResponse> {
  if (USE_MOCKS) return mockAiExplain(payload);
  return fetchJson<AiExplainResponse>('/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
