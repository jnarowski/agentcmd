import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { access, mkdtemp, rm, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { initProject } from "./initProject";

/**
 * Get the templates directory path
 * This mimics how initProject.ts resolves the templates path
 */
function getTemplatesDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  // In development: src/utils -> ../../templates
  // In built package: dist -> ../templates
  const isDevelopment = currentDir.includes("/src/");
  const templatesDir = isDevelopment
    ? path.join(currentDir, "../../templates")
    : path.join(currentDir, "../templates");

  return templatesDir;
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

describe("Template files packaging", () => {
  it("should include gitignore.template file (npm excludes .gitignore)", async () => {
    const templatesDir = getTemplatesDir();
    const gitignorePath = path.join(templatesDir, "gitignore.template");

    const fileExists = await exists(gitignorePath);
    expect(fileExists).toBe(true);
  });

  it("should include .claude/commands directory", async () => {
    const templatesDir = getTemplatesDir();
    const claudeCommandsPath = path.join(templatesDir, ".claude/commands");

    const dirExists = await exists(claudeCommandsPath);
    expect(dirExists).toBe(true);
  });

  it("should include command files", async () => {
    const templatesDir = getTemplatesDir();
    const commandPath = path.join(templatesDir, ".claude/commands/audit.md");

    const fileExists = await exists(commandPath);
    expect(fileExists).toBe(true);
  });

  it("should include .agent/workflows/definitions directory", async () => {
    const templatesDir = getTemplatesDir();
    const workflowsPath = path.join(templatesDir, ".agent/workflows/definitions");

    const dirExists = await exists(workflowsPath);
    expect(dirExists).toBe(true);
  });

  it("should include example workflow files", async () => {
    const templatesDir = getTemplatesDir();
    const exampleWorkflowPath = path.join(
      templatesDir,
      ".agent/workflows/definitions/example-basic-workflow.ts"
    );

    const fileExists = await exists(exampleWorkflowPath);
    expect(fileExists).toBe(true);
  });

  it("should include .gitkeep files in subdirectories", async () => {
    const templatesDir = getTemplatesDir();
    const gitkeepPaths = [
      ".agent/specs/todo/.gitkeep",
      ".agent/specs/doing/.gitkeep",
      ".agent/specs/done/.gitkeep",
      ".agent/workflows/executions/.gitkeep",
      ".agent/agents/.gitkeep",
      ".agent/docs/.gitkeep",
      ".agent/logs/.gitkeep",
    ];

    for (const gitkeepPath of gitkeepPaths) {
      const fullPath = path.join(templatesDir, gitkeepPath);
      const fileExists = await exists(fullPath);
      expect(fileExists).toBe(true);
    }
  });

  it("should have templates directory", async () => {
    const templatesDir = getTemplatesDir();
    const dirExists = await exists(templatesDir);

    expect(dirExists).toBe(true);
  });
});

describe("initProject", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(path.join(tmpdir(), "agentcmd-test-"));
  });

  afterEach(async () => {
    // Clean up temp directory after each test
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should generate types at .agent/generated/slash-commands.ts", async () => {
    const result = await initProject(tempDir, {
      claude: true,
      genTypes: true,
      yes: true,
    });

    expect(result.typesGenerated).toBe(true);

    // Verify file exists at correct path
    const typesPath = path.join(tempDir, ".agent/generated/slash-commands.ts");
    const fileExists = await exists(typesPath);
    expect(fileExists).toBe(true);

    // Verify it contains expected content
    const content = await readFile(typesPath, "utf-8");
    expect(content).toContain("export const SlashCommandArgOrder");
    expect(content).toContain("export function buildSlashCommand");
  });

  it("should create .agent/generated directory", async () => {
    await initProject(tempDir, {
      claude: true,
      genTypes: true,
      yes: true,
    });

    const generatedDir = path.join(tempDir, ".agent/generated");
    const dirExists = await exists(generatedDir);
    expect(dirExists).toBe(true);
  });

  it("should not generate types when genTypes is false", async () => {
    const result = await initProject(tempDir, {
      claude: true,
      genTypes: false,
      yes: true,
    });

    expect(result.typesGenerated).toBe(false);

    const typesPath = path.join(tempDir, ".agent/generated/slash-commands.ts");
    const fileExists = await exists(typesPath);
    expect(fileExists).toBe(false);
  });

  it("should not generate types when claude is false", async () => {
    const result = await initProject(tempDir, {
      claude: false,
      genTypes: true,
      yes: true,
    });

    expect(result.typesGenerated).toBe(false);

    const typesPath = path.join(tempDir, ".agent/generated/slash-commands.ts");
    const fileExists = await exists(typesPath);
    expect(fileExists).toBe(false);
  });

  it("should copy .claude/commands when claude is true", async () => {
    await initProject(tempDir, {
      claude: true,
      genTypes: false,
      yes: true,
    });

    const commandsDir = path.join(tempDir, ".claude/commands");
    const dirExists = await exists(commandsDir);
    expect(dirExists).toBe(true);

    const auditCommand = path.join(commandsDir, "audit.md");
    const fileExists = await exists(auditCommand);
    expect(fileExists).toBe(true);
  });

  it("should copy .agent structure", async () => {
    await initProject(tempDir, {
      claude: false,
      genTypes: false,
      yes: true,
    });

    const agentDir = path.join(tempDir, ".agent");
    const dirExists = await exists(agentDir);
    expect(dirExists).toBe(true);

    // Check subdirectories
    const workflowsDir = path.join(agentDir, "workflows/definitions");
    const workflowsDirExists = await exists(workflowsDir);
    expect(workflowsDirExists).toBe(true);
  });
});
