/**
 * Refresh Documentation Workflow
 *
 * Regenerates AgentCmd documentation by extracting current state from codebase sources of truth.
 * Updates AUTO-GENERATED sections while preserving hand-crafted content.
 *
 * Usage:
 *   /refresh-docs [section]
 *
 * Sections: step-types, sdk-api, slash-commands, cli, config, examples, all
 */

import {
  defineWorkflow,
  defineSchema,
  buildSlashCommand,
} from "agentcmd-workflows";

const argsSchema = defineSchema({
  type: "object",
  properties: {
    section: {
      type: "string",
      enum: [
        "step-types",
        "sdk-api",
        "slash-commands",
        "cli",
        "config",
        "examples",
        "all",
      ],
      default: "all",
      description: "Section to refresh or 'all' for complete refresh",
    },
  },
});

export default defineWorkflow(
  {
    id: "refresh-docs",
    name: "Refresh Documentation",
    description: "Regenerate documentation from code sources of truth",
    argsSchema,
    phases: [
      { id: "extract", label: "Extract Sources" },
      { id: "generate", label: "Generate Docs" },
      { id: "validate", label: "Validate" },
    ],
  },
  async ({ event, step }) => {
    const { section = "all" } = event.data.args || {};
    const projectPath = (event.data.projectPath as string) || process.cwd();

    // Track state across phases
    interface WorkflowContext {
      section: string;
      filesUpdated: string[];
      sectionsRegenerated: string[];
      validationWarnings: string[];
    }

    const ctx: WorkflowContext = {
      section,
      filesUpdated: [],
      sectionsRegenerated: [],
      validationWarnings: [],
    };

    await step.annotation("workflow-start", {
      message: `Starting documentation refresh for section: ${section}`,
    });

    // ========================================
    // PHASE 1: Extract Sources
    // ========================================
    await step.phase("extract", async () => {
      await step.annotation("extract-start", {
        message: "Extracting context from codebase sources of truth",
      });

      // Use Claude in plan mode to extract and analyze sources
      const extractResult = await step.agent("extract-sources", {
        agent: "claude",
        workingDir: projectPath,
        permissionMode: "plan", // Read-only extraction
        prompt: `Extract documentation context from these 6 codebase sources:

**Your task**: Read and analyze these files to extract current state for documentation generation.

**Sources to extract**:

1. **TypeScript Types** - \`packages/agentcmd-workflows/src/types/steps.ts\`
   - Extract all step config interfaces (AgentStepConfig, AiStepConfig, etc.)
   - Note timeout constants in comments
   - Extract JSDoc descriptions

2. **Package Exports** - \`packages/agentcmd-workflows/src/index.ts\` and \`packages/agent-cli-sdk/src/index.ts\`
   - List all exported functions
   - List all exported types
   - Extract JSDoc comments for function descriptions

3. **Slash Commands** - \`.claude/commands/**/*.md\`
   - Parse YAML frontmatter (description, argument-hint)
   - Extract command names from filenames
   - Build command reference data

4. **Example Workflows** - \`.agent/workflows/definitions/example-*.ts\`
   - Extract workflow configs (id, name, phases)
   - Identify step usage patterns
   - Note interesting code snippets for docs

5. **CLI Definitions** - \`apps/app/src/cli/index.ts\`
   - Extract command definitions (install, start, config)
   - List flags and options
   - Extract descriptions and defaults

6. **Environment Variables** - \`apps/app/.env.example\`
   - Extract variable names
   - Extract inline comments (descriptions)
   - Categorize: Required | Server | Frontend | AI | Inngest

**Output format**: Provide comprehensive summary of extracted data organized by source type. This will be used to generate documentation in next phase.

**Section filter**: Focus on sources relevant to "${section}" section (or all if "all").`,
      });

      await step.annotation("extract-complete", {
        message: `Extracted context from 6 sources for section: ${section}`,
      });

      return extractResult;
    });

    // ========================================
    // PHASE 2: Generate Documentation
    // ========================================
    await step.phase("generate", async () => {
      await step.annotation("generate-start", {
        message: "Generating updated documentation",
      });

      // Use Claude to generate docs based on extracted sources
      const generateResult = await step.agent("generate-docs", {
        agent: "claude",
        workingDir: projectPath,
        permissionMode: "acceptEdits", // Allow file edits
        prompt: `Generate updated documentation for section "${section}".

**Context**: You have already extracted current state from 6 codebase sources in the previous phase.

**Your task**:
1. Read existing documentation files in \`apps/appsite/content/docs/\`
2. Identify AUTO-GENERATED sections (marked with \`<!-- AUTO-GENERATED:id START/END -->\`)
3. Update ONLY the marked sections with current extracted data
4. Preserve all hand-crafted content outside markers
5. Update timestamps in regenerated sections
6. Follow documentation decisions:
   - Audience: Intermediate (familiar with AI CLI tools)
   - Format: Mermaid diagrams for concepts, code-heavy for reference
   - Examples: Tiered (ultra-simple → focused → real workflows)
   - Tone: Technical & concise but fun

**Section-specific targets**:

${
  section === "step-types" || section === "all"
    ? `
**Step Types** (\`reference/steps/*.mdx\`):
- Update config interfaces from extracted types
- Update timeout values
- Preserve examples and explanations
`
    : ""
}

${
  section === "sdk-api" || section === "all"
    ? `
**SDK API** (\`reference/sdk-api.mdx\`):
- Update function signatures from package exports
- Update type exports
- Preserve usage examples
`
    : ""
}

${
  section === "slash-commands" || section === "all"
    ? `
**Slash Commands** (\`reference/slash-commands.mdx\`):
- Update command reference table from .claude/commands/
- Include all command descriptions and args
- Preserve introduction and examples
`
    : ""
}

${
  section === "cli" || section === "all"
    ? `
**CLI Reference** (\`reference/cli.mdx\`):
- Update command reference from CLI definitions
- Include all flags and options
- Preserve usage examples
`
    : ""
}

${
  section === "config" || section === "all"
    ? `
**Configuration** (\`reference/configuration.mdx\`):
- Update env var table from .env.example
- Categorize variables properly
- Preserve configuration examples
`
    : ""
}

${
  section === "examples" || section === "all"
    ? `
**Examples** (\`examples/*.mdx\`):
- Update code snippets from example workflows
- Preserve explanations and walkthroughs
- Ensure progressive complexity
`
    : ""
}

**Important**:
- Only update AUTO-GENERATED sections
- Preserve formatting and style
- Add \`<!-- Last updated: 2025-11-16 -->\` timestamp
- Track which files you updated

**Output**: Report which files you modified and which AUTO-GENERATED sections you regenerated.`,
      });

      await step.annotation("generate-complete", {
        message: "Documentation generation complete",
      });

      return generateResult;
    });

    // ========================================
    // PHASE 3: Validate
    // ========================================
    await step.phase("validate", async () => {
      await step.annotation("validate-start", {
        message: "Running validation checks",
      });

      // Use Claude in plan mode to validate generated docs
      const validateResult = await step.agent("validate-docs", {
        agent: "claude",
        workingDir: projectPath,
        permissionMode: "plan", // Read-only validation
        prompt: `Validate the generated documentation.

**Validation checks**:

1. **Internal Links** - Verify all \`[Link](/docs/path)\` point to existing pages
   - Scan all .mdx files in \`apps/appsite/content/docs/\`
   - Report broken links with file and target

2. **Code Syntax** - Validate TypeScript/JavaScript snippets parse correctly
   - Check all code blocks in AUTO-GENERATED sections
   - Report syntax errors with file and line number

3. **Outdated Signatures** - Compare docs with source code
   - Verify step configs match \`types/steps.ts\`
   - Verify function signatures match package exports
   - Report mismatches

4. **Orphaned Pages** - Detect docs not linked from anywhere
   - Check all .mdx files are referenced in meta.json or other pages
   - Report orphaned files

**Output format**:
- List of issues found (if any)
- Categorize as ❌ Error or ⚠️ Warning
- Include file paths and specific problems
- If no issues: "✅ All validation checks passed"`,
      });

      await step.annotation("validate-complete", {
        message: "Validation checks complete",
      });

      return validateResult;
    });

    // ========================================
    // Final Report
    // ========================================
    await step.annotation("workflow-complete", {
      message: "Documentation refresh workflow complete",
    });

    // Create summary artifact
    await step.artifact("refresh-summary", {
      name: "refresh-docs-summary.md",
      type: "text",
      content: `# Documentation Refresh Summary

## Section: ${section}

## Execution
- **Started**: ${new Date().toISOString()}
- **Status**: Complete

## Phases
1. ✅ Extract Sources - Extracted context from 6 codebase sources
2. ✅ Generate Docs - Updated AUTO-GENERATED sections
3. ✅ Validate - Ran comprehensive validation checks

## Next Steps
1. Review changes: \`git diff apps/appsite/content/docs/\`
2. Verify updated content is accurate
3. Fix any validation warnings
4. Commit when ready: \`git add apps/appsite/content/docs/ && git commit -m "docs: Refresh ${section} from codebase"\`

---
Generated by /refresh-docs workflow
`,
    });

    return {
      success: true,
      summary: {
        section,
        phasesCompleted: ["extract", "generate", "validate"],
        completedAt: new Date().toISOString(),
      },
    };
  }
);
