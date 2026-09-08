import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import {
  habitSchema,
  listHabitsQuerySchema,
  reorderHabitsSchema,
} from "./habit.validation.js";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getHabit,
  listHabits,
  reorderHabits,
  restoreHabit,
  updateHabit,
} from "./habit.service.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = habitSchema.parse(req.body);

    const habit = await createHabit(req.user!.id, input);

    res.status(201).json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const query = listHabitsQuerySchema.parse(req.query);

    const habits = await listHabits(req.user!.id, query.status);

    res.status(200).json({
      habits,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/reorder", requireAuth, async (req, res, next) => {
  try {
    const { habitIds } = reorderHabitsSchema.parse(req.body);

    const habits = await reorderHabits(
      req.user!.id,
      habitIds,
    );

    if (!habits) {
      res.status(404).json({
        error: {
          code: "HABIT_NOT_FOUND",
          message: "One or more habits were not found",
        },
      });

      return;
    }

    res.status(200).json({
      habits,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:habitId", requireAuth, async (req, res, next) => {
  try {
    const habit = await getHabit(
      req.user!.id,
      req.params.habitId as string,
    );

    if (!habit) {
      res.status(404).json({
        error: {
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
      });

      return;
    }

    res.status(200).json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:habitId", requireAuth, async (req, res, next) => {
  try {
    const input = habitSchema.parse(req.body);

    const habit = await updateHabit(
      req.user!.id,
      req.params.habitId as string,
      input,
    );

    if (!habit) {
      res.status(404).json({
        error: {
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
      });

      return;
    }

    res.status(200).json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:habitId/archive",
  requireAuth,
  async (req, res, next) => {
    try {
      const habit = await archiveHabit(
        req.user!.id,
        req.params.habitId as string,
      );

      if (!habit) {
        res.status(404).json({
          error: {
            code: "HABIT_NOT_FOUND",
            message: "Habit not found",
          },
        });

        return;
      }

      res.status(200).json({
        habit,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:habitId/restore",
  requireAuth,
  async (req, res, next) => {
    try {
      const habit = await restoreHabit(
        req.user!.id,
        req.params.habitId as string,
      );

      if (!habit) {
        res.status(404).json({
          error: {
            code: "HABIT_NOT_FOUND",
            message: "Habit not found",
          },
        });

        return;
      }

      res.status(200).json({
        habit,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:habitId", requireAuth, async (req, res, next) => {
  try {
    const habit = await deleteHabit(
      req.user!.id,
      req.params.habitId as string,
    );

    if (!habit) {
      res.status(404).json({
        error: {
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
      });

      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;