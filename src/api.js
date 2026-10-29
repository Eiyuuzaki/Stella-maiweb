// 后端 API 客户端 + SSE 日志订阅。
//
// ★ 后端是**可替换组件**。base 地址由 src/apibase.js 解析（查询参数 > localStorage
//   > 构建时变量 > 同源），本文件不假设任何特定后端。
//
// ★ 契约见 web/README.md「后端契约」一节。

import { resolveApiBase, LS_KEY, SOURCE_LABELS, normalize } from './apibase.js'

const RESOLVED = resolveApiBase({
  search: typeof location !== 'undefined' ? location.search : '',
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
  envBase: import.meta.env?.VITE_API_BASE || '',
})

export const API_SOURCE = RESOLVED.source
export const API_SOURCE_LABELS = SOURCE_LABELS[RESOLVED.source] || RESOLVED.source

// ★ API 前缀：所有请求路径都会拼上它。
//   - 指定了后端地址（query/storage/env）-> "http://host:port/api"
//   - 同源                              -> "/api"
//
// ★★ 这是本次多个诡异 bug 的总根因：旧版在同源时把 base 解析成空字符串，
//   fetch(API_BASE + '/status') 就变成了裸的 /status —— 丢了 /api 前缀。
//   表现：8765 上 404、5173 上被 SPA fallback 回 HTML（"响应不是 JSON"）、
//   能力探测拿到空括号、SSE 连不上。前缀必须无条件存在。
export const API_BASE = (RESOLVED.base || '') + '/api'

export const apiUrl = (path) => API_BASE + path

export function setApiBase(url) {
  const v = normalize(url)
  if (v) localStorage.setItem(LS_KEY, v)
  else localStorage.removeItem(LS_KEY)
  location.reload()   // 让 EventSource 与所有模块拿到新地址
}

export function getApiBase() {
  return API_BASE
}

async function req(path, options = {}) {
  let res
  try {
    res = await fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (e) {
    // fetch 抛 TypeError = 网络层失败（后端没起 / 地址错 / CORS 被拦）。
    // ★ 必须和 HTTP 错误区分开 —— 前者连服务器都没碰到。
    const err = new Error('无法连接后端 ' + (API_BASE || '（同源）') + '：' + (e.message || e))
    err.kind = 'network'
    err.code = 'network_error'
    throw err
  }
  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }
  if (!res.ok) {
    // 后端统一错误格式：{ ok:false, code, message }
    let message = data?.message || `HTTP ${res.status}`
    // 404 基本意味着「打到了没有该路由的服务器」—— 最常见的原因是
    // 后端地址配错了（指向了前端自己 / 别的服务）。给一句可操作的提示。
    if (res.status === 404) {
      message += `（${API_BASE || '同源'} 上没有 ${path} —— 请检查后端地址）`
    }
    if (res.status >= 502) {
      message += `（无法连接到 ${API_BASE || '同源'}）`
    }
    const err = new Error(message)
    err.kind = 'http'
    err.code = data?.code
    err.status = res.status
    err.payload = data
    throw err
  }
  // 200 但不是预期 JSON => 大概率打到了一个返回 HTML 的服务（比如前端静态服务器）
  if (data?.raw !== undefined && !data?.ok) {
    const err = new Error(
      '响应不是 JSON —— ' + (API_BASE || '同源') + path +
      ' 返回的可能是 HTML 页面。这个地址上跑的不是 Astral 后端')
    err.kind = 'bad-response'
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export const api = {
  health: () => req('/health'),
  status: () => req('/status'),

  login: (qr, pullSnapshot = true) =>
    req('/login', { method: 'POST', body: { qr, pull_snapshot: pullSnapshot } }),
  logout: (continueSession = false) => req('/logout', { method: 'POST', body: { continue_session: continueSession } }),
  forceLogout: () => req('/logout/force', { method: 'POST', body: {} }),
  continueLogin: () => req('/login', { method: 'POST', body: { qr: '', pull_snapshot: false, is_continue: true } }),

  upsert: (payload) => req('/upsert', { method: 'POST', body: payload }),
  verifyPlays: (plays, userId) => req('/upsert/verify', { method: 'POST', body: { plays, user_id: userId || 0 } }),
  batchProgress: () => req('/batch/progress'),
  updateBatchProgress: (progress) => req('/batch/progress', { method: 'POST', body: progress }),
  unlock: (payload) => req('/unlock', { method: 'POST', body: payload }),

  chargeList: () => req('/charge/list', { method: 'POST', body: {} }),
  chargeBuy: (payload) => req('/charge/buy', { method: 'POST', body: payload }),
  chargeUse: (payload) => req('/charge/use', { method: 'POST', body: payload }),

  snapshot: () => req('/snapshot'),
  snapshots: () => req('/snapshots'),
  savedSnapshot: (userId) => req('/snapshot/' + userId),

  reincarnate: (payload) => req('/reincarnate', { method: 'POST', body: payload }),

  getConfig: () => req('/config'),
  writeConfig: (payload) => req('/config/write', { method: 'POST', body: payload }),
  authv1: (keychip) => req('/authv1', { method: 'POST', body: { keychip } }),

  deriveScore: (payload) => req('/score/derive', { method: 'POST', body: payload }),
  chartInfo: (payload) => req('/score/chart', { method: 'POST', body: payload }),

  deliveryList: (payload) => req('/delivery/list', { method: 'POST', body: payload }),
  deliveryDownload: (payload) =>
    req('/delivery/download', { method: 'POST', body: payload }),
}

// ---- SSE 日志流 -----------------------------------------------------------
// 后端每条事件 data 是 {"ts":..,"level":..,"text":"..."}；另有 ": ping" 注释心跳
// 和 "event: hello" 握手。
//
// ★ 状态语义（重要）：
//   EventSource 断线时会**自动重连**（浏览器默认约 3s 重试），
//   且 onerror 在「连接建立过程中」也会触发（代理未就绪 / StrictMode 双挂载时
//   前一个连接被 close）。所以不能一收到 error 就永久置为断开 ——
//   否则会自动重连成功也显示"已断开"。
//
//   正确做法：以 es.readyState 为准
//      0 CONNECTING  正在连（含自动重连中）-> 'connecting'
//      1 OPEN        已连上                -> 'open'
//      2 CLOSED      被我们主动 close        -> 'closed'
//   onerror 只用来触发一次状态刷新，具体是什么状态看 readyState。
export function subscribeLog(onLine, onStatus, { openTimeoutMs = 12000 } = {}) {
  const es = new EventSource(API_BASE + '/stream')
  let closedByUs = false
  let settled = false   // 是否已经拿到过 open（之后的重连失败不报警）

  const sync = () => {
    if (closedByUs) return onStatus?.('closed')
    onStatus?.(es.readyState === 1 ? 'open' : 'connecting')
    if (es.readyState === 1) settled = true
  }

  // 连接超时：一直连不上（后端没起 / 地址错）要明确报错，
  // 不能永远显示"连接中"。已经成功过的话，后续重连失败只显示 connecting
  // （EventSource 会继续自动重试）。
  const timer = setTimeout(() => {
    if (!settled && !closedByUs && es.readyState !== 1) {
      onStatus?.('timeout')
    }
  }, openTimeoutMs)

  es.onopen = () => { clearTimeout(timer); sync() }
  es.onerror = sync
  es.addEventListener('hello', sync)

  es.onmessage = (ev) => {
    try {
      onLine(JSON.parse(ev.data))
    } catch {
      /* 忽略心跳注释等非 JSON */
    }
  }

  return () => {
    closedByUs = true
    clearTimeout(timer)
    es.close()
  }
}

export function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function fmtSize(n) {
  if (n == null) return '—'
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = Number(n)
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}
