import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password.js";

describe("password utilities", () => {
  it("hashes a password and verifies the correct password", async () => {
    const password = "correct-password";

    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(await verifyPassword(password, passwordHash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashPassword("correct-password");

    expect(await verifyPassword("wrong-password", passwordHash)).toBe(false);
  });

  it("produces different hashes for the same password", async () => {
    const password = "same-password";

    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
    expect(await verifyPassword(password, firstHash)).toBe(true);
    expect(await verifyPassword(password, secondHash)).toBe(true);
  });
});