import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cesium from "vite-plugin-cesium"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    cesium(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
  },
})
