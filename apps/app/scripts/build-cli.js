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
      // Bundle all dependencies except native bindings and server code
      // This makes the CLI work with npx (no global install needed)
      external: [
        '@prisma/client',  // Native bindings
        'prisma',          // CLI tool with migrations
        '.prisma/client',  // Generated at runtime
        'node-pty',        // Native bindings
        '../../server/index.js',  // Server code (shipped in dist/, loaded via dynamic import)
      ],
      // packages: 'external' removed - bundle everything else for npx compatibility
      banner: {
        js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
      },
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
