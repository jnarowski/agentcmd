#!/usr/bin/env node

/**
 * Sync example workflows from monorepo to package templates
 *
 * Transforms imports from monorepo-relative paths to package name:
 * - from "../../../packages/agentcmd-workflows/dist" -> from "agentcmd-workflows"
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const SOURCE_DIR = join(PACKAGE_ROOT, '../../.agent/workflows/definitions');
const TARGET_DIR = join(PACKAGE_ROOT, 'templates/.agent/workflows/definitions');

async function syncWorkflows() {
  try {
    // Ensure target directory exists
    await mkdir(TARGET_DIR, { recursive: true });

    // Read all example workflow files
    const files = await readdir(SOURCE_DIR);
    const exampleFiles = files.filter(f => f.startsWith('example-') && f.endsWith('.ts'));

    console.log(`Syncing ${exampleFiles.length} workflow examples...`);

    for (const file of exampleFiles) {
      const sourcePath = join(SOURCE_DIR, file);
      const targetPath = join(TARGET_DIR, file);

      // Read source file
      let content = await readFile(sourcePath, 'utf-8');

      // Transform imports
      content = content
        .replace(
          /from ["']\.\.\/\.\.\/\.\.\/packages\/agentcmd-workflows\/dist\/index\.js["']/g,
          'from "agentcmd-workflows"'
        )
        .replace(
          /from ["']\.\.\/\.\.\/\.\.\/packages\/agentcmd-workflows\/dist["']/g,
          'from "agentcmd-workflows"'
        );

      // Write to target
      await writeFile(targetPath, content, 'utf-8');
      console.log(`  ✓ ${file}`);
    }

    console.log(`\nSuccessfully synced ${exampleFiles.length} workflow examples`);
  } catch (error) {
    console.error('Error syncing workflows:', error);
    process.exit(1);
  }
}

syncWorkflows();
