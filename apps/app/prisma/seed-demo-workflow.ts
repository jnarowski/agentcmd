/**
 * Create a demo workflow definition with realistic agentic orchestration steps.
 *
 * Usage:
 *   pnpm prisma:seed:demo <project-id>
 *
 * Examples:
 *   pnpm prisma:seed:demo cmi2bycxc000dyapnp2ebti9h
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating demo workflow definition...\n");

  // Parse command line arguments for project ID
  const targetProjectId = process.argv[2];

  if (!targetProjectId) {
    console.log("❌ Project ID is required.");
    console.log("Usage: pnpm prisma:seed:demo <project-id>");
    return;
  }

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: targetProjectId },
  });

  if (!project) {
    console.log(`❌ Project with ID "${targetProjectId}" not found.`);
    return;
  }

  console.log(`🎯 Creating demo workflow for project: ${project.name}\n`);

  // Check if demo workflow already exists
  const existingDemo = await prisma.workflowDefinition.findFirst({
    where: {
      project_id: targetProjectId,
      identifier: "demo-orchestration",
    },
  });

  if (existingDemo) {
    console.log("⚠️  Demo workflow already exists. Deleting old version...");

    // Delete associated runs first
    const runs = await prisma.workflowRun.findMany({
      where: { workflow_definition_id: existingDemo.id },
      select: { id: true },
    });

    if (runs.length > 0) {
      const runIds = runs.map((r) => r.id);
      await prisma.workflowArtifact.deleteMany({
        where: { workflow_run_id: { in: runIds } },
      });
      await prisma.workflowEvent.deleteMany({
        where: { workflow_run_id: { in: runIds } },
      });
      await prisma.workflowRunStep.deleteMany({
        where: { workflow_run_id: { in: runIds } },
      });
      await prisma.workflowRun.deleteMany({
        where: { id: { in: runIds } },
      });
    }

    await prisma.workflowDefinition.delete({
      where: { id: existingDemo.id },
    });
    console.log("✅ Deleted old demo workflow\n");
  }

  // Create the demo workflow definition
  const demoWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: targetProjectId,
      identifier: "demo-orchestration",
      name: "🎭 Demo: Agentic Orchestration Pipeline",
      description:
        "Demonstration workflow showing multi-agent orchestration with Claude, GPT-4, and Gemini working together on a simple task",
      type: "code",
      path: "./.agent/workflows/demo-orchestration.yaml",
      status: "active",
      file_exists: false, // This is a demo, no actual file
      load_error: null,
      archived_at: null,
      phases: JSON.stringify([
        {
          name: "Discovery",
          description: "Initial research and planning with multiple AI agents",
          steps: [
            {
              type: "ai",
              agent: "claude",
              name: "Analyze Request",
              prompt: "Hello! My name is Jake. Can you help me understand what we're building today?",
              model: "claude-3.5-sonnet",
            },
            {
              type: "ai",
              agent: "gpt4",
              name: "Generate Ideas",
              prompt: "Based on the initial analysis, what are 3 creative approaches we could take?",
              model: "gpt-4-turbo",
            },
            {
              type: "bash",
              name: "Check Environment",
              command: "echo 'Checking system requirements...' && node --version && npm --version",
            },
          ],
        },
        {
          name: "Planning",
          description: "Collaborative planning between AI agents",
          steps: [
            {
              type: "ai",
              agent: "claude",
              name: "Create Technical Plan",
              prompt: "Let's create a simple technical plan. Keep it brief and friendly!",
              model: "claude-3.5-sonnet",
            },
            {
              type: "ai",
              agent: "gemini",
              name: "Review Plan",
              prompt: "Please review this plan and suggest any improvements. Be constructive!",
              model: "gemini-1.5-pro",
            },
            {
              type: "conditional",
              name: "Validate Plan Quality",
              condition: "plan_approved === true",
              thenSteps: ["Continue to implementation"],
              elseSteps: ["Revise plan"],
            },
          ],
        },
        {
          name: "Implementation",
          description: "Execute the plan with AI assistance",
          steps: [
            {
              type: "ai",
              agent: "claude",
              name: "Write Implementation",
              prompt: "Let's write a simple 'Hello World' example. Nothing fancy!",
              model: "claude-3.5-sonnet",
            },
            {
              type: "bash",
              name: "Run Safety Check",
              command: "echo 'Running safety checks...' && echo 'All clear!' && exit 0",
            },
            {
              type: "loop",
              name: "Quality Iterations",
              items: ["syntax", "style", "performance"],
              steps: [
                {
                  type: "ai",
                  agent: "gpt4",
                  name: "Check {{item}}",
                  prompt: "Quick check for {{item}} - looks good!",
                  model: "gpt-4-turbo",
                },
              ],
            },
          ],
        },
        {
          name: "Review",
          description: "Final review and validation",
          steps: [
            {
              type: "ai",
              agent: "claude",
              name: "Code Review",
              prompt: "Let's do a friendly code review. Remember, we're just demonstrating the workflow!",
              model: "claude-3.5-sonnet",
            },
            {
              type: "ai",
              agent: "gemini",
              name: "Documentation Check",
              prompt: "Does this need any documentation? Probably just a simple README!",
              model: "gemini-1.5-flash",
            },
            {
              type: "bash",
              name: "Final Checks",
              command: "echo 'Running final checks...' && echo '✅ All systems go!' && exit 0",
            },
          ],
        },
        {
          name: "Completion",
          description: "Wrap up and celebrate",
          steps: [
            {
              type: "ai",
              agent: "claude",
              name: "Summary Report",
              prompt: "Great work everyone! Let's write a brief summary of what we accomplished today.",
              model: "claude-3.5-sonnet",
            },
            {
              type: "bash",
              name: "Celebrate",
              command: "echo '🎉 Demo workflow completed successfully!' && echo 'Thanks for watching!'",
            },
          ],
        },
      ]),
      args_schema: JSON.stringify({
        type: "object",
        properties: {
          userName: {
            type: "string",
            description: "Your name (for personalization)",
            default: "Jake",
          },
          taskDescription: {
            type: "string",
            description: "Brief description of what to demo",
            default: "Show off multi-agent orchestration",
          },
          agentPreference: {
            type: "string",
            enum: ["claude", "gpt4", "gemini", "mixed"],
            default: "mixed",
            description: "Which AI agents to use",
          },
          verboseOutput: {
            type: "boolean",
            default: true,
            description: "Show detailed logs from each step",
          },
        },
        required: ["userName"],
      }),
      is_template: true,
    },
  });

  console.log("✅ Created demo workflow definition\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 DEMO WORKFLOW DETAILS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`Name: ${demoWorkflow.name}`);
  console.log(`Identifier: ${demoWorkflow.identifier}`);
  console.log(`Description: ${demoWorkflow.description}\n`);
  console.log("Phases:");
  console.log("  1. Discovery - Multi-agent research (Claude + GPT-4 + Bash)");
  console.log("  2. Planning - Collaborative planning (Claude + Gemini + Conditional)");
  console.log("  3. Implementation - Execution with loops (Claude + GPT-4 + Loop)");
  console.log("  4. Review - Quality checks (Claude + Gemini + Bash)");
  console.log("  5. Completion - Summary and celebration\n");
  console.log("Key Features Demonstrated:");
  console.log("  ✓ Multiple AI agents (Claude, GPT-4, Gemini)");
  console.log("  ✓ Bash command execution");
  console.log("  ✓ Conditional logic");
  console.log("  ✓ Loop iterations");
  console.log("  ✓ Step dependencies");
  console.log("  ✓ Safe, non-destructive commands");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const baseUrl = process.env.VITE_WS_HOST
    ? `http://${process.env.VITE_WS_HOST}:${process.env.VITE_PORT || 4101}`
    : `http://localhost:${process.env.VITE_PORT || 4101}`;

  console.log("🎯 View in Browser:");
  console.log(
    `   ${baseUrl}/projects/${targetProjectId}/workflows/${demoWorkflow.id}\n`
  );
  console.log("💡 To create a run, click 'New Run' in the UI and provide:");
  console.log("   - userName: Your name (default: Jake)");
  console.log("   - taskDescription: What to demonstrate");
  console.log("   - agentPreference: mixed (uses all agents)");
  console.log("   - verboseOutput: true (shows detailed logs)\n");
  console.log("✨ This workflow is safe to run - all prompts and commands are harmless!");
}

main()
  .catch((e) => {
    console.error("Error during demo workflow creation:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
