import { projectService } from '../src/server/services/project.service';
import { prisma } from '../src/shared/prisma';

async function testUpsert() {
  const testPath = '/test/project/unique-path';

  console.log('Testing upsert functionality...\n');

  // First call - should create
  console.log('1. Creating new project...');
  const project1 = await projectService.createOrUpdateProject('Test Project', testPath);
  console.log(`   Created: ${project1.id} - ${project1.name}`);
  console.log(`   created_at: ${project1.created_at}`);
  console.log(`   updated_at: ${project1.updated_at}`);

  // Wait a moment to ensure different timestamp
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Second call - should update
  console.log('\n2. Updating existing project...');
  const project2 = await projectService.createOrUpdateProject('Test Project Updated', testPath);
  console.log(`   Updated: ${project2.id} - ${project2.name}`);
  console.log(`   created_at: ${project2.created_at}`);
  console.log(`   updated_at: ${project2.updated_at}`);

  // Verify they have the same ID
  console.log(`\n3. Verification:`);
  console.log(`   Same ID: ${project1.id === project2.id ? 'YES ✓' : 'NO ✗'}`);
  console.log(`   Name updated: ${project2.name === 'Test Project Updated' ? 'YES ✓' : 'NO ✗'}`);
  console.log(`   Timestamps differ: ${project2.updated_at > project1.updated_at ? 'YES ✓' : 'NO ✗'}`);

  // Count total projects with this path
  const count = await prisma.project.count({ where: { path: testPath } });
  console.log(`   Projects with path: ${count} ${count === 1 ? '✓' : '✗'}`);

  // Cleanup
  await prisma.project.delete({ where: { id: project1.id } });
  console.log('\n✓ Test cleanup complete');

  await prisma.$disconnect();
}

testUpsert().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
