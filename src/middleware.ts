import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for subdomain routing and API authentication
 *
 * Subdomain routing:
 * - jarvis.whatamiappreciatingnow.com → serves /jarvis content at /
 * - www.whatamiappreciatingnow.com → serves main flame visualizer
 * - whatamiappreciatingnow.com (bare apex, no www) → serves the WAIA front-door
 *   page (public/waia-front-door.html). This is the Phase 0 relaunch surface —
 *   see jarvis repo data/waia-curation-pipeline/MASTER-GOAL-SPEC.md. Only fires
 *   if a request actually reaches this app with the bare-apex Host header —
 *   today the apex has a Vercel-dashboard-level redirect to www that happens
 *   before middleware runs, so this branch is a no-op until that redirect is
 *   removed (Jon-gated, one-time Vercel domain setting change).
 *
 * API Authentication:
 * - /api/jarvis/* routes require X-Jarvis-Secret header
 * - In development mode, auth is optional if JARVIS_API_SECRET is not set
 * - SSE connections (GET with Accept: text/event-stream) also validated
 */

/**
 * Validate X-Jarvis-Secret header (or query param for SSE) for Jarvis API requests
 */
function validateJarvisAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.JARVIS_API_SECRET;

  // In development, allow requests if secret is not configured
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Middleware] JARVIS_API_SECRET not set - allowing unauthenticated request in development');
      return null; // Allow through
    }
    // In production without secret configured, deny all requests
    return NextResponse.json(
      { error: 'API authentication not configured' },
      { status: 500 }
    );
  }

  // Check X-Jarvis-Secret header first
  let providedSecret = request.headers.get('X-Jarvis-Secret');

  // If no header, check query param (_secret) for SSE connections
  // EventSource doesn't support custom headers, so we fall back to query params
  if (!providedSecret) {
    providedSecret = request.nextUrl.searchParams.get('_secret');
  }

  if (!providedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized - missing X-Jarvis-Secret header' },
      { status: 401 }
    );
  }

  if (providedSecret !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized - invalid X-Jarvis-Secret' },
      { status: 401 }
    );
  }

  // Auth passed
  return null;
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Check if this is a Jarvis API request
  const isJarvisApiRequest = pathname.startsWith('/api/jarvis/');

  // Routes that handle their own authentication — skip Jarvis auth:
  // - Telegram webhook: uses X-Telegram-Bot-Api-Secret-Token
  // - Reflect cron: uses Authorization: Bearer <CRON_SECRET> (Vercel Cron)
  // - Health endpoint: read-only aggregate stats, no auth required
  const selfAuthRoutes = [
    '/api/jarvis/telegram',
    '/api/jarvis/reflect',
    '/api/jarvis/health',
  ];
  const hasSelfAuth = selfAuthRoutes.includes(pathname);

  // Validate authentication for Jarvis API requests (except self-auth routes)
  if (isJarvisApiRequest && !hasSelfAuth) {
    const authError = validateJarvisAuth(request);
    if (authError) {
      return authError;
    }
  }

  // Check if this is the jarvis subdomain
  const isJarvisSubdomain = hostname.startsWith('jarvis.');

  if (isJarvisSubdomain) {
    // On jarvis subdomain: rewrite / to /jarvis/app (dashboard)
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/jarvis/app', request.url));
    }

    // Rewrite /api/* to /api/jarvis/* (except already jarvis routes)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/jarvis/')) {
      // Block non-jarvis API routes on jarvis subdomain
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Allow /api/jarvis/* routes as-is
    // Allow static assets and other paths
  }

  // Bare apex only (no www./jarvis./studio./other subdomain): serve the WAIA
  // front-door page instead of the main flame visualizer. www. and studio.
  // are untouched and keep serving the existing app exactly as today.
  const isBareApex = hostname === 'whatamiappreciatingnow.com';
  if (isBareApex && pathname === '/') {
    return NextResponse.rewrite(new URL('/waia-front-door.html', request.url));
  }

  // Main domain: redirect /jarvis → /jarvis/app (old voice orb is dead end)
  if (pathname === '/jarvis') {
    return NextResponse.redirect(new URL('/jarvis/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
