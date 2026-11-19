/** Identify preferences already expressed in a natural-language search. */
import type { AiParseResponse, Campus } from '../api/types';
import { DEFAULT_PRIORITIES, priorityOptions, type TransportMode } from '../constants/filters';

const OPTIONAL_TERMS: Record<string, string> = {
  air_no2: 'aire|contaminacion',
  transit_stops: 'metro|transporte|comunicad\\w*',
  libraries_count: 'bibliotec\\w*|cultura|lectura|ocio',
  sports_count: 'gimnas\\w*|deport\\w*|polideportiv\\w*|entren\\w*|piscina',
  services_count: 'servicios|bibliotec\\w*|gimnas\\w*|deport\\w*|cultura|ocio',
};

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function searchPreferences(query: string, parsed: AiParseResponse, availableKeys: Set<string>, campus?: Campus) {
  const words = normalize(query);
  const priorities = new Set(DEFAULT_PRIORITIES);
  const inferredFields = new Set<string>();
  const range = words.match(/\bentre\s+([\d.]+)\s+(?:y|a)\s+([\d.]+)\s*(?:€|euros?|eur|\/mes|al mes)/);
  const rangeStart = range ? Number(range[1].replace(/\./g, '')) : 0;
  const rangeEnd = range ? Number(range[2].replace(/\./g, '')) : 0;
  const hasRange = rangeStart >= 0 && rangeEnd > 0 && rangeStart <= rangeEnd;

  const campusName = campus?.name.split(' · ').slice(-1)[0] ?? '';
  const campusTerms = [campusName, campus?.id.split('-').slice(1).join(' ') ?? '', ...(campus?.aliases ?? [])];
  const searchWords = ' ' + words.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const mentionedCampus = campusTerms.some((term) => {
    const normalized = normalize(term).replace(/[^a-z0-9]+/g, ' ').trim();
    return normalized.length > 0 && searchWords.includes(' ' + normalized + ' ');
  });
  if (mentionedCampus || /\b(etsisi|etsiinf|campus sur|montegancedo)\b/.test(words)) inferredFields.add('campus');
  if (hasRange || parsed.budget_eur_month !== null) {
    inferredFields.add('budget');
  }
  if (parsed.housing_type !== 'room' || /habitacion|compartid/.test(words)) inferredFields.add('housing');
  if (parsed.filters.max_distance_km !== null) inferredFields.add('distance');

  let transportMode: TransportMode = 'any';
  if (/\b(en coche|con coche|conduciendo)\b/.test(words)) transportMode = 'car';
  else if (/\b(a pie|andando|caminando)\b/.test(words)) transportMode = 'walk';
  else if (/\bmetro\b/.test(words) && !/\bsin metro\b/.test(words)) transportMode = 'metro';
  if (transportMode !== 'any') inferredFields.add('transport');

  for (const { key } of priorityOptions(availableKeys)) {
    const terms = OPTIONAL_TERMS[key];
    if (!terms) continue;
    const rejected = new RegExp('(?:no me importa|me da igual|sin valorar|no priorices|sin) [^,.]{0,24}?(?:' + terms + ')').test(words);
    const mentioned = new RegExp('\\b(?:' + terms + ')\\b').test(words);
    if (rejected || mentioned || (parsed.weights[key] ?? 0) >= 0.75) {
      if (!rejected) priorities.add(key);
      else if (key === 'transit_stops' && transportMode === 'metro') transportMode = 'any';
    }
  }

  return {
    inferredFields,
    selectedPriorities: [...priorities],
    transportMode,
    budget: hasRange ? rangeEnd : parsed.budget_eur_month,
    minBudget: hasRange ? rangeStart : null,
  };
}
