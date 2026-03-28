import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'
import IntroPage from './pages/IntroPage.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/intro" element={<IntroPage />} />
            <Route path="/dashboard" element={<App />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" />
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
