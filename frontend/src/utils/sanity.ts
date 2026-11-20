/**
 * Instant check (no AI, no network) that a search sentence is made of real-looking words.
 * Mirrors backend/app/llm.py `looks_like_language`, so keyboard mashing never reaches the AI.
 */
const VOWELS = /[aeiou]/;

function normalize(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/€/g, ' euros ');
}

export function looksLikeLanguage(query: string): boolean {
  const q = normalize(query);
  const letters = q.match(/[a-z]/g) ?? [];
  const meaningful = q.match(/[a-z0-9]/g) ?? [];  // "500-600 euros" is fine: digits count
  const visible = q.replace(/\s/g, '');
  if (letters.length < 3 || meaningful.length < 0.6 * visible.length) return false;
  if (/([a-z])\1{3,}/.test(q)) return false;
  if (new Set(letters).size < Math.min(5, Math.max(3, Math.floor(letters.length / 3)))) return false;
  const words = q.match(/[a-z]+/g) ?? [];
  const plausible = (w: string) => (w.length <= 3 || VOWELS.test(w)) && w.length < 25 && !/[^aeiou]{5,}/.test(w);
  const good = words.filter(plausible).length;
  return good >= Math.max(1, Math.round(0.7 * words.length));
}
