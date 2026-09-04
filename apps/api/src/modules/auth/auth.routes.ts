import { Router } from "express";

import { registerSchema, loginSchema } from "./auth.validation.js";
import { loginUser, registerUser } from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { deleteSession } from "../../lib/session.js";

import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const { user, session } = await registerUser(input);

    res.cookie("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    res.status(201).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const { user, session } = await loginUser(input);

    res.cookie("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await deleteSession(req.auth!.sessionId);

    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});


router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Authentication required",
      );
    }

    res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
});


export default router;