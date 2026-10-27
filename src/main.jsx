import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { makeTheme } from './theme.js'
import { AppProvider, useApp } from './store.jsx'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './ui-font.css'

// 捕获 React 之外的错误（模块加载失败、异步抛错等）
// —— 这些不会触发 ErrorBoundary，但同样会导致白屏。
window.addEventListener('error', (e) => {
  console.error('[window.onerror]', e.message, e.error?.stack || '')
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason?.message || e.reason)
})

function Root() {
  const { mode } = useApp()
  const theme = React.useMemo(() => makeTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

const container = document.getElementById('root')
if (!container) {
  document.body.innerHTML =
    '<pre style="color:#ffb4ab;background:#410002;padding:24px;font:13px Consolas">' +
    '#root 不存在 —— index.html 被改坏了？</pre>'
} else {
  try {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppProvider>
            <Root />
          </AppProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (err) {
    // 同步挂载失败：把错误直接写进页面，别白屏
    container.innerHTML =
      '<pre style="color:#ffb4ab;background:#410002;padding:24px;font:13px Consolas;white-space:pre-wrap">' +
      '挂载失败：\n' + (err?.name || 'Error') + ': ' + (err?.message || err) + '\n\n' +
      String(err?.stack || '').split('\n').slice(0, 12).join('\n') + '</pre>'
  }
}

// main.jsx 持有 createRoot 的根，Fast Refresh 无法安全地半更新它 ——
// 任何改动都整页 reload，避免「模块更新了但 React 树还是旧的」这种半死状态。
if (import.meta.hot) {
  import.meta.hot.invalidate()
}
