import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { deleteAccount } from "./account.service.js";

const router = Router();

router.delete("/", requireAuth, async (req, res, next) => {
  try {
    await deleteAccount(req.user!.id);

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

export default router;