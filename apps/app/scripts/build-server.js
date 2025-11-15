#!/usr/bin/env node
import { build } from "esbuild";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync, mkdirSync, cpSync, rmSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

console.log("Building server with esbuild...\n");

try {
  // 1. Build server bundle
  await build({
    entryPoints: [join(rootDir, "src/server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outfile: join(rootDir, "dist/server/index.js"),
    // External dependencies that must stay external (native modules, binaries)
    external: [
      "@prisma/client", // Binary database driver
      "prisma", // Prisma CLI
      ".prisma/client", // Generated Prisma client
      "node-pty", // Native terminal module
    ],
    packages: "external", // Don't bundle node_modules (prevents dynamic require errors)
    sourcemap: true,
    minify: false, // Keep readable for debugging
    logLevel: "info",
  });

  console.log("✓ Server bundle created: dist/server/index.js\n");

  // 2. Copy Prisma assets
  console.log("Copying Prisma assets...");
  const prismaDistDir = join(rootDir, "dist/prisma");
  mkdirSync(prismaDistDir, { recursive: true });

  copyFileSync(
    join(rootDir, "prisma/schema.prisma"),
    join(prismaDistDir, "schema.prisma")
  );

  // Clean old migrations to prevent stale migrations
  rmSync(join(prismaDistDir, "migrations"), { recursive: true, force: true });

  cpSync(
    join(rootDir, "prisma/migrations"),
    join(prismaDistDir, "migrations"),
    { recursive: true }
  );

  console.log("✓ Copied Prisma schema and migrations\n");

  // 3. Copy workflow loader (next to bundled index.js)
  console.log("Copying workflow loader...");
  const loaderDistDir = join(rootDir, "dist/server");
  mkdirSync(loaderDistDir, { recursive: true });

  copyFileSync(
    join(
      rootDir,
      "src/server/domain/workflow/services/engine/definitions/workflowLoader.mjs"
    ),
    join(loaderDistDir, "workflowLoader.mjs")
  );

  console.log("✓ Copied workflowLoader.mjs\n");
  console.log("Server build complete!");
} catch (error) {
  console.error("Server build failed:", error);
  process.exit(1);
}
