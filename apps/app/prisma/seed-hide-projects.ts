import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Hiding all projects...");

  // Paths to KEEP visible (uncomment the ones you want to keep)
  const keepVisible: string[] = [
    // agent-cli-sdk
    // '/Users/jnarowski/Dev/sourceborn/src/agent-cli-sdk',
    // agent-cli-sdk
    // '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo/packages/agent-cli-sdk',
    // agent-cli-sdk
    // '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/packages/agent-cli-sdk',
    // agent-cli-sdk-three
    // '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo/packages/agent-cli-sdk-three',
    // agent-cli-sdk-two
    // '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/packages/agent-cli-sdk-two',
    // agent-utils
    // '/Users/jnarowski/Dev/spectora/src/agent-utils',
    // agent-workflows
    // '/Users/jnarowski/Dev/spectora/src/agent-workflows',
    // agent-workflows-monorepo
    // '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo',
    // agent-workflows-monorepo-v2
    "/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2",
    // agentic-boilerplate
    // '/Users/jnarowski/Dev/spectora/src/agentic-boilerplate',
    // agentic-playground
    // '/Users/jnarowski/Dev/spectora/src/agentic-playground',
    // boilerplate-monorepo
    // '/Users/jnarowski/Dev/sourceborn/src/boilerplate-monorepo',
    // claude-agent-sdk
    "/Users/jnarowski/Dev/playground/src/claude-agent-sdk ",
    // inngest-poc
    // '/Users/jnarowski/Dev/playground/src/inngest-poc',
    // install-fix
    // '/Users/jnarowski/Dev/sourceborn/src/install-fix',
    // install-fix-v2
    // '/Users/jnarowski/Dev/sourceborn/src/install-fix-v2',
    // jpnarowski-com-next-v2
    "/Users/jnarowski/Dev/sourceborn/src/jpnarowski-com-next-v2",
    // packages-monorepo
    // '/Users/jnarowski/Dev/sourceborn/src/packages-monorepo',
    // spectora
    // '/Users/jnarowski/Dev/spectora/src/spectora',
    // spectora-labs-monorepo-v2
    "/Users/jnarowski/Dev/spectora/src/spectora-labs-monorepo-v2",
    // web
    // '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/apps/web',
    // workflows
    // '/Users/jnarowski/Dev/spectora/src/agent-utils/.agent/workflows',
    // workflows
    // '/Users/jnarowski/Dev/spectora/src/agentic-playground/.agent/workflows',
  ];

  // Get all projects to show what will be hidden
  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, path: true, is_hidden: true },
  });

  console.log(`Found ${allProjects.length} total projects`);

  if (keepVisible.length > 0) {
    console.log("Keeping visible:", keepVisible);
  }

  // Hide all projects except those in keepVisible array
  const result = await prisma.project.updateMany({
    where: {
      path: {
        notIn: keepVisible,
      },
    },
    data: {
      is_hidden: true,
    },
  });

  console.log(`✓ Hidden ${result.count} projects`);

  // Show summary
  const visibleCount = allProjects.length - result.count;
  console.log(`✓ ${visibleCount} projects remain visible`);

  // List hidden projects
  if (result.count > 0) {
    console.log("\nHidden projects:");
    allProjects
      .filter((p) => !keepVisible.includes(p.path))
      .forEach((p) => {
        console.log(`  - ${p.name} (${p.path})`);
      });
  }

  // List visible projects
  if (visibleCount > 0) {
    console.log("\nVisible projects:");
    allProjects
      .filter((p) => keepVisible.includes(p.path))
      .forEach((p) => {
        console.log(`  - ${p.name} (${p.path})`);
      });
  }
}

main()
  .catch((e) => {
    console.error("Error hiding projects:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
