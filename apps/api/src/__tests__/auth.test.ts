import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const testEmail = "auth-test@example.com";

afterAll(async () => {
  await db.delete(users).where(eq(users.email, testEmail));
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: testEmail,
      password: "password123",
    });

    expect(response.status).toBe(201);

    expect(response.body.user).toMatchObject({
      email: testEmail,
    });

    expect(response.body.user.id).toEqual(expect.any(String));
    expect(response.body.user.createdAt).toEqual(expect.any(String));

    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate email", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: testEmail,
      password: "password123",
    });

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      error: {
        code: "USER_ALREADY_EXISTS",
        message: "An account with this email already exists",
      },
    });
  });

  it("rejects invalid registration data", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: "not-an-email",
      password: "123",
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });
});