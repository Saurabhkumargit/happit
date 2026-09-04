import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { hashPassword } from "../../lib/password.js";
import type { RegisterInput } from "./auth.validation.js";
import { createSession } from "../../lib/session.js";

export async function registerUser(input: RegisterInput) {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new AppError(
      409,
      "USER_ALREADY_EXISTS",
      "An account with this email already exists",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    });

  const session = await createSession(user.id);

  return {
    user,
    session,
  };
}