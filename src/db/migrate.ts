import { migrate } from "drizzle-orm/neon-http/migrator";
import { getDb } from "./client.ts";

// Apply committed ./drizzle migrations over the Neon HTTP driver (no WebSocket /
// no `ws` dependency, unlike `drizzle-kit migrate`'s serverless driver).
await migrate(getDb(), { migrationsFolder: "./drizzle" });
console.log("migrations applied");
