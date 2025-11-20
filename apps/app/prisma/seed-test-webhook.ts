import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTestWebhook() {
  const projectId = "cmi61pn090000ya2m0cwd2mv1";

  // Delete existing test data if any
  await prisma.webhookEvent.deleteMany({
    where: { webhook_id: "test-webhook-001" },
  });
  await prisma.webhook.deleteMany({
    where: { id: "test-webhook-001" },
  });

  // Create webhook
  const webhook = await prisma.webhook.create({
    data: {
      id: "test-webhook-001",
      project_id: projectId,
      name: "Pre-seeded Test Webhook",
      description: "Webhook with test data for editing",
      source: "github",
      status: "draft",
      workflow_identifier: null,
      secret: "test_secret_123456",
      config: {
        field_mappings: [],
        source_config: {},
      },
      webhook_conditions: null,
    },
  });

  // Create test event
  await prisma.webhookEvent.create({
    data: {
      id: "test-event-001",
      webhook_id: webhook.id,
      status: "test",
      payload: {
        action: "opened",
        pull_request: {
          number: 123,
          title: "Add new feature",
          user: {
            login: "testuser",
          },
          body: "This is a test PR description",
        },
        repository: {
          name: "test-repo",
          full_name: "org/test-repo",
        },
      },
      headers: {
        "x-github-event": "pull_request",
      },
    },
  });

  console.log("✅ Test webhook seeded successfully!");
}

seedTestWebhook()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
