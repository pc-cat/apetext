/**
 * GET /api/sessions
 *
 * Returns recent sessions for the current user.
 * - Reads from Valkey cache first (10 min TTL)
 * - Falls back to Supabase on cache miss
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessions } from '@/lib/session/sessionService';

export const dynamic = 'force-dynamic';

const ANON_USER_ID = 'anonymous';

export async function GET(_req: NextRequest) {
  // TODO: replace with real userId from session cookie once auth is wired
  const userId = ANON_USER_ID;

  const sessions = await getSessions(userId);

  return NextResponse.json(
    { sessions },
    {
      status: 200,
      headers: {
        // Allow CDN/browser to serve stale while revalidating
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
