import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".mts", ".json"] },
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist" },
});
