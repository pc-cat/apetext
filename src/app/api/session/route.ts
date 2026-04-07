import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session/sessionService';
import type { CreateSessionPayload } from '@/lib/session/types';

const ANON_USER_ID   = 'anonymous';

export async function POST(req: NextRequest) {
  // ── Parse & validate body ───────────────────────────────────────────────
  let body: CreateSessionPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { wpm, raw, accuracy, consistency, chars, time, text } = body;

  if (
    typeof wpm         !== 'number' ||
    typeof raw         !== 'number' ||
    typeof accuracy    !== 'number' ||
    typeof consistency !== 'number' ||
    typeof chars       !== 'number' ||
    typeof time        !== 'number' ||
    typeof text        !== 'string' ||
    text.trim().length === 0
  ) {
    return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 422 });
  }

  // ── Persist ─────────────────────────────────────────────────────────────
  // TODO: replace ANON_USER_ID with real session.userId once auth is wired
  const session = await createSession(ANON_USER_ID, {
    wpm, raw, accuracy, consistency, chars, time,
    text: text.slice(0, 5000), // guard against oversized payloads
  });

  if (!session) {
    return NextResponse.json(
      { error: 'Failed to save session.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ session }, { status: 201 });
}
