import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export async function createSession(userId: string) {
  const sessionId = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      id: sessionId,
      userId,
      expiresAt,
    })
    .returning({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    });

  return session;
}

export async function getSession(sessionId: string) {
  const [session] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}