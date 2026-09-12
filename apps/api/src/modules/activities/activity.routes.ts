import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { createActivity } from "./activity.service.js";
import { createActivitySchema } from "./activity.validation.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = createActivitySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const idempotencyKey = req.get("Idempotency-Key") ?? undefined;

    const activity = await createActivity(
      req.user!.id,
      parsed.data,
      idempotencyKey,
    );

    res.status(201).json({
      data: {
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;