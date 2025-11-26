#!/usr/bin/env node
import { generateSlashCommandTypesFromDir } from '../utils/generateSlashCommandTypes';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths relative to this file
// This file is at: src/cli/generateTemplateTypes.ts
// Templates are at: templates/.claude/commands/
// Output should be: src/generated/slash-command-types.ts

const packagesDir = join(__dirname, '../..');
const templatesDir = join(packagesDir, 'templates/.claude/commands');
const outputFile = join(packagesDir, 'src/generated/slash-command-types.ts');

console.log('📝 Generating types from templates...');
console.log(`  Input: ${templatesDir}`);
console.log(`  Output: ${outputFile}`);

try {
  await generateSlashCommandTypesFromDir(templatesDir, outputFile);
  console.log('✅ Generated src/generated/slash-command-types.ts');
} catch (error) {
  console.error('❌ Failed to generate types:', error);
  process.exit(1);
}
