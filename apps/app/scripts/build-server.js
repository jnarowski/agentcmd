#!/usr/bin/env node
import { build } from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('Building server with esbuild...');

try {
  await build({
    entryPoints: [join(rootDir, 'src/server/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: join(rootDir, 'dist/server/index.js'),
    // External dependencies that must stay external
    external: [
      '@prisma/client',     // Binary database driver
      'prisma',             // Prisma CLI
      '.prisma/client',     // Generated Prisma client
      'node-pty',           // Native terminal module
      './node_modules/*',   // Externalize node_modules
    ],
    packages: 'external',  // Don't bundle node_modules
    sourcemap: true,
    minify: false,  // Keep readable for debugging
    logLevel: 'info',
  });

  console.log('✓ Server bundle created: dist/server/index.js');
} catch (error) {
  console.error('Server build failed:', error);
  process.exit(1);
}
