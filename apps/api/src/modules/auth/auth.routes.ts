import { Router } from "express";

import { registerSchema } from "./auth.validation.js";
import { registerUser } from "./auth.service.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const user = await registerUser(input);

    res.status(201).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;