#!/usr/bin/env node
import { build } from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('Building CLI server bundle with esbuild...');

try {
  await build({
    entryPoints: [join(rootDir, 'src/server/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: join(rootDir, 'package/dist/server/index.js'),
    // External dependencies that must stay external (native modules, binaries)
    external: [
      '@prisma/client',     // Binary database driver
      'prisma',             // Prisma CLI
      '.prisma/client',     // Generated Prisma client
      'node-pty',           // Native terminal module
    ],
    // NOTE: NO 'packages: external' - bundle everything for CLI distribution
    sourcemap: true,
    minify: false,  // Keep readable for debugging
    logLevel: 'info',
  });

  console.log('✓ CLI server bundle created: package/dist/server/index.js');
} catch (error) {
  console.error('Server build failed:', error);
  process.exit(1);
}
