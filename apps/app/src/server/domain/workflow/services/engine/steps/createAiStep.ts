import { generateText, generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type {
  AiStepConfig,
  AiStepResult,
  StepOptions,
} from "agentcmd-workflows";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { toName } from "@/server/domain/workflow/services/engine/steps/utils/toName";
import { Configuration } from "@/server/config/Configuration";

const DEFAULT_AI_TIMEOUT = 60000; // 60 seconds

/**
 * Get API key for the specified provider
 */
function getApiKey(
  provider: "anthropic" | "openai",
  apiKeys: { anthropicApiKey?: string; openaiApiKey?: string }
): string {
  const apiKey =
    provider === "anthropic" ? apiKeys.anthropicApiKey : apiKeys.openaiApiKey;

  if (!apiKey) {
    throw new Error(
      `${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} not configured. Please set the environment variable.`
    );
  }

  return apiKey;
}

/**
 * Create AI model instance based on provider
 */
function createModel(
  provider: "anthropic" | "openai",
  apiKeys: { anthropicApiKey?: string; openaiApiKey?: string },
  modelName?: string
) {
  const apiKey = getApiKey(provider, apiKeys);

  return provider === "anthropic"
    ? createAnthropic({ apiKey })(modelName ?? "claude-sonnet-4-5-20250929")
    : createOpenAI({ apiKey })(modelName ?? "gpt-4");
}

/**
 * Build common generation parameters
 */
function buildGenerationParams(config: AiStepConfig) {
  const temperature = config.temperature ?? 0.7;

  return {
    prompt: config.prompt,
    ...(config.systemPrompt && { system: config.systemPrompt }),
    ...(temperature !== undefined && { temperature }),
    ...(config.maxTokens && { maxTokens: config.maxTokens }),
  };
}

/**
 * Execute AI generation (text or structured output)
 */
async function executeGeneration<T>(
  config: AiStepConfig,
  model: ReturnType<typeof createModel>,
  timeout: number
): Promise<AiStepResult<T>> {
  const params = buildGenerationParams(config);

  const startTime = Date.now();
  const provider = config.provider ?? "anthropic";
  const modelName = config.model ?? (provider === "anthropic" ? "claude-sonnet-4-5-20250929" : "gpt-4");

  if (config.schema) {
    // Structured output with schema
    const result = await withTimeout(
      generateObject({
        model,
        // @ts-expect-error - Schema type from workflow-sdk is compatible but TypeScript can't infer it
        schema: config.schema,
        ...params,
      }),
      timeout,
      "AI generation"
    );
    const duration = Date.now() - startTime;

    return {
      data: result.object as T,
      result: {
        finishReason: result.finishReason,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          reasoningTokens: result.usage.reasoningTokens,
        },
        warnings: result.warnings?.map(w => ({
          type: w.type,
          message: 'message' in w ? w.message : undefined,
        })),
        providerMetadata: result.providerMetadata,
        request: result.request,
        response: result.response,
      },
      success: true,
      trace: [{
        command: `AI generateObject (${provider}/${modelName})`,
        duration,
      }],
    };
  }

  // Text generation
  const result = await withTimeout(
    generateText({
      model,
      ...params,
    }),
    timeout,
    "AI generation"
  );
  const duration = Date.now() - startTime;

  return {
    data: { text: result.text } as T,
    result: {
      finishReason: result.finishReason,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        reasoningTokens: result.usage.reasoningTokens,
      },
      totalUsage: result.totalUsage ? {
        inputTokens: result.totalUsage.inputTokens,
        outputTokens: result.totalUsage.outputTokens,
        totalTokens: result.totalUsage.totalTokens,
        reasoningTokens: result.totalUsage.reasoningTokens,
      } : undefined,
      warnings: result.warnings?.map(w => ({
        type: w.type,
        message: 'message' in w ? w.message : undefined,
      })),
      providerMetadata: result.providerMetadata,
      request: result.request,
      response: result.response,
    },
    success: true,
    trace: [{
      command: `AI generateText (${provider}/${modelName})`,
      duration,
    }],
  };
}

/**
 * Create AI step factory function
 * Generates text or structured output using AI models
 */
export function createAiStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function ai<T = { text: string }>(
    idOrName: string,
    config: AiStepConfig,
    options?: StepOptions
  ): Promise<AiStepResult<T>> {
    const timeout = options?.timeout ?? DEFAULT_AI_TIMEOUT;
    const id = toId(idOrName);
    const name = toName(idOrName);

    const { result } = await executeStep({
      context,
      stepId: id,
      stepName: name,
      stepType: "ai",
      inngestStep,
      input: config,
      fn: async () => {
        const { logger } = context;
        const configuration = Configuration.getInstance();
        const apiKeys = configuration.get("apiKeys");

        const provider = config.provider ?? "anthropic";

        logger.debug(
          { provider, model: config.model, promptLength: config.prompt.length },
          "Executing AI step"
        );

        try {
          const model = createModel(provider, apiKeys, config.model);

          logger.debug(
            config.schema
              ? "Using generateObject with schema"
              : "Using generateText"
          );

          return await executeGeneration<T>(config, model, timeout);
        } catch (error: unknown) {
          const err = error as Error;
          logger.error(
            {
              err,
              provider,
              model: config.model,
              promptLength: config.prompt.length,
            },
            "AI step failed"
          );

          const modelName = config.model ?? (provider === "anthropic" ? "claude-sonnet-4-5-20250929" : "gpt-4");
          return {
            data: {} as T,
            success: false,
            error: err.message,
            trace: [{
              command: `AI generation (${provider}/${modelName})`,
              output: err.message,
            }],
          };
        }
      },
    });

    return result;
  };
}
