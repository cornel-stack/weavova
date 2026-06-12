import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Lazy, server-only Drizzle client over the Neon HTTP driver. It does NOT
// connect or throw at import time — so the app builds without a DATABASE_URL
// (CI / static build). A missing URL only errors when a query actually runs.

let cached: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a pooled Neon connection string to .env.local.",
    );
  }
  cached = drizzle(neon(url));
  return cached;
}
