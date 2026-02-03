import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for subdomain routing and API authentication
 *
 * Subdomain routing:
 * - jarvis.whatamiappreciatingnow.com → serves /jarvis content at /
 * - www.whatamiappreciatingnow.com → serves main flame visualizer
 *
 * API Authentication:
 * - /api/jarvis/* routes require X-Jarvis-Secret header
 * - In development mode, auth is optional if JARVIS_API_SECRET is not set
 * - SSE connections (GET with Accept: text/event-stream) also validated
 */

/**
 * Validate X-Jarvis-Secret header for Jarvis API requests
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

  // Check X-Jarvis-Secret header
  const providedSecret = request.headers.get('X-Jarvis-Secret');

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

  // Validate authentication for Jarvis API requests
  if (isJarvisApiRequest) {
    const authError = validateJarvisAuth(request);
    if (authError) {
      return authError;
    }
  }

  // Check if this is the jarvis subdomain
  const isJarvisSubdomain = hostname.startsWith('jarvis.');

  if (isJarvisSubdomain) {
    // On jarvis subdomain: rewrite / to /jarvis
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/jarvis', request.url));
    }

    // Rewrite /api/* to /api/jarvis/* (except already jarvis routes)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/jarvis/')) {
      // Block non-jarvis API routes on jarvis subdomain
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Allow /api/jarvis/* routes as-is
    // Allow static assets and other paths
  }

  // On main domain: optionally block /jarvis routes if you want separation
  // For now, allow both to coexist

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
