import { PrismaClient } from "@prisma/client";
import { stripAnsiCodes } from "./utils/stripAnsiCodes";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDevelopment = process.env.NODE_ENV === "development";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
          { emit: "stdout", level: "warn" },
        ]
      : ["error"],
  });

// Pretty-print Prisma queries in development mode
if (isDevelopment) {
  prisma.$on(
    "query" as never,
    (e: { query: string; params: string; duration: number }) => {
      const colors = {
        reset: "\x1b[0m",
        cyan: "\x1b[36m",
        yellow: "\x1b[33m",
        gray: "\x1b[90m",
        green: "\x1b[32m",
      };

      // Format the query with better readability
      const formattedQuery = e.query
        .replace(/`main`\./g, "") // Remove `main`.
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      // Parse and format params (with ANSI stripping and error handling)
      let params: unknown[];
      try {
        const cleanParams = stripAnsiCodes(e.params);
        params = JSON.parse(cleanParams);
      } catch (parseError) {
        // Fallback: show raw params if unparseable
        console.error("Error parsing params:", parseError);
        console.log(
          `  ${colors.yellow}Params (raw): ${e.params}${colors.reset}`
        );
        console.log("");
        return;
      }

      const formattedParams =
        params.length > 0
          ? params
              .map((p: unknown) => {
                if (typeof p === "string") return `"${p}"`;
                if (p === null) return "null";
                if (typeof p === "object") return JSON.stringify(p);
                return String(p);
              })
              .join(", ")
          : "";

      console.log(
        `${colors.cyan}prisma:query${colors.reset} ${colors.gray}(${e.duration}ms)${colors.reset}`
      );
      console.log(`  ${colors.green}${formattedQuery}${colors.reset}`);
      if (formattedParams) {
        console.log(
          `  ${colors.yellow}Params: [${formattedParams}]${colors.reset}`
        );
      }
      console.log("");
    }
  );
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
