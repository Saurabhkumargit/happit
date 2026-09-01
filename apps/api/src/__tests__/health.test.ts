import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

describe("GET /api/v1/health", () => {
  it("returns a healthy response", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
  });
});