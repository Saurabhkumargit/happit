import { describe, expect, it } from "vitest";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  createSession,
  deleteSession,
  getSession,
} from "../lib/session.js";

describe("session utilities", () => {
  it("creates and retrieves a session", async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: `session-test-${Date.now()}@example.com`,
        passwordHash: "test-hash",
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    const session = await createSession(user.id);

    expect(session.id).toEqual(expect.any(String));
    expect(session.id.length).toBe(64);
    expect(session.userId).toBe(user.id);
    expect(session.expiresAt).toBeInstanceOf(Date);

    const retrievedSession = await getSession(session.id);

    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.userId).toBe(user.id);

    await deleteSession(session.id);
    await db.delete(users).where(eq(users.id, user.id));
  });

  it("returns null for an unknown session", async () => {
    const session = await getSession("does-not-exist");

    expect(session).toBeNull();
  });
});