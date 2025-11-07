/**
 * Gemini CLI integration module.
 *
 * Provides functions for executing Gemini CLI commands, loading sessions,
 * and parsing Gemini messages to unified format.
 */

export { parse } from './parse';
export { loadSession } from './loadSession';
export { execute } from './execute';
export { detectCli } from './detectCli';

export type { GeminiMessage, GeminiSession, GeminiToolCall, GeminiThought } from './types';
export type { ExecuteOptions, ExecuteResult } from './execute';
export type { LoadGeminiSessionOptions } from './loadSession';
