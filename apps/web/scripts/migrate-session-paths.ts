/**
 * Data migration script to populate session_path for existing sessions
 * Run with: pnpm tsx scripts/migrate-session-paths.ts
 */

import { prisma } from '../src/shared/prisma';
import { getSessionFilePath } from '../src/server/utils/path';

async function migrateSessionPaths() {
  console.log('Starting session_path migration...');

  // Get all sessions with NULL session_path
  const sessionsToUpdate = await prisma.agentSession.findMany({
    where: {
      session_path: null,
    },
    include: {
      project: true,
    },
  });

  console.log(`Found ${sessionsToUpdate.length} sessions to update`);

  let updated = 0;
  let failed = 0;

  for (const session of sessionsToUpdate) {
    try {
      const sessionPath = getSessionFilePath(session.project.path, session.id);

      await prisma.agentSession.update({
        where: { id: session.id },
        data: { session_path: sessionPath },
      });

      updated++;

      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${sessionsToUpdate.length} sessions...`);
      }
    } catch (error) {
      console.error(`Failed to update session ${session.id}:`, error);
      failed++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`✓ Updated: ${updated}`);
  console.log(`✗ Failed: ${failed}`);
}

migrateSessionPaths()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
