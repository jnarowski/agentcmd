import { prisma } from '../src/shared/prisma';

async function verify() {
  const projectCount = await prisma.project.count();
  const sessionCount = await prisma.agentSession.count();

  console.log('Database status:');
  console.log('  Projects:', projectCount);
  console.log('  Sessions:', sessionCount);

  if (projectCount === 0 && sessionCount === 0) {
    console.log('\n✓ Database is clean and ready for fresh import');
  } else {
    console.log('\n⚠ Database still has data');
  }

  await prisma.$disconnect();
}

verify();
