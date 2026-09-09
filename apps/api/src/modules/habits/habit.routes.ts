import { Router } from "express";
import {
  adoptHabit,
  archiveUserHabit,
  deleteUserHabit,
  getCatalogHabitById,
  getUserHabitById,
  listCatalogHabits,
  listUserHabits,
  reorderUserHabits,
  restoreUserHabit,
} from "./habit.service.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  adoptHabitSchema,
  reorderHabitsSchema,
} from "./habit.validation.js";

const router = Router();

router.get("/catalog", async (_req, res, next) => {
  try {
    const habits = await listCatalogHabits();

    res.json({
      habits,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = adoptHabitSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });
      return;
    }

    const userHabit = await adoptHabit(
      req.user!.id,
      parsed.data.habitId,
    );

    res.status(201).json({
      habit: userHabit,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const habits = await listUserHabits(req.user!.id);

    res.json({
      habits,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:habitId/archive", requireAuth, async (req, res, next) => {
  try {
    const habit = await archiveUserHabit(
      req.user!.id,
      req.params.habitId as string,
    );

    res.json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:habitId/restore", requireAuth, async (req, res, next) => {
  try {
    const habit = await restoreUserHabit(
      req.user!.id,
      req.params.habitId as string,
    );

    res.json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:habitId", requireAuth, async (req, res, next) => {
  try {
    await deleteUserHabit(
      req.user!.id,
      req.params.habitId as string,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch("/reorder", requireAuth, async (req, res, next) => {
  try {
    const parsed = reorderHabitsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
        },
      });
      return;
    }

    const habits = await reorderUserHabits(
      req.user!.id,
      parsed.data.habitIds,
    );

    res.json({
      habits,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:habitId", requireAuth, async (req, res, next) => {
  try {
    const habit = await getUserHabitById(
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

    res.json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/catalog/:habitId", async (req, res, next) => {
  try {
    const habit = await getCatalogHabitById(req.params.habitId);

    if (!habit) {
      res.status(404).json({
        error: {
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
      });
      return;
    }

    res.json({
      habit,
    });
  } catch (error) {
    next(error);
  }
});

export default router;