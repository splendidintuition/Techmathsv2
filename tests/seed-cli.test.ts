import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tm-seed-cli-"));
const file = path.join(directory, "content.db");
const run = () => spawnSync("npm", ["run", "db:seed"], {
  cwd: process.cwd(),
  env: { ...process.env, TECHMATHS_DB: file },
  encoding: "utf8",
  timeout: 30_000,
});

afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe("database seed command", () => {
  it("initialises a database and preserves edits on subsequent runs", () => {
    const first = run();
    expect(first.status, first.stderr).toBe(0);
    expect(first.stdout).toContain("inserted");
    expect(fs.existsSync(file)).toBe(true);

    const db = new Database(file);
    db.prepare("UPDATE services SET title = ? WHERE slug = ?").run("Operator edited title", "rack-and-stack");
    db.close();

    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toContain("0 inserted");
    const verified = new Database(file, { readonly: true });
    const row = verified.prepare("SELECT title FROM services WHERE slug = ?").get("rack-and-stack") as { title: string };
    verified.close();
    expect(row.title).toBe("Operator edited title");
  });
});
