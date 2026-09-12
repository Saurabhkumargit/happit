import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import accountRouter from "./modules/account/account.routes.js";
import habitRouter from "./modules/habits/habit.routes.js";
import activityRouter from "./modules/activities/activity.routes.js";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/account", accountRouter);
app.use("/api/v1/habits", habitRouter);
app.use("/api/v1/activities", activityRouter);

app.use(errorHandler);

export default app;