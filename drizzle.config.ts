import { defineConfig } from "drizzle-kit";

// Load .env.local for drizzle-kit (generate/migrate) without a dotenv dependency.
// `generate` does not need a URL; `migrate` does (supplied via .env.local).
const loadEnvFile = (
  process as unknown as { loadEnvFile?: (path?: string) => void }
).loadEnvFile;
try {
  loadEnvFile?.(".env.local");
} catch {
  // .env.local may be absent (e.g. generate-only / CI) — that's fine.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
