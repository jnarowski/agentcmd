/**
 * Custom Node.js loader for workflow files
 * Enables:
 * - Extensionless imports (e.g., import { foo } from "./utils")
 * - TypeScript compilation via tsx
 * - Project-local node_modules resolution
 */
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { createRequire, isBuiltin } from "module";

let projectPath = null;

export function initialize(data) {
  if (data?.projectPath) {
    projectPath = data.projectPath;
  }
}

export async function resolve(specifier, context, nextResolve) {
  const { parentURL } = context;

  // Skip Node.js built-in modules
  if (isBuiltin(specifier) || specifier.startsWith("node:")) {
    return nextResolve(specifier, context);
  }

  // Handle relative imports - try adding extensions
  if (specifier.startsWith(".") || specifier.startsWith("..")) {
    if (parentURL) {
      const parentPath = fileURLToPath(parentURL.replace(/\?.*$/, ""));
      const baseDir = dirname(parentPath);
      const basePath = join(baseDir, specifier);

      // Try extensions in order
      const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
      for (const ext of extensions) {
        const fullPath = basePath + ext;
        if (existsSync(fullPath)) {
          return {
            url: pathToFileURL(fullPath).href,
            shortCircuit: true,
          };
        }
      }

      // Try index files
      for (const ext of extensions) {
        const indexPath = join(basePath, `index${ext}`);
        if (existsSync(indexPath)) {
          return {
            url: pathToFileURL(indexPath).href,
            shortCircuit: true,
          };
        }
      }
    }
  }

  // Handle bare imports - resolve from project's node_modules
  if (!specifier.startsWith("/") && !specifier.startsWith("file://") && !specifier.startsWith(".")) {
    if (parentURL && projectPath) {
      try {
        const parentPath = fileURLToPath(parentURL.replace(/\?.*$/, ""));
        const require = createRequire(parentPath);
        const resolved = require.resolve(specifier);
        return {
          url: pathToFileURL(resolved).href,
          shortCircuit: true,
        };
      } catch {
        // Fall through to default resolution
      }
    }
  }

  // Let default resolution handle it
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // Let tsx handle TypeScript files
  return nextLoad(url, context);
}
