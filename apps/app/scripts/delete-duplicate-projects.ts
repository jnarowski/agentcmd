import { prisma } from '../src/shared/prisma';

async function deleteDuplicateProjects() {
  console.log('Finding duplicate projects by path...\n');

  // Get all projects grouped by path
  const allProjects = await prisma.project.findMany({
    orderBy: {
      created_at: 'asc', // Keep oldest project for each path
    },
  });

  const pathMap = new Map<string, string[]>();

  // Group project IDs by path
  for (const project of allProjects) {
    if (!pathMap.has(project.path)) {
      pathMap.set(project.path, []);
    }
    pathMap.get(project.path)!.push(project.id);
  }

  let duplicatesFound = 0;
  let duplicatesDeleted = 0;

  // For each path with duplicates, keep the first (oldest) and delete the rest
  for (const [path, projectIds] of pathMap.entries()) {
    if (projectIds.length > 1) {
      duplicatesFound += projectIds.length - 1;
      const toKeep = projectIds[0];
      const toDelete = projectIds.slice(1);

      console.log(`Path: ${path}`);
      console.log(`  Found ${projectIds.length} projects`);
      console.log(`  Keeping: ${toKeep.substring(0, 8)}...`);
      console.log(`  Deleting: ${toDelete.length} duplicate(s)`);

      // Delete sessions for duplicate projects first
      for (const projectId of toDelete) {
        const deletedSessions = await prisma.agentSession.deleteMany({
          where: { projectId },
        });
        console.log(`    - Deleted ${deletedSessions.count} sessions for ${projectId.substring(0, 8)}...`);
      }

      // Delete duplicate projects
      const deletedProjects = await prisma.project.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });

      duplicatesDeleted += deletedProjects.count;
      console.log(`    - Deleted ${deletedProjects.count} duplicate project(s)\n`);
    }
  }

  console.log('Summary:');
  console.log(`  Duplicate projects found: ${duplicatesFound}`);
  console.log(`  Duplicate projects deleted: ${duplicatesDeleted}`);
  console.log(`  Unique projects remaining: ${pathMap.size}`);

  await prisma.$disconnect();
}

deleteDuplicateProjects().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
