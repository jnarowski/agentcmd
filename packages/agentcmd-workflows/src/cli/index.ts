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
  .description("Initialize workflow project structure")
  .argument("[path]", "Target directory", process.cwd())
  .option("--claude", "Install Claude slash commands (default: true)")
  .option("--no-claude", "Skip Claude slash commands installation")
  .option("--gen-types", "Generate slash command types (default: true)")
  .option("--no-gen-types", "Skip slash command type generation")
  .option("-y, --yes", "Skip prompts and use defaults")
  .action(async (targetPath: string, options) => {
    try {
      const result = await initProject(targetPath, {
        claude: options.claude,
        genTypes: options.genTypes,
        yes: options.yes,
      });

      // Print summary
      console.log("\n✨ Initialization complete!");
      console.log(`\n📁 Created ${result.created.length} file(s):`);
      result.created.forEach((file) => console.log(`   ✓ ${file}`));

      if (result.skipped.length > 0) {
        console.log(`\n⏭️  Skipped ${result.skipped.length} existing file(s):`);
        result.skipped.forEach((file) => console.log(`   - ${file}`));
      }

      if (result.typesGenerated) {
        console.log("\n🎯 Slash command types generated");
      }

      console.log("\n🚀 Next steps:");
      console.log("   1. Review example workflows in .agent/workflows/definitions/");
      console.log("   2. Create your own workflows");
      console.log("   3. Run workflows with: workflow-sdk run <workflow-name>");

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
