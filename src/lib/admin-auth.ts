import { scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Salted scrypt hash of the owner-chosen admin passcode. Only the one-way hash
 * is committed, never the passcode itself. The `ADMIN_TOKEN` environment
 * variable keeps working too, and an `ADMIN_PASSCODE_HASH` env var
 * ("<saltHex>:<hashHex>") replaces this default when set.
 */
const DEFAULT_PASSCODE_HASH =
  "9147e466c70361b0766b80736189b6c9:984777c199e613ab30b867cb3657e287bb4f9f11e5206eb064c090c4b5eb7624";

const SCRYPT_OPTS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the submitted passcode matches ADMIN_TOKEN or the configured passcode hash. */
export function isValidAdminPasscode(input: string): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (token && safeEqual(Buffer.from(input), Buffer.from(token))) return true;

  const [saltHex, hashHex] = (process.env.ADMIN_PASSCODE_HASH || DEFAULT_PASSCODE_HASH).split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(input, Buffer.from(saltHex, "hex"), expected.length, SCRYPT_OPTS);
  return safeEqual(actual, expected);
}
