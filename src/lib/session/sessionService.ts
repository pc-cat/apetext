import type { Session, CreateSessionPayload } from './types';

export async function getSessions(userId: string): Promise<Session[]> {
  return [];
}

export async function createSession(
  userId: string,
  payload: CreateSessionPayload,
): Promise<Session | null> {
  // Mock successful response
  return {
    ...payload,
    id: 'mock-session-id',
    userId,
    createdAt: new Date().toISOString(),
  } as Session;
}
