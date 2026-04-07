/**
 * Shared session type — used by API routes, the service layer,
 * the typing frontend, and the dashboard.
 */
export interface Session {
  id:          string;
  userId:      string;
  wpm:         number;
  raw:         number;
  accuracy:    number;
  consistency: number;
  chars:       number;
  time:        number;  // seconds
  text:        string;
  createdAt:   string;  // ISO-8601
}

/** Shape posted from the client after finishing a test */
export type CreateSessionPayload = Omit<Session, 'id' | 'userId' | 'createdAt'>;
