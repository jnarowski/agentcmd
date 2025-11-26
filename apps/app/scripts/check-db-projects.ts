import { prisma } from '../src/shared/prisma';

async function checkProjects() {
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: { sessions: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`\nTotal projects in database: ${projects.length}\n`);

  for (const project of projects) {
    console.log(`Project: ${project.name}`);
    console.log(`  Path: ${project.path}`);
    console.log(`  Sessions: ${project._count.sessions}`);
    console.log('');
  }

  // Get some sample sessions
  const sessions = await prisma.agentSession.findMany({
    take: 5,
    include: {
      project: {
        select: { name: true },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  console.log(`\nSample sessions (${sessions.length}):\n`);
  for (const session of sessions) {
    const metadata = session.metadata as { messageCount?: number; firstMessagePreview?: string } | null;
    console.log(`Session: ${session.id.substring(0, 8)}...`);
    console.log(`  Project: ${session.project.name}`);
    console.log(`  Messages: ${metadata?.messageCount || 0}`);
    console.log(`  Preview: ${metadata?.firstMessagePreview?.substring(0, 50) || 'N/A'}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkProjects();
