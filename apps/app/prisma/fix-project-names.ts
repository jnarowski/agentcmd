#!/usr/bin/env tsx
/**
 * Fix script to trim project names and update session paths
 *
 * This script:
 * 1. Finds all projects with leading/trailing spaces in names
 * 2. Trims the project names
 * 3. Updates associated session paths to reflect the corrected names
 *
 * Run with: pnpm tsx prisma/fix-project-names.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting project name fix...\n');

  let projectsFixed = 0;
  let sessionsFixed = 0;

  // Step 1: Fix project names with leading/trailing spaces
  console.log('Step 1: Checking for project names with spaces...');
  const projects = await prisma.project.findMany();

  for (const project of projects) {
    const trimmedName = project.name.trim();

    // Check if name has leading/trailing spaces
    if (trimmedName !== project.name) {
      console.log(`  Found project with spaces: "${project.name}" (ID: ${project.id})`);
      console.log(`  Trimming to: "${trimmedName}"`);

      // Update project name
      await prisma.project.update({
        where: { id: project.id },
        data: { name: trimmedName }
      });

      projectsFixed++;
    }
  }

  console.log(projectsFixed > 0 ? `  Fixed ${projectsFixed} project(s)\n` : '  No projects with spaces found\n');

  // Step 2: Fix session paths with trailing spaces
  console.log('Step 2: Checking for session paths with spaces...');
  const allSessions = await prisma.agentSession.findMany();

  for (const session of allSessions) {
    if (session.session_path) {
      // Fix session paths that have trailing spaces in the encoded directory name
      // Claude encodes spaces at the end of paths as dashes
      // Example: "...src-claude-agent-sdk /" should be "...src-claude-agent-sdk-/"
      const hasTrailingSpaceInPath = session.session_path.includes(' /');

      if (hasTrailingSpaceInPath) {
        const newPath = session.session_path.replace(/ \//g, '-/');

        console.log(`  Updating session ${session.id} path:`);
        console.log(`    From: ${session.session_path}`);
        console.log(`    To:   ${newPath}`);

        await prisma.agentSession.update({
          where: { id: session.id },
          data: { session_path: newPath }
        });

        sessionsFixed++;
      }
    }
  }

  console.log(sessionsFixed > 0 ? `  Fixed ${sessionsFixed} session(s)\n` : '  No session paths with spaces found\n');

  console.log('\n=== Summary ===');
  console.log(`Projects fixed: ${projectsFixed}`);
  console.log(`Sessions updated: ${sessionsFixed}`);

  if (projectsFixed === 0) {
    console.log('\nNo projects with leading/trailing spaces found.');
  } else {
    console.log('\n✅ Fix completed successfully!');
  }
}

main()
  .catch((error) => {
    console.error('Error fixing project names:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
