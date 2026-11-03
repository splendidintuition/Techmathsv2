import { getDb, dbPath } from "../src/lib/db";
import { seedContent } from "../src/lib/seed";

/** Initialise the configured database without replacing existing content. */
const db = getDb();
try {
  const { inserted, skipped } = seedContent(db);
  db.pragma("wal_checkpoint(FULL)");
  console.log(`Seeded ${dbPath()}: ${inserted} inserted, ${skipped} existing rows preserved.`);
} finally {
  db.close();
}
