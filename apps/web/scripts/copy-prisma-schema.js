#!/usr/bin/env node

import { copyFileSync, mkdirSync, cpSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Create dist/prisma directory
mkdirSync(join(rootDir, 'dist/prisma'), { recursive: true });

// Copy schema.prisma
copyFileSync(
  join(rootDir, 'prisma/schema.prisma'),
  join(rootDir, 'dist/prisma/schema.prisma')
);

// Copy migrations directory
cpSync(
  join(rootDir, 'prisma/migrations'),
  join(rootDir, 'dist/prisma/migrations'),
  { recursive: true }
);

console.log('✓ Copied Prisma schema and migrations to dist/');
