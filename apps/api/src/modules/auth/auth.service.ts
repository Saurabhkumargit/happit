import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { createSession } from "../../lib/session.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import type {
  LoginInput,
  RegisterInput,
} from "./auth.validation.js";

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


export async function loginUser(input: LoginInput) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );
  }

  const passwordValid = await verifyPassword(
  input.password,
  user.passwordHash,
);

  if (!passwordValid) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );
  }

  const session = await createSession(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    session,
  };
}