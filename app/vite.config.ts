import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { spawn, ChildProcess } from "child_process"
import * as fs from "fs"

// ---------------------------------------------------------------------------
// Auto-Backend Plugin
// Spawns the Python backend when `npm run dev` starts and kills it on exit.
// ---------------------------------------------------------------------------
function autoBackend(): Plugin {
  let backendProcess: ChildProcess | null = null

  const backendDir = path.resolve(__dirname, "../backend")
  const pythonExe = path.join(backendDir, "venv", "Scripts", "python.exe")
  // Fall back to system python if venv not present
  const python = fs.existsSync(pythonExe) ? pythonExe : "python"

  return {
    name: "auto-backend",
    configureServer(server) {
      console.log("\n🌿 [EcoSync] Auto-starting backend...")

      backendProcess = spawn(python, ["main.py", "--buildings", "50"], {
        cwd: backendDir,
        stdio: "inherit",
        shell: false,
      })

      backendProcess.on("spawn", () => {
        console.log("✅ [EcoSync] Backend process started (PID: " + backendProcess?.pid + ")")
      })

      backendProcess.on("error", (err) => {
        console.error("❌ [EcoSync] Failed to start backend:", err.message)
      })

      backendProcess.on("exit", (code) => {
        if (code !== null) {
          console.log(`⚠️  [EcoSync] Backend exited with code ${code}`)
        }
        backendProcess = null
      })

      // Kill backend when Vite dev server closes
      const cleanup = () => {
        if (backendProcess && !backendProcess.killed) {
          console.log("\n🛑 [EcoSync] Stopping backend...")
          backendProcess.kill("SIGTERM")
          backendProcess = null
        }
      }

      server.httpServer?.on("close", cleanup)
      process.on("exit", cleanup)
      process.on("SIGINT", () => { cleanup(); process.exit(0) })
      process.on("SIGTERM", () => { cleanup(); process.exit(0) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react(), autoBackend()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three.js + react-three ecosystem → separate chunk (~1.6 MB)
          if (id.includes('three') || id.includes('@react-three')) {
            return 'vendor-three';
          }
          // Recharts → separate chunk
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true
      }
    }
  }
});
