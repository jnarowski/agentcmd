import { existsSync } from "fs";
import { spawn } from "child_process";
import { getConfigPath } from "../utils/paths";
import { loadConfig, saveConfig } from "../utils/config";

interface ConfigOptions {
  show?: boolean;
  edit?: boolean;
  get?: string;
  set?: string;
  path?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  const configPath = getConfigPath();

  try {
    // --path: Print config file path only
    if (options.path) {
      console.log(configPath);
      return;
    }

    // --show: Display current config + file location
    if (options.show) {
      if (!existsSync(configPath)) {
        console.error(`Config file not found at ${configPath}`);
        console.error("Run 'agentcmd install' first.");
        process.exit(1);
      }

      const config = loadConfig();
      console.log(`Config file: ${configPath}`);
      console.log("");
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    // --edit: Open config in $EDITOR
    if (options.edit) {
      if (!existsSync(configPath)) {
        console.error(`Config file not found at ${configPath}`);
        console.error("Run 'agentcmd install' first.");
        process.exit(1);
      }

      const editor = process.env.EDITOR || process.env.VISUAL || "nano";

      const child = spawn(editor, [configPath], {
        stdio: "inherit",
      });

      child.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Editor exited with code ${code}`);
          process.exit(code || 1);
        }
        console.log("Config file updated.");
      });

      return;
    }

    // --get <key>: Get specific value
    if (options.get) {
      const config = loadConfig();
      const key = options.get as keyof typeof config;

      if (!(key in config)) {
        console.error(`Unknown config key: ${key}`);
        console.error(
          `Available keys: ${Object.keys(config).join(", ")}`
        );
        process.exit(1);
      }

      console.log(config[key]);
      return;
    }

    // --set <key>=<value>: Update value
    if (options.set) {
      const match = options.set.match(/^([^=]+)=(.+)$/);
      if (!match) {
        console.error(
          'Invalid format for --set. Use: --set key=value'
        );
        process.exit(1);
      }

      const [, key, value] = match;
      const config = loadConfig();

      if (!(key in config)) {
        console.error(`Unknown config key: ${key}`);
        console.error(
          `Available keys: ${Object.keys(config).join(", ")}`
        );
        process.exit(1);
      }

      // Parse value based on existing type
      let parsedValue: string | number;
      if (typeof config[key as keyof typeof config] === "number") {
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          console.error(`Value for ${key} must be a number`);
          process.exit(1);
        }
      } else {
        parsedValue = value;
      }

      const updatedConfig = {
        ...config,
        [key]: parsedValue,
      };

      saveConfig(updatedConfig);
      console.log(`Updated ${key} = ${parsedValue}`);
      console.log(`Config saved to ${configPath}`);
      return;
    }

    // No flags: show help
    console.log("Usage: agentcmd config [options]");
    console.log("");
    console.log("Options:");
    console.log("  --show         Display current configuration");
    console.log("  --edit         Open config file in $EDITOR");
    console.log("  --get <key>    Get value of specific key");
    console.log("  --set <key>=<value>  Set value of specific key");
    console.log("  --path         Print config file path");
  } catch (error) {
    console.error(
      "Config command failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}
