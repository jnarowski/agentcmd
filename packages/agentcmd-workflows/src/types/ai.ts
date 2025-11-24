/**
 * Type-safe AI model and provider definitions
 * Single source of truth for all AI models used across workflows and services
 */

// ============================================================================
// AI Models Map
// ============================================================================

/**
 * All available AI models organized by provider
 */
export const MODELS = {
  anthropic: {
    HAIKU_3_5: "claude-3-5-haiku-20241022",
    SONNET_3_7: "claude-3-7-sonnet-20250219",
    SONNET_4_5: "claude-sonnet-4-5-20250929",
    OPUS_4: "claude-opus-4-20250514",
    OPUS_4_5: "claude-opus-4-5",
  },
  openai: {
    GPT_4: "gpt-4",
    GPT_4_TURBO: "gpt-4-turbo",
    GPT_4_O: "gpt-4o",
    GPT_4_MINI: "gpt-4-mini",
  },
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported AI providers
 */
export type AiProvider = keyof typeof MODELS;

/**
 * All Anthropic model IDs
 */
export type AnthropicModelId =
  (typeof MODELS.anthropic)[keyof typeof MODELS.anthropic];

/**
 * All OpenAI model IDs
 */
export type OpenaiModelId =
  (typeof MODELS.openai)[keyof typeof MODELS.openai];

/**
 * Any valid AI model ID (union of all providers)
 */
export type AiModelId = AnthropicModelId | OpenaiModelId;
