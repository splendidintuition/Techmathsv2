import { randomBytes, scryptSync } from "node:crypto";
import { afterEach, expect, test } from "vitest";
import { isValidAdminPasscode } from "@/lib/admin-auth";

afterEach(() => {
  delete process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_PASSCODE_HASH;
});

test("accepts ADMIN_TOKEN or the hashed passcode, rejects others", () => {
  const salt = randomBytes(16);
  const hash = scryptSync("sample-pass", salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  process.env.ADMIN_PASSCODE_HASH = `${salt.toString("hex")}:${hash.toString("hex")}`;
  process.env.ADMIN_TOKEN = "env-token-value";

  expect(isValidAdminPasscode("sample-pass")).toBe(true);
  expect(isValidAdminPasscode("env-token-value")).toBe(true);
  expect(isValidAdminPasscode("ADMIN")).toBe(false);
  expect(isValidAdminPasscode("Sample-pass")).toBe(false);
});
