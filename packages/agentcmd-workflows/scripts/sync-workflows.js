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

      // Extract and merge imports from package and generated types
      const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?\r?\n?/g;
      const packagePaths = [
        '../../../packages/agentcmd-workflows/dist/index.js',
        '../../../packages/agentcmd-workflows/dist'
      ];
      const generatedPath = '../../generated/slash-commands';

      const namedExports = new Set();
      let hasRelevantImports = false;

      // Extract named exports from relevant imports
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const [fullMatch, exports, source] = match;

        if (packagePaths.includes(source) || source === generatedPath) {
          hasRelevantImports = true;
          // Parse named exports
          exports.split(',').forEach(exp => {
            const trimmed = exp.trim();
            if (trimmed) namedExports.add(trimmed);
          });
        }
      }

      if (hasRelevantImports) {
        // Remove old imports from package and generated paths
        content = content.replace(
          new RegExp(
            `import\\s*\\{[^}]+\\}\\s*from\\s*["'](${packagePaths.map(p => p.replace(/\//g, '\\/')).join('|')}|${generatedPath.replace(/\//g, '\\/')})["'];?\\r?\\n?`,
            'g'
          ),
          ''
        );

        // Create merged import
        const sortedExports = Array.from(namedExports).sort().join(', ');
        const mergedImport = `import { ${sortedExports} } from "agentcmd-workflows";\n`;

        // Prepend merged import at top (after any comments)
        const firstImportMatch = content.match(/^((?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*)/);
        const leadingComments = firstImportMatch ? firstImportMatch[1] : '';
        const restOfContent = content.slice(leadingComments.length);
        content = leadingComments + mergedImport + '\n' + restOfContent.trimStart();
      }

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
