#!/usr/bin/env node

import { build } from "esbuild";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync, copyFileSync, mkdirSync, cpSync, rmSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, "package.json"), "utf-8")
);
const VERSION = packageJson.version;

console.log(`Building CLI v${VERSION} with esbuild...\n`);

async function buildCLI() {
  try {
    // 1. Build CLI bundle
    await build({
      entryPoints: [join(rootDir, "src/cli/index.ts")],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      outfile: join(rootDir, "dist/cli.js"),
      // Inline version at build time
      define: {
        __CLI_VERSION__: `"${VERSION}"`,
      },
      // Bundle all dependencies except native bindings and server code
      // This makes the CLI work with npx (no global install needed)
      external: [
        "@prisma/client", // Native bindings
        "prisma", // CLI tool with migrations
        ".prisma/client", // Generated at runtime
        "node-pty", // Native bindings
        "../../server/index.js", // Server code (shipped in dist/, loaded via dynamic import)
      ],
      // packages: 'external' removed - bundle everything else for npx compatibility
      banner: {
        js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
      },
      sourcemap: true,
      minify: false,
      logLevel: "info",
    });

    console.log("✓ CLI bundle created: dist/cli.js\n");

    // 2. Build CLI server bundle
    console.log("Building CLI server bundle with esbuild...");

    await build({
      entryPoints: [join(rootDir, "src/server/index.ts")],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      outfile: join(rootDir, "package/dist/server/index.js"),
      // External dependencies that must stay external (native modules, binaries)
      external: [
        "@prisma/client", // Binary database driver
        "prisma", // Prisma CLI
        ".prisma/client", // Generated Prisma client
        "node-pty", // Native terminal module
      ],
      // NOTE: NO 'packages: external' - bundle everything for CLI distribution
      sourcemap: true,
      minify: false, // Keep readable for debugging
      logLevel: "info",
    });

    console.log("✓ CLI server bundle created: package/dist/server/index.js\n");

    // 3. Copy Prisma assets to package/dist
    console.log("Copying Prisma assets...");
    const prismaDistDir = join(rootDir, "package/dist/prisma");
    mkdirSync(prismaDistDir, { recursive: true });

    copyFileSync(
      join(rootDir, "prisma/schema.prisma"),
      join(prismaDistDir, "schema.prisma")
    );

    // Clean old migrations and copy fresh
    const migrationsDistDir = join(prismaDistDir, "migrations");
    rmSync(migrationsDistDir, { recursive: true, force: true });

    cpSync(join(rootDir, "prisma/migrations"), migrationsDistDir, {
      recursive: true,
      filter: (src) => !src.endsWith('.db') && !src.includes('.db-')
    });

    // Clean any stray database files from package/dist
    rmSync(join(rootDir, "package/dist/**/*.db"), { force: true, glob: true });
    rmSync(join(rootDir, "package/dist/**/*.db-*"), { force: true, glob: true });

    console.log("✓ Copied Prisma schema and migrations (excluded .db files)\n");

    // 4. Copy workflow loader to package/dist (next to bundled index.js)
    console.log("Copying workflow loader...");
    const loaderDistDir = join(rootDir, "package/dist/server");
    mkdirSync(loaderDistDir, { recursive: true });

    copyFileSync(
      join(
        rootDir,
        "src/server/domain/workflow/services/engine/definitions/workflowLoader.mjs"
      ),
      join(loaderDistDir, "workflowLoader.mjs")
    );

    console.log("✓ Copied workflowLoader.mjs\n");

    // 5. Build production start scripts
    console.log("Building start scripts...");
    const scriptsDistDir = join(rootDir, "dist/scripts");
    mkdirSync(scriptsDistDir, { recursive: true });

    // Build start.ts - production start script
    await build({
      entryPoints: [join(rootDir, "src/scripts/start.ts")],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      outfile: join(scriptsDistDir, "start.js"),
      external: [
        "@prisma/client",
        "prisma",
        ".prisma/client",
        "node-pty",
      ],
      banner: {
        js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
      },
      sourcemap: true,
      minify: false,
      logLevel: "info",
    });

    console.log("✓ Built dist/scripts/start.js\n");
    console.log("CLI build complete!");
  } catch (error) {
    console.error("CLI build failed:", error);
    process.exit(1);
  }
}

buildCLI();
