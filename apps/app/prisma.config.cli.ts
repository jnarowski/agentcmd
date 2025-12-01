// CLI-specific Prisma config (no external imports - CLI sets env vars programmatically)
// Uses plain object export - no defineConfig or prisma/config imports needed

// DATABASE_URL must be set by CLI before Prisma runs
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
};
