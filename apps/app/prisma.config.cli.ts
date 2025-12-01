// CLI-specific Prisma config (no dotenv - CLI sets env vars programmatically)
import { defineConfig } from "prisma/config";

// DATABASE_URL must be set by CLI before Prisma runs
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
