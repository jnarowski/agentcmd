#!/usr/bin/env node
import { Command } from "commander";
import { installCommand } from "./commands/install.js";
import { startCommand } from "./commands/start.js";
import { configCommand } from "./commands/config.js";

// Version is inlined at build time via esbuild define
declare const __CLI_VERSION__: string;
const VERSION = typeof __CLI_VERSION__ !== 'undefined' ? __CLI_VERSION__ : '0.0.0-dev';

const program = new Command();

program
  .name("agent-workflows-ui")
  .description("Visual UI for agent workflows")
  .version(VERSION);

program
  .command("install")
  .description("Initialize database and configuration")
  .option("--force", "Overwrite existing database")
  .action(installCommand);

program
  .command("start")
  .description("Start the server")
  .option("-p, --port <number>", "Server port", parseInt)
  .option("--inngest-port <number>", "Inngest dev UI port", parseInt)
  .option("--host <address>", "Server host address")
  .action(startCommand);

program
  .command("config")
  .description("Manage configuration")
  .option("--show", "Display current configuration")
  .option("--edit", "Open config file in $EDITOR")
  .option("--get <key>", "Get value of specific key")
  .option("--set <key=value>", "Set value of specific key")
  .option("--path", "Print config file path")
  .action(configCommand);

program.parse();
