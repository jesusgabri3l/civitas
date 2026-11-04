/** Validation of a "Suggest a monument" submission. Pure: shared by the endpoint and its tests. */
export interface Suggestion {
  monument: string;
  place: string;
  why: string;
  email: string;
}

export const MAX_BODY_BYTES = 4096;
const MAX_SHORT = 200;
const MAX_LONG = 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const clean = (value: unknown) => (typeof value === 'string' ? value.replace(CONTROL_CHARS, '').trim() : null);

export type Parsed = { ok: true; suggestion: Suggestion; token: string; bot: boolean } | { ok: false };

export function parseSuggestion(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false };
  const raw = body as Record<string, unknown>;
  const monument = clean(raw.monument);
  const place = clean(raw.place);
  const why = clean(raw.why ?? '');
  const email = clean(raw.email ?? '');
  const token = clean(raw.token ?? '');
  const website = clean(raw.website ?? '');
  if (monument === null || place === null || why === null || email === null || token === null || website === null) return { ok: false };
  const suggestion = { monument, place, why, email };
  const bot = website !== '';
  if (bot) return { ok: true, bot, token, suggestion };
  if (!monument || !place || monument.length > MAX_SHORT || place.length > MAX_SHORT) return { ok: false };
  if (why.length > MAX_LONG || email.length > MAX_SHORT || (email && !EMAIL.test(email))) return { ok: false };
  if (!token || token.length > 2048) return { ok: false };
  return { ok: true, bot, token, suggestion };
}

/** A cell that starts with = + - @ would be read as a formula by Sheets: a leading ' neutralizes it. */
export const safeCell = (value: string) => (/^[=+\-@]/.test(value) ? `'${value}` : value);
