import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { loginUser } from "../modules/auth/auth.service.js";

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
        email: "me-test@example.com",
        createdAt: expect.any(String),
      },
    });

    expect(meResponse.body.user).not.toHaveProperty("passwordHash");
    expect(meResponse.body.user).not.toHaveProperty("password");
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

describe("loginUser", () => {
  it("logs in with valid credentials", async () => {
    const email = `login-valid-${Date.now()}@example.com`;
    const password = "password123";

    await request(app).post("/api/v1/auth/register").send({
      email,
      password,
    });

    const result = await loginUser({
      email,
      password,
    });

    expect(result.user.email).toBe(email);
    expect(result.user.id).toEqual(expect.any(String));
    expect(result.session.id).toEqual(expect.any(String));
    expect(result.session.userId).toBe(result.user.id);

    await db.delete(users).where(eq(users.email, email));
  });

  it("rejects an incorrect password", async () => {
    const email = `login-wrong-password-${Date.now()}@example.com`;
    const password = "password123";

    await request(app).post("/api/v1/auth/register").send({
      email,
      password,
    });

    await expect(
      loginUser({
        email,
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

    await db.delete(users).where(eq(users.email, email));
  });

  it("rejects a nonexistent user", async () => {
    await expect(
      loginUser({
        email: `nonexistent-${Date.now()}@example.com`,
        password: "password123",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with valid credentials", async () => {
    const email = `route-login-${Date.now()}@example.com`;
    const password = "password123";

    await request(app).post("/api/v1/auth/register").send({
      email,
      password,
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email,
      password,
    });

    expect(response.status).toBe(200);

    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"][0]).toContain("session=");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");

    expect(response.body.user).toMatchObject({
      id: expect.any(String),
      email,
    });

    await db.delete(users).where(eq(users.email, email));
  });

  it("rejects incorrect credentials", async () => {
    const email = `route-login-wrong-${Date.now()}@example.com`;

    await request(app).post("/api/v1/auth/register").send({
      email,
      password: "password123",
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "wrong-password",
    });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });

    await db.delete(users).where(eq(users.email, email));
  });

  it("rejects invalid login data", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
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

describe("POST /api/v1/auth/logout", () => {
  it("invalidates the current session", async () => {
    const email = `logout-${Date.now()}@example.com`;
    const password = "password123";

    const loginResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
      });

    expect(loginResponse.status).toBe(201);

    const cookies = loginResponse.headers["set-cookie"];

    const beforeLogout = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookies);

    expect(beforeLogout.status).toBe(200);

    const logoutResponse = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookies);

    expect(logoutResponse.status).toBe(204);

    const afterLogout = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookies);

    expect(afterLogout.status).toBe(401);

    await db.delete(users).where(eq(users.email, email));
  });

  it("rejects logout without authentication", async () => {
    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });
});

describe("logout", () => {
  it("logs out an authenticated user and invalidates the session", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent
      .post("/api/v1/auth/register")
      .send({
        email: `logout-${Date.now()}@example.com`,
        password: "password123",
      });

    expect(registerResponse.status).toBe(201);

    const meBeforeLogout = await agent.get("/api/v1/auth/me");

    expect(meBeforeLogout.status).toBe(200);

    const logoutResponse = await agent.post("/api/v1/auth/logout");

    expect(logoutResponse.status).toBe(204);

    const meAfterLogout = await agent.get("/api/v1/auth/me");

    expect(meAfterLogout.status).toBe(401);
    expect(meAfterLogout.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("rejects logout without authentication", async () => {
    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });
});