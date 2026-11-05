import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_BODY_BYTES, parseSuggestion, safeCell } from '../src/server/suggestion';

const appendRow = vi.fn();
vi.mock('../src/server/googleSheets', () => ({ appendRow: (...args: unknown[]) => appendRow(...args) }));

const { POST } = await import('../src/pages/api/suggest');

const valid = { monument: 'Petra', place: 'Jordan', why: 'Carved in rock', email: 'a@b.co', token: 'tok', website: '' };

describe('parseSuggestion', () => {
  it('accepts a valid suggestion and trims it', () => {
    const parsed = parseSuggestion({ ...valid, monument: '  Petra  ' });
    expect(parsed).toEqual({ ok: true, bot: false, token: 'tok', suggestion: { monument: 'Petra', place: 'Jordan', why: 'Carved in rock', email: 'a@b.co' } });
  });

  it('makes why and email optional', () => {
    const { why, email, ...rest } = valid;
    expect(parseSuggestion(rest)).toMatchObject({ ok: true, suggestion: { why: '', email: '' } });
  });

  it('rejects bodies that are not a plain object', () => {
    for (const body of [null, 'x', 42, [valid]]) expect(parseSuggestion(body)).toEqual({ ok: false });
  });

  it('rejects missing, empty, non-string or too long fields', () => {
    const bad = [
      { ...valid, monument: undefined },
      { ...valid, place: '   ' },
      { ...valid, monument: 7 },
      { ...valid, monument: 'x'.repeat(201) },
      { ...valid, why: 'x'.repeat(1001) },
      { ...valid, email: 'not-an-email' },
      { ...valid, token: '' },
      { ...valid, token: 'x'.repeat(2049) },
    ];
    for (const body of bad) expect(parseSuggestion(body)).toEqual({ ok: false });
  });

  it('strips control characters', () => {
    expect(parseSuggestion({ ...valid, monument: 'Pe\u0000tr\u001fa' })).toMatchObject({ suggestion: { monument: 'Petra' } });
  });

  it('flags the honeypot as a bot before validating the rest', () => {
    expect(parseSuggestion({ ...valid, monument: '', website: 'spam.com' })).toMatchObject({ ok: true, bot: true });
  });
});

describe('safeCell', () => {
  it('neutralizes anything Sheets would read as a formula', () => {
    for (const cell of ['=SUM(A1)', '+1', '-1', '@x']) expect(safeCell(cell)).toBe(`'${cell}`);
    expect(safeCell('Petra')).toBe('Petra');
  });
});

describe('POST /api/suggest', () => {
  let captcha: boolean;

  const post = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
    POST({ request: new Request('http://x/api/suggest', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }) } as never);

  beforeEach(() => {
    captcha = true;
    appendRow.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: captcha }))));
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'sa@x.iam');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('stores a valid suggestion, with formulas neutralized', async () => {
    const response = await post({ ...valid, monument: '=HYPERLINK("x")' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const [, row] = appendRow.mock.calls[0];
    expect(row.slice(1)).toEqual(['\'=HYPERLINK("x")', 'Jordan', 'Carved in rock', 'a@b.co']);
  });

  it('rejects what is not JSON, too big or invalid, without storing it', async () => {
    expect((await post(valid, { 'content-type': 'text/plain' })).status).toBe(400);
    expect((await post('{nope')).status).toBe(400);
    expect((await post({ ...valid, why: 'x'.repeat(MAX_BODY_BYTES) })).status).toBe(400);
    expect((await post({ ...valid, monument: '' })).status).toBe(400);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it('answers 200 to the honeypot but stores nothing and skips the captcha', async () => {
    expect((await post({ ...valid, website: 'spam.com' })).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(appendRow).not.toHaveBeenCalled();
  });

  it('rejects a failed captcha', async () => {
    captcha = false;
    const response = await post(valid);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'captcha' });
    expect(appendRow).not.toHaveBeenCalled();
  });

  it('answers 500 when the config is missing or Sheets fails', async () => {
    vi.stubEnv('GOOGLE_SHEET_ID', '');
    expect((await post(valid)).status).toBe(500);
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    appendRow.mockRejectedValue(new Error('quota'));
    expect((await post(valid)).status).toBe(500);
  });
});
