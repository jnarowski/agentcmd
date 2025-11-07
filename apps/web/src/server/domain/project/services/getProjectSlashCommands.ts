import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { SlashCommand } from '@/shared/types/slash-command.types';
import { getProjectById } from '@/server/domain/project/services';
import type { GetProjectSlashCommandsOptions } from '@/server/domain/project/types/GetProjectSlashCommandsOptions';

/**
 * Slash Command Service
 * Handles scanning and parsing of custom slash commands from .claude/commands/ directory
 */

/**
 * Construct command name from relative path and filename
 * Examples:
 *   - relativePath="", filename="chat.md" -> "/chat"
 *   - relativePath="e2e", filename="chat.md" -> "/e2e:chat"
 *   - relativePath="e2e/another", filename="test.md" -> "/e2e:another:test"
 */
function constructCommandName(relativePath: string, filename: string): string {
  // Remove .md extension
  const nameWithoutExtension = filename.replace(/\.md$/i, '');

  // Split relative path and filter empty strings
  const pathParts = relativePath.split(path.sep).filter(part => part !== '');

  // Combine path parts with filename
  const allParts = [...pathParts, nameWithoutExtension];

  // Join with colons and add leading slash
  return '/' + allParts.join(':');
}

/**
 * Recursively scan directory for .md files and construct slash commands
 */
async function scanCommandsDirectory(
  baseDir: string,
  currentDir: string,
  relativePath: string = ''
): Promise<SlashCommand[]> {
  const commands: SlashCommand[] = [];

  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const newRelativePath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subCommands = await scanCommandsDirectory(
          baseDir,
          fullPath,
          newRelativePath
        );
        commands.push(...subCommands);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Parse markdown file
        try {
          const fileContent = await fs.readFile(fullPath, 'utf-8');
          const { data } = matter(fileContent);

          // Skip commands without a description
          if (!data.description) {
            continue;
          }

          const description = data.description;

          // Extract and parse optional argument hint
          const argumentHintRaw = data['argument-hint'] || data.argumentHint;
          let argumentHints: string[] | undefined;

          if (argumentHintRaw) {
            if (Array.isArray(argumentHintRaw)) {
              // Already an array from YAML parsing
              argumentHints = argumentHintRaw
                .map((arg) => String(arg).trim())
                .filter((arg) => arg.length > 0);
            } else if (typeof argumentHintRaw === 'string') {
              // Parse "[arg1, arg2]" format string into array
              argumentHints = argumentHintRaw
                .replace(/^\[|\]$/g, '') // Remove surrounding brackets
                .split(',')
                .map((arg) => arg.trim())
                .filter((arg) => arg.length > 0);
            }
          }

          // Construct command name
          const dirRelativePath = relativePath
            ? path.dirname(newRelativePath)
            : '';
          const fullCommand = constructCommandName(dirRelativePath, entry.name);
          const name = fullCommand.slice(1); // Remove leading slash

          commands.push({
            name,
            fullCommand,
            description,
            argumentHints: argumentHints && argumentHints.length > 0 ? argumentHints : undefined,
            type: 'custom',
          });
        } catch {
          // Skip malformed command files and continue processing
          // Error: Failed to parse command file
        }
      }
    }
  } catch {
    // Return partial results if directory scan fails
  }

  return commands;
}

/**
 * Get all custom slash commands for a project
 * Scans the .claude/commands/ directory in the project root
 */
export async function getProjectSlashCommands({ projectId }: GetProjectSlashCommandsOptions): Promise<SlashCommand[]> {
  try {
    // Look up project from database
    const project = await getProjectById({ id: projectId });

    if (!project) {
      throw new Error('Project not found');
    }

    // Construct commands directory path
    const commandsDir = path.join(project.path, '.claude', 'commands');

    // Check if directory exists
    try {
      await fs.access(commandsDir);
    } catch {
      // Directory doesn't exist - return empty array (not an error)
      return [];
    }

    // Scan directory recursively
    const commands = await scanCommandsDirectory(
      commandsDir,
      commandsDir,
      ''
    );

    return commands;
  } catch (error) {
    // If project not found, throw the error
    if ((error as Error).message === 'Project not found') {
      throw error;
    }

    // For other errors, return empty array
    return [];
  }
}
