import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Max workers for test execution (2 in CI, 6 locally)
export const MAX_WORKERS = process.env.CI ? 2 : 10;

const resolveConfig = {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
  extensions: [".mjs", "", ".mts", ".ts", ".jsx", ".tsx", ".json"],
};

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
  ],
  resolve: resolveConfig,
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "src/**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/types/**",
      ],
    },
    // Use different test projects for client and server tests
    projects: [
      {
        plugins: [
          react({
            jsxRuntime: "automatic",
          }),
        ],
        test: {
          name: "client",
          environment: "happy-dom",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            "src/client/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
          ],
          maxWorkers: MAX_WORKERS,
        },
        resolve: resolveConfig,
      },
      {
        test: {
          name: "server",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          globalSetup: ["./vitest.global-setup.ts"],
          include: [
            "src/server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
          ],
          // Pool options for server tests
          pool: "forks", // Use forks for native modules
          fileParallelism: true, // Enable parallel execution
          maxWorkers: MAX_WORKERS,
          //isolate: true, // Isolate test files
        },
        resolve: resolveConfig,
      },
      {
        test: {
          name: "shared",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            "src/shared/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
          ],
          maxWorkers: MAX_WORKERS,
        },
        resolve: resolveConfig,
      },
      {
        test: {
          name: "cli",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/cli/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
          pool: "forks", // Use forks for filesystem operations
          fileParallelism: true, // Enable parallel execution
          maxWorkers: MAX_WORKERS,
          isolate: true, // Isolate test files
        },
        resolve: resolveConfig,
      },
    ],
  },
});
