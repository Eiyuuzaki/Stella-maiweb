// 全局状态：会话、日志流、主题、Snackbar。
// 用 Context 而不是 redux —— 状态面很窄，没必要引依赖。
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, subscribeLog, fmtTime } from './api.js'
import { logColors } from './theme.js'

const AppCtx = createContext(null)

const MAX_LOG = 800
const THEME_KEY = 'astral-webui-mode'
const PAGE_KEY = 'astral-webui-page'

function initialMode() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* 隐私模式下 localStorage 不可用 */ }
  // 没有保存过就跟随系统
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return 'dark'
}

export function AppProvider({ children }) {
  const [mode, setMode] = useState(initialMode)
  const [session, setSession] = useState(null)
  const [health, setHealth] = useState(null)
  const [logs, setLogs] = useState([])
  const [streamState, setStreamState] = useState('connecting')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [page, setPageState] = useState(() => {
    try { return localStorage.getItem(PAGE_KEY) || 'login' } catch { return 'login' }
  })

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  // ---- 初始状态 ----
  const refreshStatus = useCallback(async () => {
    try {
      const s = await api.status()
      setSession(s.session)
    } catch (e) {
      // network 类错误会由 BackendPanel 的常驻诊断展示，不在这里弹 toast 轰炸
      if (e.kind !== 'network') {
        setToast({ kind: 'error', text: e.message })
      }
    }
  }, [])

  useEffect(() => {
    // 探测失败时保留错误信息，供 BackendPanel 精确诊断
    api.health()
      .then(setHealth)
      .catch((e) => setHealth({ ok: false, error: e.message, kind: e.kind }))
    refreshStatus()
  }, [refreshStatus])

  // ---- 日志流 ----
  useEffect(() => {
    const close = subscribeLog(
      (line) => {
        setLogs((prev) => {
          const next = prev.length >= MAX_LOG ? prev.slice(prev.length - MAX_LOG + 1) : prev.slice()
          next.push(line)
          return next
        })
      },
      (st) => setStreamState(st),
    )
    return close
  }, [])

  const notify = useCallback((kind, text) => {
    setToast({ kind, text, id: Date.now() })
  }, [])

  const clearLogs = useCallback(() => setLogs([]), [])

  const setPage = useCallback((p) => {
    setPageState(p)
    try { localStorage.setItem(PAGE_KEY, p) } catch { /* ignore */ }
  }, [])

  // 统一的「跑一个后端动作」：自动置忙、自动刷新会话、错误弹 toast
  const act = useCallback(
    async (fn, { refresh = true, successText } = {}) => {
      setBusy(true)
      try {
        const out = await fn()
        if (successText) notify('success', successText)
        if (refresh) await refreshStatus()
        return out
      } catch (e) {
        notify('error', e.message || String(e))
        return null
      } finally {
        setBusy(false)
      }
    },
    [notify, refreshStatus],
  )

  const value = useMemo(
    () => ({
      mode, toggleMode,
      session, health, logs, streamState, toast, busy, page, setPage,
      refreshStatus, notify, clearLogs, act,
      logColors: logColors(mode),
    }),
    [mode, toggleMode, session, health, logs, streamState, toast, busy, page, setPage,
      refreshStatus, notify, clearLogs, act],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}

export { fmtTime }
