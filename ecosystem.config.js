const fs = require("fs");
const path = require("path");

// Load .env file from apps/app directory
const envPath = path.join(__dirname, "apps/app/.env");
const envConfig = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        envConfig[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

module.exports = {
  apps: [
    {
      name: "agentcmd",
      script: "pnpm",
      args: "start",
      // cwd: "/Users/jnarowski/Dev/sourceborn/src/agentcmd",
      interpreter: "none",
      env: {
        ...envConfig,
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
