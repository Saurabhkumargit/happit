import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

describe("Account API", () => {
  it("deletes the authenticated account", async () => {
    const email = `delete-${Date.now()}@example.com`;
    const password = "password123";

    const agent = request.agent(app);

    await agent
      .post("/api/v1/auth/register")
      .send({ email, password })
      .expect(201);

    const deleteResponse = await agent
      .delete("/api/v1/account")
      .expect(204);

    expect(deleteResponse.body).toEqual({});

    await agent
      .get("/api/v1/auth/me")
      .expect(401);
  });

  it("prevents login after the account has been deleted", async () => {
    const email = `delete-login-${Date.now()}@example.com`;
    const password = "password123";

    const agent = request.agent(app);

    await agent
      .post("/api/v1/auth/register")
      .send({ email, password })
      .expect(201);

    await agent
      .delete("/api/v1/account")
      .expect(204);

    await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(401);
  });

  it("rejects account deletion when unauthenticated", async () => {
    await request(app)
      .delete("/api/v1/account")
      .expect(401);
  });
});