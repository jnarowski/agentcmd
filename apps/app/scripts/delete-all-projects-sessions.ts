import { prisma } from '../src/shared/prisma';

async function deleteAll() {
  console.log('Deleting all projects and sessions...');

  // Delete sessions first (due to foreign key constraint)
  const deletedSessions = await prisma.agentSession.deleteMany({});
  console.log(`✓ Deleted ${deletedSessions.count} sessions`);

  // Delete projects
  const deletedProjects = await prisma.project.deleteMany({});
  console.log(`✓ Deleted ${deletedProjects.count} projects`);

  console.log('\nDatabase cleaned successfully!');

  await prisma.$disconnect();
}

deleteAll().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
