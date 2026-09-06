import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

export async function deleteAccount(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}