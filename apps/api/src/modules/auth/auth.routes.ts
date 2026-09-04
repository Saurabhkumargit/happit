import { Router } from "express";

import { registerSchema } from "./auth.validation.js";
import { registerUser } from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";

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

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    // We'll replace this with a database lookup shortly.
    res.json({
      user: {
        id: req.user!.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;