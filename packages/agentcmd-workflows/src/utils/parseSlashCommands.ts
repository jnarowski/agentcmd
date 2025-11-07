import matter from "gray-matter";
import { readdir, readFile } from "fs/promises";
import path from "path";
import type { CommandDefinition, CommandArgument, ResponseSchema } from "../types/slash-commands-internal";

/**
 * Parse argument-hint string from frontmatter into CommandArgument[]
 *
 * Supports formats:
 * - [arg1, arg2] - both required
 * - [arg1, (arg2)] - arg2 optional (wrapped in parens)
 * - [arg1, arg2?] - arg2 optional (? suffix)
 * - [] - no arguments
 *
 * @param argumentHint - String like "[feature-name, context]"
 * @returns Array of CommandArgument objects
 */
export function parseArgumentHint(argumentHint?: string | string[] | unknown): CommandArgument[] {
  // Handle array format (YAML parsed [arg1, arg2] as array)
  if (Array.isArray(argumentHint)) {
    if (argumentHint.length === 0) {
      return [];
    }
    // Process each array element as an argument string
    return argumentHint.map((argString) => {
      let name = String(argString).trim();
      let required = true;

      // Check for optional markers
      if (name.startsWith("(") && name.endsWith(")")) {
        name = name.slice(1, -1);
        required = false;
      } else if (name.endsWith("?")) {
        name = name.slice(0, -1);
        required = false;
      }

      return { name, required };
    });
  }

  // Handle string format
  if (!argumentHint || typeof argumentHint !== "string") {
    return [];
  }

  if (argumentHint.trim() === "[]") {
    return [];
  }

  // Remove brackets and split by comma
  const cleaned = argumentHint.replace(/^\[|\]$/g, "").trim();
  if (!cleaned) {
    return [];
  }

  const argStrings = cleaned.split(",").map((s) => s.trim());

  return argStrings.map((argString) => {
    let name = argString;
    let required = true;

    // Check for optional markers
    // Pattern 1: (arg) - wrapped in parens
    if (argString.startsWith("(") && argString.endsWith(")")) {
      name = argString.slice(1, -1);
      required = false;
    }
    // Pattern 2: arg? - ends with ?
    else if (argString.endsWith("?")) {
      name = argString.slice(0, -1);
      required = false;
    }

    return {
      name,
      required,
    };
  });
}

/**
 * Parse JSON response schema from command documentation.
 * Looks for pattern: 'If $format is "json", return ONLY this JSON:'
 * followed by a ```json code block and field descriptions.
 *
 * @param content - Markdown content from the command file
 * @returns ResponseSchema object or undefined if no JSON schema found
 */
export function parseJsonResponseSchema(content: string): ResponseSchema | undefined {
  // Step 1: Look for pattern: "If $format is \"json\", return ONLY this JSON"
  // This pattern is flexible to handle variations like "(no other text):"
  const jsonTriggerPattern = /If \$format is "json", return ONLY this JSON[^:]*:/i;
  const triggerMatch = content.match(jsonTriggerPattern);

  if (!triggerMatch) {
    return undefined;
  }

  // Step 2: Extract the next code block (```json ... ```)
  const triggerIndex = triggerMatch.index;
  if (triggerIndex === undefined) {
    return undefined;
  }

  const afterTrigger = content.slice(triggerIndex + triggerMatch[0].length);
  const codeBlockPattern = /```json\s*\n([\s\S]*?)\n```/;
  const codeBlockMatch = afterTrigger.match(codeBlockPattern);

  if (!codeBlockMatch || !codeBlockMatch[1]) {
    return undefined;
  }

  // Step 3: Parse JSON to get structure
  let exampleJson: Record<string, unknown>;
  try {
    exampleJson = JSON.parse(codeBlockMatch[1]);
  } catch (error) {
    console.warn('⚠️  Failed to parse JSON from code block:', error);
    return undefined;
  }

  // Step 4: Find field descriptions section (starts with "**JSON Field Descriptions:**")
  const fieldDescPattern = /\*\*JSON Field Descriptions:\*\*/;
  const fieldDescMatch = content.match(fieldDescPattern);

  const fieldDescriptions = new Map<string, string>();

  if (fieldDescMatch && fieldDescMatch.index !== undefined) {
    // Step 5: Parse bullet list: "- `field`: description"
    const afterFieldDesc = content.slice(fieldDescMatch.index + fieldDescMatch[0].length);

    // Find all bullet points with field descriptions
    // Pattern: - `fieldName`: description (until next bullet or double newline)
    const bulletPattern = /^-\s+`([^`]+)`:\s*(.+)$/gm;
    let bulletMatch;

    while ((bulletMatch = bulletPattern.exec(afterFieldDesc)) !== null) {
      const fieldName = bulletMatch[1];
      const description = bulletMatch[2];
      if (fieldName && description) {
        fieldDescriptions.set(fieldName, description.trim());
      }
    }
  }

  // Step 6: Return { exampleJson, fieldDescriptions }
  return {
    exampleJson,
    fieldDescriptions,
  };
}

/**
 * Parse all slash command definitions from .md files in a directory
 *
 * @param commandsDir - Directory containing .claude/commands/*.md files
 * @returns Array of CommandDefinition objects
 * @throws Error if directory doesn't exist or can't be read
 */
export async function parseSlashCommands(
  commandsDir: string
): Promise<CommandDefinition[]> {
  try {
    // Read all files in the directory
    const files = await readdir(commandsDir);
    const mdFiles = files.filter((file) => file.endsWith(".md"));

    if (mdFiles.length === 0) {
      console.warn(`⚠️  No .md files found in ${commandsDir}`);
      return [];
    }

    // Parse each file
    const commands = await Promise.all(
      mdFiles.map(async (file) => {
        const filePath = path.join(commandsDir, file);
        const content = await readFile(filePath, "utf-8");

        // Parse frontmatter with gray-matter
        const { data, content: markdownContent } = matter(content);

        // Extract command name from filename (remove .md, prepend /)
        const commandName = `/${path.basename(file, ".md")}`;

        // Parse arguments from argument-hint
        const args = parseArgumentHint(data["argument-hint"]);

        // Parse response schema if present
        const responseSchema = parseJsonResponseSchema(markdownContent);

        return {
          name: commandName,
          description: data.description || "",
          arguments: args,
          responseSchema,
        };
      })
    );

    return commands;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Directory not found: ${commandsDir}`);
    }
    throw error;
  }
}
