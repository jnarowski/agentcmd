import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";
import { jsonSchema } from "ai";

/**
 * Example workflow demonstrating step.ai capabilities.
 * Shows text generation and structured output with JSON Schema.
 */
export default defineWorkflow(
  {
    id: "ai-example-workflow",
    trigger: "workflow/ai-example",
    name: "AI Example Workflow",
    description: "Demonstrates step.ai with text and structured output",
    phases: [
      { id: "generate", label: "Generate Content" },
      { id: "structured", label: "Structured Output" },
    ],
  },
  async ({ step }) => {
    let haikuResponse: string;
    let planResponse: any;

    // Phase 1: Simple text generation
    await step.phase("generate", async () => {
      const haiku = await step.ai("generate-haiku", {
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        prompt: "Write a haiku about workflow automation",
        temperature: 0.7,
      });

      haikuResponse = haiku.data.text;

      // Access full Vercel AI SDK response
      console.log("Full result:", haiku.result);

      await step.artifact("haiku-output", {
        name: "haiku.txt",
        type: "text",
        content: haiku.data.text,
      });
    });

    // Phase 2: Structured output with JSON Schema
    await step.phase("structured", async () => {
      interface TaskBreakdown {
        title: string;
        priority: "low" | "medium" | "high";
        tasks: Array<{
          name: string;
          estimatedHours: number;
        }>;
      }

      const taskSchema = jsonSchema<TaskBreakdown>({
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                estimatedHours: { type: "number" },
              },
              required: ["name", "estimatedHours"],
            },
          },
        },
        required: ["title", "priority", "tasks"],
      });

      planResponse = await step.ai<TaskBreakdown>("generate-plan", {
        provider: "anthropic",
        prompt: "Create a task breakdown for implementing user authentication",
        schema: taskSchema,
        temperature: 0.3,
      });

      // Access full Vercel AI SDK response (usage, warnings, metadata, etc.)
      // @ts-ignore
      console.log("Full result:", planResponse?.data);

      await step.artifact("plan-output", {
        name: "task-plan.json",
        type: "text",
        content: JSON.stringify(planResponse?.data, null, 2),
      });
    });

    return {
      success: true,
      message: "AI workflow completed",
      taskResponse: {
        haikuResponse,
        planResponse: planResponse.data,
      },
      timestamp: new Date().toISOString(),
    };
  }
);
