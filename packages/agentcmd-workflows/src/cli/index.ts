#!/usr/bin/env node

/**
 * CLI entry point for workflow-sdk
 * Supports subcommands: init, generate-slash-types
 */

import { Command } from "commander";
import { parseSlashCommands } from "../utils/parseSlashCommands";
import { generateSlashCommandTypesCode } from "../utils/generateSlashCommandTypes";
import { initProject } from "../utils/initProject";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const program = new Command();

program
  .name("workflow-sdk")
  .description("CLI tools for workflow-sdk")
  .version("1.0.0");

// Init command
program
  .command("init")
  .description("Initialize agentcmd workflow project structure")
  .argument("[path]", "Target directory", process.cwd())
  .action(async (targetPath: string) => {
    try {
      const result = await initProject(targetPath);

      // Print summary
      console.log("\n✨ Initialization complete!");
      console.log("\n📦 Installed:");
      console.log("   ✓ .agent/ folder structure (specs, workflows, logs)");
      console.log("   ✓ Claude Code slash commands in .claude/commands/");
      console.log("   ✓ Generated TypeScript types for slash commands");

      console.log(`\n📁 Created ${result.created.length} file(s)`);

      if (result.skipped.length > 0) {
        console.log(`\n⏭️  Skipped ${result.skipped.length} existing file(s)`);
      }

      console.log("\n🚀 Next steps:");
      console.log("   1. Review example workflows in .agent/workflows/definitions/");
      console.log("   2. Use slash commands: /cmd:generate-spec, /cmd:implement-spec, etc.");
      console.log("   3. Create custom workflows and commands");

      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error: ${message}`);
      process.exit(1);
    }
  });

// Generate slash types command
program
  .command("generate-slash-types")
  .description("Generate TypeScript types from .claude/commands/*.md")
  .option("--input <dir>", "Input directory", ".claude/commands")
  .option("--output <file>", "Output file path", ".agent/generated/slash-commands.ts")
  .action(async (options) => {
    try {
      console.log("🔍 Scanning slash commands in:", options.input);

      // Parse slash commands from .md files
      const commands = await parseSlashCommands(options.input);

      console.log(`✅ Found ${commands.length} command(s)`);

      // Generate TypeScript code
      const code = generateSlashCommandTypesCode(commands);

      // Ensure output directory exists
      const outputDir = path.dirname(options.output);
      await mkdir(outputDir, { recursive: true });

      // Write generated code to file
      await writeFile(options.output, code, "utf-8");

      console.log(`✨ Generated types at: ${options.output}`);
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error: ${message}`);
      process.exit(1);
    }
  });

program.parse();
