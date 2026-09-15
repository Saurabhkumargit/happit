import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import {
  getHabitProgress,
  getOverallProgress,
} from "./progress.service.js";
import {
  progressHabitParamsSchema,
  progressQuerySchema,
} from "./progress.validation.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsedQuery = progressQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });
      return;
    }

    const progress = await getOverallProgress(
      req.user!.id,
      parsedQuery.data,
    );

    res.status(200).json({
      data: {
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/habits/:habitId/heatmap", requireAuth, async (req, res, next) => {
  try {
    const parsedParams = progressHabitParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });
      return;
    }

    const parsedQuery = progressQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });
      return;
    }

    const progress = await getHabitProgress(
      req.user!.id,
      parsedParams.data.habitId,
      parsedQuery.data,
    );

    res.status(200).json({
      data: {
        heatmap: progress.heatmap,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/habits/:habitId",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsedParams =
        progressHabitParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
          },
        });

        return;
      }

      const parsedQuery =
        progressQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
          },
        });

        return;
      }

      const progress = await getHabitProgress(
        req.user!.id,
        parsedParams.data.habitId,
        parsedQuery.data,
      );

      res.status(200).json({
        data: {
          progress,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;