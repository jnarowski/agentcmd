/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs/promises';
import type { AgentSessionMetadata } from '@/shared/types/agent-session.types';
import { isSystemMessage, stripXmlTags } from '@/shared/utils/message.utils';
import type { ParseJSONLFileOptions } from '../types/ParseJSONLFileOptions';

/**
 * Parse a JSONL file to extract session metadata
 */
export async function parseJSONLFile({
  filePath
}: ParseJSONLFileOptions): Promise<AgentSessionMetadata> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let messageCount = 0;
    let hasUserMessage = false;
    let totalTokens = 0;
    let lastMessageAt = new Date().toISOString();
    let firstMessagePreview = '';
    let firstAssistantMessage = '';
    let createdAt: string | undefined;
    let isPlanSession = false;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Capture first timestamp as session creation date
        if (!createdAt && entry.timestamp) {
          createdAt = entry.timestamp;
        }

        // Count messages (check both 'type' for Claude CLI format and 'role' for API format)
        // Filter out system messages to match frontend display
        const isMessage = entry.type === 'user' || entry.type === 'assistant' || entry.role === 'user' || entry.role === 'assistant';

        // Check if this message contains only system content (declare early so it's in scope later)
        let hasOnlySystemContent = false;
        if (isMessage) {
          const content = entry.message?.content ?? entry.content;
          hasOnlySystemContent = (() => {
            if (typeof content === 'string') {
              return isSystemMessage(content);
            }
            if (Array.isArray(content)) {
              // Check if all text blocks are system messages
              const textBlocks = content.filter((c: any) => c.type === 'text');
              if (textBlocks.length === 0) return false;
              return textBlocks.every((c: any) => isSystemMessage(c.text));
            }
            return false;
          })();

          // Only count messages that are not system messages
          if (!hasOnlySystemContent) {
            messageCount++;
          }
        }

        // Extract first user message for preview (skip "Warmup" and system messages)
        const isUserMessage = entry.type === 'user' || entry.role === 'user';
        if (isUserMessage && !hasOnlySystemContent) {
          hasUserMessage = true;
        }
        if (isUserMessage && !firstMessagePreview) {
          // Handle both Claude CLI format (message.content) and API format (content)
          const content = entry.message?.content ?? entry.content;
          const text =
            typeof content === 'string'
              ? content
              : Array.isArray(content)
                ? content
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text)
                    .join(' ')
                : '';

          // Skip "Warmup" messages and system messages (Caveat, command tags, etc.)
          const trimmedText = text.trim();
          if (trimmedText.toLowerCase() !== 'warmup' && !isSystemMessage(trimmedText)) {
            // Strip XML tags and take first 100 characters
            const cleanedText = stripXmlTags(text);
            firstMessagePreview = cleanedText.substring(0, 100);
          }
        }

        // Sum token usage from assistant messages
        const isAssistantMessage = entry.type === 'assistant' || entry.role === 'assistant';
        if (isAssistantMessage) {
          // Usage can be at entry.usage (API format) or entry.message.usage (Claude CLI format)
          const usage = entry.usage || entry.message?.usage;
          if (usage) {
            const messageTokens =
              (usage.input_tokens || 0) +
              (usage.cache_creation_input_tokens || 0) +
              (usage.cache_read_input_tokens || 0) +
              (usage.output_tokens || 0);
            totalTokens += messageTokens;
          }

          // Extract first assistant text message (skip tool_use, tool_result, thinking blocks)
          if (!firstAssistantMessage) {
            const content = entry.message?.content ?? entry.content;
            if (Array.isArray(content)) {
              // Find first text block
              const textBlock = content.find((c: any) => c.type === 'text');
              if (textBlock?.text) {
                const cleanedText = stripXmlTags(textBlock.text);
                firstAssistantMessage = cleanedText.substring(0, 250);
              }
            } else if (typeof content === 'string') {
              const cleanedText = stripXmlTags(content);
              firstAssistantMessage = cleanedText.substring(0, 250);
            }
          }

          // Check if this is a Plan session (Task tool with subagent_type: "Plan")
          if (!isPlanSession) {
            const content = entry.message?.content ?? entry.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (
                  block.type === 'tool_use' &&
                  block.name === 'Task' &&
                  block.input?.subagent_type === 'Plan'
                ) {
                  isPlanSession = true;
                  break;
                }
              }
            }
          }
        }

        // Track the timestamp from the latest message
        if (entry.timestamp) {
          lastMessageAt = entry.timestamp;
        }
      } catch {
        // Skip malformed JSONL lines
      }
    }

    // Validate that session has at least one real user message
    if (!hasUserMessage) {
      throw new Error(
        messageCount === 0
          ? 'Session has no messages (only system messages) - skipping import'
          : `Session has ${messageCount} messages but no user message - skipping import`
      );
    }

    return {
      messageCount,
      totalTokens,
      lastMessageAt,
      firstMessagePreview: firstMessagePreview || 'Untitled Session',
      firstAssistantMessage: firstAssistantMessage || undefined,
      createdAt,
      isPlanSession,
    };
  } catch (error) {
    // Return default metadata if file can't be read
    throw new Error(`Failed to parse JSONL file: ${error}`);
  }
}
