import { readdir, copyFile, mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { parseSlashCommands } from "./parseSlashCommands";
import { generateSlashCommandTypesCode } from "./generateSlashCommandTypes";

// Get directory of this file
function getCurrentDir(): string {
  const filename = fileURLToPath(import.meta.url);
  return path.dirname(filename);
}

export interface InitOptions {
  claude: boolean;
  genTypes: boolean;
  yes: boolean;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  typesGenerated: boolean;
}

/**
 * Check if a file or directory exists
 */
async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively copy directory contents, skipping existing files
 */
async function copyDirectory(
  src: string,
  dest: string,
  created: string[],
  skipped: string[]
): Promise<void> {
  // Create destination directory if it doesn't exist
  if (!(await exists(dest))) {
    await mkdir(dest, { recursive: true });
    created.push(dest);
  } else {
    skipped.push(dest);
  }

  // Read source directory
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      await copyDirectory(srcPath, destPath, created, skipped);
    } else {
      // Copy file if it doesn't exist
      if (!(await exists(destPath))) {
        await copyFile(srcPath, destPath);
        created.push(destPath);
      } else {
        skipped.push(destPath);
      }
    }
  }
}

/**
 * Append gitignore patterns if they don't already exist
 */
async function appendGitignore(
  targetPath: string,
  templatesDir: string,
  created: string[],
  skipped: string[]
): Promise<void> {
  const gitignorePath = path.join(targetPath, ".gitignore");
  const templatePath = path.join(templatesDir, ".gitignore");

  // Read template patterns
  const patterns = await readFile(templatePath, "utf-8");
  const newPatterns = patterns.trim().split("\n").filter(line => line && !line.startsWith("#"));

  // Check if .gitignore exists
  let existingContent = "";
  if (await exists(gitignorePath)) {
    existingContent = await readFile(gitignorePath, "utf-8");
  }

  // Find patterns that don't already exist
  const patternsToAdd: string[] = [];
  for (const pattern of newPatterns) {
    if (!existingContent.includes(pattern)) {
      patternsToAdd.push(pattern);
    }
  }

  if (patternsToAdd.length > 0) {
    // Append new patterns
    const newContent = existingContent
      ? `${existingContent.trimEnd()}\n\n# Agent workflow artifacts\n${patternsToAdd.join("\n")}\n`
      : `# Agent workflow artifacts\n${patternsToAdd.join("\n")}\n`;

    await writeFile(gitignorePath, newContent, "utf-8");
    created.push(gitignorePath);
  } else {
    skipped.push(gitignorePath);
  }
}

/**
 * Initialize workflow project structure
 */
export async function initWorkflowProject(
  targetPath: string,
  options: InitOptions
): Promise<InitResult> {
  const created: string[] = [];
  const skipped: string[] = [];
  let typesGenerated = false;

  // Resolve template directory
  // In development: packages/workflow-sdk/src/utils -> packages/workflow-sdk/templates (up 2 levels)
  // In production: packages/workflow-sdk/dist -> packages/workflow-sdk/templates (up 1 level)
  const currentDir = getCurrentDir();
  const templatesDir = currentDir.includes('/dist')
    ? path.resolve(currentDir, "../templates")
    : path.resolve(currentDir, "../../templates");

  // Copy .agent structure
  const agentSrc = path.join(templatesDir, ".agent");
  const agentDest = path.join(targetPath, ".agent");
  await copyDirectory(agentSrc, agentDest, created, skipped);

  // Copy .claude structure if requested
  if (options.claude) {
    const claudeSrc = path.join(templatesDir, ".claude");
    const claudeDest = path.join(targetPath, ".claude");
    await copyDirectory(claudeSrc, claudeDest, created, skipped);

    // Generate slash command types if requested
    if (options.genTypes) {
      try {
        const commandsDir = path.join(claudeDest, "commands");
        const commands = await parseSlashCommands(commandsDir);

        if (commands.length > 0) {
          const code = generateSlashCommandTypesCode(commands);
          const typesPath = path.join(claudeDest, "types.ts");

          await writeFile(typesPath, code, "utf-8");
          created.push(typesPath);
          typesGenerated = true;
        }
      } catch (error) {
        // Silently skip if slash commands can't be generated
        console.warn("⚠️  Could not generate slash command types");
      }
    }
  }

  // Append gitignore patterns
  await appendGitignore(targetPath, templatesDir, created, skipped);

  return {
    created,
    skipped,
    typesGenerated,
  };
}
