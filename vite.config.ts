import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy semua /api/* → REST Gateway (yang konek ke gRPC server)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // Proxy WebSocket /ws → WebSocket Gateway
      "/ws": {
        target: "ws://localhost:3002",
        ws: true,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ws/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
