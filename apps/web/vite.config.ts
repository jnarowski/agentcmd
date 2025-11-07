import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from apps/web directory (where .env file is located)
  const envDir = path.resolve(__dirname, './');
  const env = loadEnv(mode, envDir, '');
  const serverPort = parseInt(env.PORT) || 3456;
  const vitePort = parseInt(env.VITE_PORT) || 5173;

  return {
    envDir: envDir, // Tell Vite where to find .env files
    root: 'src/client',
    publicDir: path.resolve(__dirname, './public'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: '../../dist/client',
      emptyOutDir: true,
    },
    server: {
      port: vitePort,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://localhost:${serverPort}`,
          ws: true,
        },
      },
    },
  };
});
