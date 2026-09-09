import { Router } from "express";
import {
  getCatalogHabitById,
  listCatalogHabits,
} from "./habit.service.js";

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