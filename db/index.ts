import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

/**
 * The Netlify DB driver reads `NETLIFY_DB_URL` when it is constructed, and throws
 * if it is missing. `next build` imports every route module while collecting page
 * data, so constructing the client eagerly made the whole build fail anywhere the
 * variable was absent — local builds and preview deployments, which do not need a
 * database connection to be validated. Construction is deferred to first use.
 */
function createClient() {
  if (!process.env.NETLIFY_DB_URL) {
    throw new Error(
      "NETLIFY_DB_URL environment variable is not set. Provide a connection string or client to drizzle().",
    );
  }
  return drizzle({ schema });
}

type Db = ReturnType<typeof createClient>;

let client: Db | null = null;

function resolve(): Db {
  client ??= createClient();
  return client;
}

/** Lazily-connected Drizzle client. Importing this module never opens a connection. */
export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    const instance = resolve();
    const value = Reflect.get(instance as object, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function getDb(): Db {
  return resolve();
}
