// 机台预设（Profile）管理。
//
// ★ 设计原则：预设只存在浏览器 localStorage，**不依赖后端**。
//   这样即使后端完全摘离、换成别的实现，预设依然可用。
//   后端只负责两件「必须服务端做」的事：
//     1) 读 Astral/config.py 当前生效的值
//     2) 把选中的预设写进 config.py（并热加载）
//   这两件事能力探测失败时（后端不是 Python 参考实现），
//   前端降级为「导出 config.py 片段让用户自己粘贴」。
//
// 数据结构：
//   { id, name, client_id, region_id, place_id, place_name, region_name,
//     note, created_at, updated_at }

import { useCallback, useEffect, useState } from 'react'
import { api, API_BASE } from './api.js'

export const LS_KEY = 'astral-machine-profiles'
export const ACTIVE_KEY = 'astral-machine-active'
export const CONFIG_FIELDS = [
  { key: 'client_id', label: 'CLIENT_ID', hint: 'Keychip 短值：15 位 Keychip 去掉连字符取前 11 位，形如 A63E01ABCDE' },
  { key: 'region_id', label: 'REGION_ID', hint: '你所在区域 ID' },
  { key: 'place_id', label: 'PLACE_ID', hint: '你所在店铺 ID' },
  { key: 'place_name', label: 'PLACE_NAME', hint: '店铺名（开机时由 ALL.Net 认证下发，可用下面的「反查」自动获取）' },
  { key: 'region_name', label: 'REGION_NAME', hint: '区域名（同上）' },
]

export function blankProfile() {
  return { client_id: '', region_id: 0, place_id: 0, place_name: '', region_name: '' }
}

export function deriveKeychip(p) {
  if (!p?.client_id) return ''
  return p.client_id.slice(0, 4) + '-' + p.client_id.slice(4) + String(p.place_id || 0)
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch {
    /* 隐私模式 / 配额满：预设功能不可用，但不该让页面崩 */
  }
}

function loadActive() {
  try { return localStorage.getItem(ACTIVE_KEY) || '' } catch { return '' }
}

export function useProfiles() {
  const [profiles, setProfiles] = useState(load)
  const [activeId, setActiveId] = useState(loadActive)

  useEffect(() => { save(profiles) }, [profiles])

  const setActive = useCallback((id) => {
    setActiveId(id || '')
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id)
      else localStorage.removeItem(ACTIVE_KEY)
    } catch { /* ignore */ }
  }, [])

  const upsert = useCallback((profile) => {
    let result = profile
    setProfiles((prev) => {
      const now = Date.now()
      if (profile.id) {
        const next = prev.map((p) =>
          p.id === profile.id ? { ...p, ...profile, updated_at: now } : p)
        result = next.find((p) => p.id === profile.id)
        return next
      }
      const created = {
        ...blankProfile(),
        ...profile,
        id: 'p' + now.toString(36) + Math.random().toString(36).slice(2, 6),
        created_at: now,
        updated_at: now,
      }
      result = created
      return [...prev, created]
    })
    return result
  }, [])

  const remove = useCallback((id) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    setActiveId((cur) => (cur === id ? '' : cur))
  }, [])

  const active = profiles.find((p) => p.id === activeId) || null

  return { profiles, activeId, active, setActive, upsert, remove }
}

// ---- 导入 / 导出 -----------------------------------------------------------

export function exportProfiles(profiles) {
  const blob = new Blob([JSON.stringify({ app: 'astral-webui', version: 1, profiles }, null, 2)],
    { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'astral-machine-profiles.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importProfiles(file) {
  const text = await file.text()
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data.profiles
  if (!Array.isArray(list)) throw new Error('文件里没有 profiles 数组')
  return list
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({ ...blankProfile(), ...p, id: undefined, created_at: Date.now(), updated_at: Date.now() }))
}

// ---- 生成 config.py 片段（后端不支持写盘时的降级方案）-----------------------

export function toConfigSnippet(p) {
  const q = (s) => JSON.stringify(String(s ?? ''))
  return [
    '# ---- 第二节「机台与店铺标识」----',
    'CLIENT_ID = ' + q(p.client_id),
    'REGION_ID = ' + Number(p.region_id || 0),
    'PLACE_ID = ' + Number(p.place_id || 0),
    'PLACE_NAME = ' + q(p.place_name),
    'REGION_NAME = ' + q(p.region_name),
    '# KEYCHIP_ID 由上面两个值推导，不要手改：',
    '# KEYCHIP_ID = ' + JSON.stringify(deriveKeychip(p)),
  ].join('\n')
}

// ---- 后端能力探测 ----------------------------------------------------------

export function useConfigCapability() {
  const [cap, setCap] = useState({ checked: false, supported: false, reason: '' })

  const probe = useCallback(async () => {
    try {
      const r = await api.getConfig()
      // 响应不是预期的 JSON 结构 => 打到的不是 Astral 后端
      // （HTML 页面 / 别的服务返回了 200 + 非 JSON）
      if (!r?.result || typeof r.result !== 'object') {
        setCap({
          checked: true, supported: false,
          reason: '响应不是预期的 JSON —— 这个地址上跑的不是 Astral 后端'
                + '（当前地址：' + (API_BASE === '/api' ? '同源 /api' : API_BASE) + '）',
        })
        return
      }
      setCap({ checked: true, supported: true, reason: '', current: r.result })
    } catch (e) {
      // 网络层失败 = 后端根本没起
      if (e.kind === 'network') {
        setCap({
          checked: true, supported: false,
          reason: '无法连接后端（' + (API_BASE === '/api' ? '同源 /api' : API_BASE) + '）—— 请确认 uvicorn 已启动',
        })
        return
      }
      const unsupported = e.status === 404 || /未知路径/.test(e.message || '')
      setCap({
        checked: true,
        supported: false,
        reason: unsupported
          ? '当前后端（' + (API_BASE === '/api' ? '同源 /api' : API_BASE) + '）未提供 config 接口 —— 不是 Python 参考实现'
          : (e.message || '探测失败'),
      })
    }
  }, [])

  useEffect(() => { probe() }, [probe])
  return { ...cap, probe }
}
