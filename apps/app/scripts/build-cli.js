#!/usr/bin/env node

import { build } from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const VERSION = packageJson.version;

console.log(`Building CLI v${VERSION} with esbuild...`);

async function buildCLI() {
  try {
    await build({
      entryPoints: [join(rootDir, 'src/cli/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      outfile: join(rootDir, 'dist/cli.js'),
      // Inline version at build time
      define: {
        '__CLI_VERSION__': `"${VERSION}"`,
      },
      // External all node_modules except workspace packages
      // This allows npm dependencies to resolve naturally
      external: [
        '@prisma/client',
        'prisma',
        '.prisma/client',
        'node-pty',
        // Externalize node_modules but bundle workspace packages
        './node_modules/*',
      ],
      packages: 'external',  // Don't bundle node_modules
      sourcemap: true,
      minify: false,
      logLevel: 'info',
    });
    console.log('✓ CLI bundle created: dist/cli.js');
  } catch (error) {
    console.error('CLI build failed:', error);
    process.exit(1);
  }
}

buildCLI();
