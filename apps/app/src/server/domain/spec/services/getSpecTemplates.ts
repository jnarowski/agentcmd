import { promises as fs } from "fs";
import path from "path";

// ============================================================================
// PUBLIC API
// ============================================================================

export interface SpecTemplate {
  id: string;
  name: string;
  description: string;
  type: "simple" | "multiphase-planning" | "multiphase-execution";
}

/**
 * Get available spec templates
 * Returns hardcoded templates with metadata for UI display
 */
export async function getSpecTemplates(): Promise<SpecTemplate[]> {
  return [
    {
      id: "simple",
      name: "Simple",
      description: "Single-phase spec for straightforward features, bugs, or tasks",
      type: "simple",
    },
    {
      id: "multiphase-planning",
      name: "Multiphase Planning",
      description: "Three-phase exploration: Explore → Clarify → Document (PRD)",
      type: "multiphase-planning",
    },
    {
      id: "multiphase-execution",
      name: "Multiphase Execution",
      description: "Phased implementation spec with AI handoff prompts",
      type: "multiphase-execution",
    },
  ];
}

/**
 * Get template content by ID
 * Reads the markdown file from .claude/commands/spec-templates/
 */
export async function getSpecTemplateContent(
  projectPath: string,
  templateId: string
): Promise<string | null> {
  const templatePath = path.join(
    projectPath,
    ".claude",
    "commands",
    "spec-templates",
    `${templateId}.md`
  );

  try {
    const content = await fs.readFile(templatePath, "utf-8");
    return content;
  } catch {
    return null;
  }
}
