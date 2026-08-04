import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const SUPABASE_URL =
  "postgresql://postgres.uahzknhujfmvevymfaxm:mEGERNpMi7qwoORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

const envUrl = process.env.DATABASE_URL;
const isLocal = !envUrl || envUrl.includes("127.0.0.1") || envUrl.includes("localhost");
const databaseUrl = isLocal ? SUPABASE_URL : envUrl;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const databaseHost = (() => {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return "";
  }
})();

const isLocalHost = databaseHost === "127.0.0.1" || databaseHost === "localhost";
const shouldUseSsl =
  databaseHost.includes("supabase.com") ||
  databaseHost.includes("pooler.supabase.com") ||
  (!isLocalHost && databaseHost.length > 0);

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    max: 3,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  attempts = 5,
  delayMs = 1200,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}
