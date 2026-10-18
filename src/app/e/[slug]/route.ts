import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { recordClick } from '@/lib/episode-links/clicks';
import { DEFAULT_LANDING, SURFACES, findEpisode, type Surface } from '@/lib/episode-links/episodes';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|preview|facebookexternalhit|slurp|headless/i;

/**
 * Episode link: counts one click for the episode, then sends the viewer to the site.
 * Only registered slugs redirect and the target is fixed, so this is not an open redirect.
 * Nothing about the visitor is read beyond a bot check, and nothing about them is stored.
 * A storage failure never blocks the redirect.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = findEpisode(slug);
  if (!episode) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const s = request.nextUrl.searchParams.get('s');
  const surface = (SURFACES as readonly string[]).includes(s ?? '') ? (s as Surface) : null;
  if (!BOT.test(request.headers.get('user-agent') || '')) {
    try {
      await recordClick(getStorageAdapter(), episode.slug, surface);
    } catch (e) {
      console.warn('[episode-links] click not recorded:', e instanceof Error ? e.message : 'storage error');
    }
  }

  const res = NextResponse.redirect(new URL(DEFAULT_LANDING, request.url), 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
