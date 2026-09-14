import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import {
  createActivitySchema,
  activityHistoryQuerySchema,
  activityIdParamSchema,
} from "./activity.validation.js";

import {
  createActivity,
  getActivityById,
  listActivities,
} from "./activity.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = activityHistoryQuerySchema.safeParse(
      req.query,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const activities = await listActivities(
      req.user!.id,
      parsed.data,
    );

    res.status(200).json({
      data: {
        activities,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:activityId", requireAuth, async (req, res, next) => {
  try {
    const parsed = activityIdParamSchema.safeParse(
      req.params.activityId,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const activity = await getActivityById(
      req.user!.id,
      parsed.data,
    );

    res.status(200).json({
      data: {
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
});

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