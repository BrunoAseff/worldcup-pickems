import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

const globalForDatabase = globalThis as typeof globalThis & {
  postgresClient?: postgres.Sql;
};

const client =
  globalForDatabase.postgresClient ??
  postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.postgresClient = client;
}

export const db = drizzle(client);
