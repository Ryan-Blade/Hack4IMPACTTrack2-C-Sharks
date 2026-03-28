import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppShell from './AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (err: any) {
  const root = document.getElementById('root')
  if (root) {
    root.style.cssText = 'padding:2rem;color:#ef4444;font-family:monospace;background:#0f172a;min-height:100vh'
    root.innerHTML = `<h2>EcoSync Mount Error</h2><pre>${err?.stack || err}</pre>`
  }
  console.error('Mount error:', err)
}
