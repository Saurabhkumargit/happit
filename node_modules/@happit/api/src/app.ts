import express from "express";
import cors from "cors";

import { db } from "./db/index.js";
import { systemChecks } from "./db/schema.js";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/api/v1/db-check", async (_req, res) => {
  try {
    const rows = await db.select().from(systemChecks);

    res.json({
      status: "ok",
      database: "connected",
      rows,
    });
  } catch (error) {
    console.error("Database check failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.post("/api/v1/db-check", async (_req, res) => {
  try {
    const [row] = await db
      .insert(systemChecks)
      .values({
        message: "Database write works",
      })
      .returning();

    res.status(201).json({
      status: "ok",
      database: "connected",
      row,
    });
  } catch (error) {
    console.error("Database write failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

export default app;