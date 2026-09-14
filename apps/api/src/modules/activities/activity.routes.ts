import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import {
  createActivitySchema,
  updateActivitySchema,
  activityHistoryQuerySchema,
  activityIdParamSchema,
} from "./activity.validation.js";

import {
  createActivity,
  deleteActivity,
  getActivityById,
  listActivities,
  updateActivity,
} from "./activity.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = activityHistoryQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const activities = await listActivities(req.user!.id, parsed.data);

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
    const parsed = activityIdParamSchema.safeParse(req.params.activityId);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const activity = await getActivityById(req.user!.id, parsed.data);

    res.status(200).json({
      data: {
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:activityId", requireAuth, async (req, res, next) => {
  try {
    const parsedId = activityIdParamSchema.safeParse(req.params.activityId);

    if (!parsedId.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const parsedBody = updateActivitySchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    const activity = await updateActivity(
      req.user!.id,
      parsedId.data,
      parsedBody.data,
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

router.delete("/:activityId", requireAuth, async (req, res, next) => {
  try {
    const parsedId = activityIdParamSchema.safeParse(req.params.activityId);

    if (!parsedId.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });

      return;
    }

    await deleteActivity(req.user!.id, parsedId.data);

    res.status(204).send();
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
