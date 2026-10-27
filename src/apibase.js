// 后端地址解析 —— 纯函数，不碰任何浏览器 API，便于单测。
//
// 前端与后端是**两个独立的项目**。前端不应该知道后端是谁、在哪里，
// 只需要知道「怎么找到一个后端」。解析顺序（第一个非空者生效）：
//
//   1. URL 查询参数  ?api=http://host:port   便于分享「自带后端」的链接
//   2. localStorage  astral-api-base         用户在界面里手动填的
//   3. 构建时变量    VITE_API_BASE           部署时烧进产物
//   4. 空字符串                              同源，由 Vite 代理 / 反代转发 /api
//
// 任何一级都能把前端指向另一个后端实现 —— 只要它实现了同样的 HTTP 契约
// （见 web/README.md「后端契约」）。
//
// ★ normalize() 除了去首尾空白和尾斜杠，还会 decodeURIComponent ——
//   否则 "?api=%20" 这种值会被当成非空字符串，请求打到 http://%20/... 上，
//   表现为莫名其妙的 404。

export const LS_KEY = 'astral-api-base'
export const QUERY_KEY = 'api'

export const SOURCE_LABELS = {
  query: 'URL 参数指定',
  storage: '手动设置',
  env: '构建时配置',
  'same-origin': '同源（/api）',
}

export function normalize(url) {
  let s = String(url == null ? '' : url).trim()

  // URL 参数可能是百分号编码的（?api=http%3A%2F%2Fhost%3A8765）
  if (s.includes('%')) {
    try {
      s = decodeURIComponent(s).trim()
    } catch {
      /* 非法百分号序列就按原文走 */
    }
  }

  return s.replace(/\/+$/, '')
}

// 只接受看起来像后端地址的值：空 / 单斜杠 / 纯空白都视为「未指定」，
// 让它继续往下回落，而不是变成一个畸形的 base。
function usable(url) {
  const n = normalize(url)
  if (!n) return ''
  // "/" 或 "//" 这种：去掉尾斜杠后是空的，已经是 ''；纯 "//host" 保留
  return n
}

export function resolveApiBase({ search = '', storage = null, envBase = '' } = {}) {
  // 1) ?api=
  let q = ''
  try {
    q = new URLSearchParams(search).get(QUERY_KEY) || ''
  } catch {
    q = ''
  }
  q = usable(q)
  if (q) return { base: q, source: 'query' }

  // 2) localStorage
  let ls = ''
  try {
    ls = storage ? storage.getItem(LS_KEY) || '' : ''
  } catch {
    ls = ''
  }
  ls = usable(ls)
  if (ls) return { base: ls, source: 'storage' }

  // 3) 构建时环境变量
  const env = usable(envBase)
  if (env) return { base: env, source: 'env' }

  // 4) 同源
  return { base: '', source: 'same-origin' }
}
