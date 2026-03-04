import { eq, desc, asc, isNull } from 'drizzle-orm';
import { getDatabase, getSqliteDb } from './client';
import { chatSessions, chatMessages } from './schema';
import type { ChatMessage } from '../llm/chat';

export type SessionSummary = {
  id: number;
  createdAt: string;
  updatedAt: string;
  preview: string;
};

export async function createSession(dreamId?: number): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = await db.insert(chatSessions).values({
    dreamId: dreamId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return result.lastInsertRowId as number;
}

export async function touchSession(sessionId: number): Promise<void> {
  const db = getDatabase();
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(chatSessions.id, sessionId));
}

export async function saveMessage(
  sessionId: number,
  role: string,
  content: string,
): Promise<void> {
  const db = getDatabase();
  await db.insert(chatMessages).values({
    sessionId,
    role,
    content,
    createdAt: new Date().toISOString(),
  });
}

export async function loadSessionMessages(sessionId: number): Promise<ChatMessage[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.id));

  return rows.map((row) => ({
    id: String(row.id),
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: new Date(row.createdAt).getTime(),
  }));
}

export async function getDreamSessions(dreamId: number): Promise<SessionSummary[]> {
  const sqlite = getSqliteDb();
  if (!sqlite) return [];

  const rows = await sqlite.getAllAsync<{
    id: number;
    created_at: string;
    updated_at: string;
    preview: string | null;
  }>(
    `SELECT s.id, s.created_at, s.updated_at,
       (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'user' ORDER BY id ASC LIMIT 1) as preview
     FROM chat_sessions s
     WHERE s.dream_id = ?
     ORDER BY s.updated_at DESC`,
    [dreamId],
  );

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    preview: r.preview ? r.preview.slice(0, 60) : '',
  }));
}

export async function getOpenEndedSessions(limit = 50): Promise<SessionSummary[]> {
  const sqlite = getSqliteDb();
  if (!sqlite) return [];

  const rows = await sqlite.getAllAsync<{
    id: number;
    created_at: string;
    updated_at: string;
    preview: string | null;
  }>(
    `SELECT s.id, s.created_at, s.updated_at,
       (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'user' ORDER BY id ASC LIMIT 1) as preview
     FROM chat_sessions s
     WHERE s.dream_id IS NULL
     ORDER BY s.updated_at DESC
     LIMIT ?`,
    [limit],
  );

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    preview: r.preview ? r.preview.slice(0, 60) : '',
  }));
}

export async function deleteSession(sessionId: number): Promise<void> {
  const db = getDatabase();
  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
}
