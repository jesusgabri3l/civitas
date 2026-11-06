// Vercel Routing Middleware (runs only on `/`): sends Spanish-speaking visitors to `/es`. Plan: docs/i18n-plan.md §4.
// The cookie `lang` (set by the selector) always wins; without it the visitor's country decides. 307, never 301: the answer changes per visitor.
export const config = { matcher: '/' };

const SPANISH_COUNTRIES = new Set([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
]);

const langCookie = (request: Request) => request.headers.get('cookie')?.match(/(?:^|;\s*)lang=(en|es)\b/)?.[1];

export default function middleware(request: Request): Response | undefined {
  const chosen = langCookie(request);
  const country = request.headers.get('x-vercel-ip-country') ?? '';
  const wantsSpanish = chosen ? chosen === 'es' : SPANISH_COUNTRIES.has(country);
  if (wantsSpanish) return Response.redirect(new URL('/es', request.url), 307);
  // Returning nothing lets the request through to the prerendered page.
  return undefined;
}
