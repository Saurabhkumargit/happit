import crypto from "node:crypto";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const testEmails: string[] = [];

afterAll(async () => {
  for (const email of testEmails) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      await db.delete(users).where(eq(users.id, user.id));
    }
  }
});

async function createAuthenticatedAgent() {
  const agent = request.agent(app);

  const email = `progress-api-${crypto.randomUUID()}@example.com`;
  const password = "test-password";

  testEmails.push(email);

  await agent
    .post("/api/v1/auth/register")
    .send({
      email,
      password,
    })
    .expect(201);

  return agent;
}

let exerciseId: string | undefined;

async function getExerciseId() {
  if (exerciseId) {
    return exerciseId;
  }

  const response = await request(app).get("/api/v1/habits/catalog").expect(200);

  const exercise = response.body.habits.find(
    (habit: { key: string }) => habit.key === "exercise",
  );

  expect(exercise).toBeDefined();

  exerciseId = exercise.id as string;

  return exerciseId;
}

async function adoptExercise(agent: ReturnType<typeof request.agent>) {
  const exerciseId = await getExerciseId();

  const response = await agent
    .post("/api/v1/habits")
    .send({
      habitId: exerciseId,
    })
    .expect(201);

  return response.body.habit.id as string;
}

let sharedAgent: ReturnType<typeof request.agent>;
let sharedExerciseUserHabitId: string;

beforeAll(async () => {
  sharedAgent = await createAuthenticatedAgent();
  sharedExerciseUserHabitId = await adoptExercise(sharedAgent);
});

describe("GET /api/v1/progress/habits/:habitId", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .get("/api/v1/progress/habits/00000000-0000-0000-0000-000000000000")
      .query({
        from: "2026-09-15",
        to: "2026-09-17",
        today: "2026-09-15",
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("returns progress for the authenticated user's adopted habit", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();

    const response = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-17",
        today: "2026-09-15",
      })
      .expect(200);

    expect(response.body.data.progress).toMatchObject({
      habit: {
        key: "exercise",
        name: "Exercise",
        targetType: "DURATION",
        targetValue: 30,
        targetUnit: "minutes",
        scheduleType: "DAILY",
      },
      range: {
        from: "2026-09-15",
        to: "2026-09-17",
      },
      consistency: {
        completed: 0,
        expected: 1,
        percentage: 0,
      },
      streaks: {
        current: 0,
        longest: 0,
      },
    });

    expect(response.body.data.progress.occurrences).toHaveLength(3);

    expect(response.body.data.progress.occurrences).toEqual([
      expect.objectContaining({
        date: "2026-09-15",
        state: "INCOMPLETE",
        actualValue: 0,
        targetValue: 30,
        completionPercentage: 0,
      }),
      expect.objectContaining({
        date: "2026-09-16",
        state: "UPCOMING",
      }),
      expect.objectContaining({
        date: "2026-09-17",
        state: "UPCOMING",
      }),
    ]);
  });

  it("returns heatmap data for the authenticated user's adopted habit", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();

    const response = await agent
      .get(`/api/v1/progress/habits/${exerciseId}/heatmap`)
      .query({
        from: "2026-09-15",
        to: "2026-09-17",
        today: "2026-09-15",
      })
      .expect(200);

    expect(response.body.data.heatmap).toEqual([
      expect.objectContaining({
        date: "2026-09-15",
        state: "INCOMPLETE",
        actualValue: 0,
        targetValue: 30,
        completionPercentage: 0,
      }),
      expect.objectContaining({
        date: "2026-09-16",
        state: "UPCOMING",
        targetValue: 30,
      }),
      expect.objectContaining({
        date: "2026-09-17",
        state: "UPCOMING",
        targetValue: 30,
      }),
    ]);
  });

  it("returns overall progress for the authenticated user's active habits", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();

    const response = await agent
      .get("/api/v1/progress")
      .query({
        from: "2026-09-15",
        to: "2026-09-17",
        today: "2026-09-15",
      })
      .expect(200);

    expect(response.body.data.progress).toMatchObject({
      range: {
        from: "2026-09-15",
        to: "2026-09-17",
      },
      consistency: {
        completed: 0,
        expected: 1,
        percentage: 0,
      },
    });

    expect(response.body.data.progress.habits).toHaveLength(1);

    expect(response.body.data.progress.habits[0]).toMatchObject({
      habit: {
        id: exerciseId,
        key: "exercise",
        name: "Exercise",
        targetType: "DURATION",
        targetValue: 30,
        targetUnit: "minutes",
      },
    });
  });

  it("does not allow a user to access another user's habit progress", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const exerciseId = await getExerciseId();

    await adoptExercise(firstAgent);

    const response = await secondAgent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-17",
        today: "2026-09-15",
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "HABIT_NOT_FOUND",
        message: "Habit not found",
      },
    });
  });

  it("updates progress after creating an activity", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();

    const userHabitId = sharedExerciseUserHabitId;

    const before = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-16",
        to: "2026-09-16",
        today: "2026-09-16",
      })
      .expect(200);

    expect(before.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-16",
      state: "INCOMPLETE",
      actualValue: 0,
      targetValue: 30,
      completionPercentage: 0,
    });

    await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-16",
        source: "MANUAL",
        durationSeconds: 1800,
      })
      .expect(201);

    const after = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-16",
        to: "2026-09-16",
        today: "2026-09-16",
      })
      .expect(200);

    expect(after.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-16",
      state: "COMPLETED",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    });

    expect(after.body.data.progress.consistency).toEqual({
      completed: 1,
      expected: 1,
      percentage: 100,
    });

    expect(after.body.data.progress.streaks).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it("marks progress incomplete when API activity is below the target", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();
    const userHabitId = sharedExerciseUserHabitId;

    await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-17",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    const response = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-17",
        to: "2026-09-17",
        today: "2026-09-17",
      })
      .expect(200);

    expect(response.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-17",
      state: "INCOMPLETE",
      actualValue: 15,
      targetValue: 30,
      completionPercentage: 50,
    });

    expect(response.body.data.progress.consistency).toEqual({
      completed: 0,
      expected: 1,
      percentage: 0,
    });

    expect(response.body.data.progress.streaks).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it("aggregates multiple API activities to complete the target", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();
    const userHabitId = sharedExerciseUserHabitId;

    await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-18",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-18",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    const response = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-18",
        to: "2026-09-18",
        today: "2026-09-18",
      })
      .expect(200);

    expect(response.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-18",
      state: "COMPLETED",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    });

    expect(response.body.data.progress.consistency).toEqual({
      completed: 1,
      expected: 1,
      percentage: 100,
    });

    expect(response.body.data.progress.streaks).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it("recalculates historical progress after editing an activity", async () => {
    const agent = sharedAgent;
    const exerciseId = await getExerciseId();
    const userHabitId = sharedExerciseUserHabitId;

    const activityResponse = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-19",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    const activityId = activityResponse.body.data.activity.id as string;

    const before = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-19",
        to: "2026-09-19",
        today: "2026-09-21",
      })
      .expect(200);

    expect(before.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-19",
      state: "INCOMPLETE",
      actualValue: 15,
      targetValue: 30,
      completionPercentage: 50,
    });

    await agent
      .patch(`/api/v1/activities/${activityId}`)
      .send({
        durationSeconds: 1800,
      })
      .expect(200);

    const after = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-19",
        to: "2026-09-19",
        today: "2026-09-21",
      })
      .expect(200);

    expect(after.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-19",
      state: "COMPLETED",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    });

    expect(after.body.data.progress.streaks).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it("rejects invalid progress query dates", async () => {
  const agent = await createAuthenticatedAgent();
  const exerciseId = await getExerciseId();

  await adoptExercise(agent);

  const response = await agent
    .get(`/api/v1/progress/habits/${exerciseId}`)
    .query({
      from: "not-a-date",
      to: "2026-09-17",
      today: "2026-09-15",
    })
    .expect(400);

  expect(response.body.error).toBeDefined();
});

it("rejects invalid progress query dates", async () => {
  const agent = await createAuthenticatedAgent();
  const exerciseId = await getExerciseId();

  await adoptExercise(agent);

  const response = await agent
    .get(`/api/v1/progress/habits/${exerciseId}`)
    .query({
      from: "not-a-date",
      to: "2026-09-17",
      today: "2026-09-15",
    })
    .expect(400);

  expect(response.body.error).toBeDefined();
});

it("keeps future occurrences upcoming even when activity exists", async () => {
  const agent = await createAuthenticatedAgent();
  const exerciseId = await getExerciseId();
  const userHabitId = await adoptExercise(agent);

  await agent
    .post("/api/v1/activities")
    .send({
      userHabitId,
      activityDate: "2026-09-16",
      source: "MANUAL",
      durationSeconds: 1800,
    })
    .expect(201);

  const response = await agent
    .get(`/api/v1/progress/habits/${exerciseId}`)
    .query({
      from: "2026-09-15",
      to: "2026-09-16",
      today: "2026-09-15",
    })
    .expect(200);

  expect(response.body.data.progress.occurrences).toEqual([
    expect.objectContaining({
      date: "2026-09-15",
      state: "INCOMPLETE",
    }),
    expect.objectContaining({
      date: "2026-09-16",
      state: "UPCOMING",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    }),
  ]);

  expect(response.body.data.progress.consistency).toEqual({
    completed: 0,
    expected: 1,
    percentage: 0,
  });
});

it("returns NOT_SCHEDULED for days outside a weekday habit schedule", async () => {
  const agent = await createAuthenticatedAgent();

  const catalogResponse = await request(app)
    .get("/api/v1/habits/catalog")
    .expect(200);

  const coding = catalogResponse.body.habits.find(
    (habit: { key: string }) => habit.key === "coding",
  );

  expect(coding).toBeDefined();

  await agent
    .post("/api/v1/habits")
    .send({
      habitId: coding.id,
    })
    .expect(201);

  const response = await agent
    .get(`/api/v1/progress/habits/${coding.id}`)
    .query({
      from: "2026-09-15",
      to: "2026-09-21",
      today: "2026-09-21",
    })
    .expect(200);

  const occurrences = response.body.data.progress.occurrences;

  expect(occurrences).toHaveLength(7);

  expect(occurrences).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        date: "2026-09-15",
        state: "INCOMPLETE",
      }),
      expect.objectContaining({
        date: "2026-09-16",
        state: "INCOMPLETE",
      }),
      expect.objectContaining({
        date: "2026-09-17",
        state: "INCOMPLETE",
      }),
      expect.objectContaining({
        date: "2026-09-18",
        state: "INCOMPLETE",
      }),
      expect.objectContaining({
        date: "2026-09-19",
        state: "NOT_SCHEDULED",
      }),
      expect.objectContaining({
        date: "2026-09-20",
        state: "NOT_SCHEDULED",
      }),
      expect.objectContaining({
        date: "2026-09-21",
        state: "INCOMPLETE",
      }),
    ]),
  );

  expect(response.body.data.progress.consistency).toEqual({
    completed: 0,
    expected: 5,
    percentage: 0,
  });
});

it("uses the user's timezone when deriving the adoption start date", async () => {
  const agent = await createAuthenticatedAgent();
  const exerciseId = await getExerciseId();

  const registerResponse = await agent
    .get("/api/v1/auth/me")
    .expect(200);

  const userId = registerResponse.body.user.id as string;

  await db
    .update(users)
    .set({
      timezone: "America/Los_Angeles",
    })
    .where(eq(users.id, userId));

  const userHabitId = await adoptExercise(agent);

  await db
    .update(users)
    .set({
      timezone: "America/Los_Angeles",
    })
    .where(eq(users.id, userId));

  await db
    .update(users)
    .set({
      timezone: "America/Los_Angeles",
    })
    .where(eq(users.id, userId));

  const response = await agent
    .get(`/api/v1/progress/habits/${exerciseId}`)
    .query({
      from: "2026-09-15",
      to: "2026-09-16",
      today: "2026-09-16",
    })
    .expect(200);

  expect(response.body.data.progress.occurrences).toHaveLength(2);
  expect(response.body.data.progress.occurrences[0]).toMatchObject({
    date: "2026-09-15",
    state: "INCOMPLETE",
  });
  expect(response.body.data.progress.occurrences[1]).toMatchObject({
    date: "2026-09-16",
    state: "INCOMPLETE",
  });

  expect(userHabitId).toBeDefined();
});

it("rejects missing required query parameters", async () => {
  const agent = await createAuthenticatedAgent();
  const exerciseId = await getExerciseId();

  await adoptExercise(agent);

  const response = await agent
    .get(`/api/v1/progress/habits/${exerciseId}`)
    .query({})
    .expect(400);

  expect(response.body.error).toBeDefined();
});
});

describe("GET /api/v1/progress/habits/:habitId/heatmap", () => {
it("requires authentication", async () => {
  const response = await request(app)
    .get("/api/v1/progress/habits/00000000-0000-0000-0000-000000000000/heatmap")
    .query({
      from: "2026-09-15",
      to: "2026-09-17",
      today: "2026-09-15",
    })
    .expect(401);

  expect(response.body).toEqual({
    error: {
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    },
  });
});
});

describe("GET /api/v1/progress", () => {
it("requires authentication", async () => {
  const response = await request(app)
    .get("/api/v1/progress")
    .query({
      from: "2026-09-15",
      to: "2026-09-17",
      today: "2026-09-15",
    })
    .expect(401);

  expect(response.body).toEqual({
    error: {
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    },
  });
});
});
