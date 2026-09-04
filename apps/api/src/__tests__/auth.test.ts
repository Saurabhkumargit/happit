import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, or } from "drizzle-orm";

const testEmail = "auth-test@example.com";

afterAll(async () => {
  await db
    .delete(users)
    .where(
      or(
        eq(users.email, "auth-test@example.com"),
        eq(users.email, "me-test@example.com"),
      ),
    );
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: testEmail,
      password: "password123",
    });

    expect(response.status).toBe(201);

    expect(response.headers["set-cookie"]).toBeDefined();

    expect(response.headers["set-cookie"][0]).toContain("session=");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");

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

describe("authenticated requests", () => {
  it("allows an authenticated user to access /me", async () => {
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "me-test@example.com",
        password: "password123",
      });

    expect(registerResponse.status).toBe(201);

    const cookies = registerResponse.headers["set-cookie"];

    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain("session=");
    expect(cookies[0]).toContain("HttpOnly");

    const meResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookies);

    expect(meResponse.status).toBe(200);

    expect(meResponse.body).toEqual({
      user: {
        id: expect.any(String),
      },
    });
  });

  it("rejects requests without a session", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });
});