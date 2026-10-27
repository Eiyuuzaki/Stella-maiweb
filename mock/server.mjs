#!/usr/bin/env node
/**
 * mock/server.mjs —— Astral Web UI 的独立 mock 后端
 * ============================================================================
 *
 * 纯 Node 零依赖，实现 web/README.md「后端契约」的完整接口（含 SSE 日志流）。
 * 用来：
 *   - 不装 Python / 不准备 Astral 工程也能开发前端界面
 *   - 演示交互、给 CI 跑冒烟测试
 *
 * 启动：
 *   npm run mock                          # 默认 127.0.0.1:8765
 *   node mock/server.mjs --port 9000      # 指定端口
 *
 * 返回的全部是假数据 —— 不会真的连任何服务器。
 */

import http from 'node:http'
import { URL } from 'node:url'

const argv = process.argv.slice(2)
const portIdx = argv.indexOf('--port')
const PORT = Number(portIdx >= 0 ? argv[portIdx + 1] : 8765) || 8765
const HOST = '127.0.0.1'

// ---- 内存状态 --------------------------------------------------------------
const state = {
  loggedIn: false,
  userId: 0,
  loginDt: 0,
  charges: [
    { chargeId: 2, stock: 0, purchaseDate: '', validDate: '', extNum1: 0 },
    { chargeId: 3, stock: 0, purchaseDate: '', validDate: '', extNum1: 0 },
    { chargeId: 5, stock: 0, purchaseDate: '', validDate: '', extNum1: 0 },
  ],
  chargeRead: false,       // ChargeGuard：查过票券才允许买
  purchased: [],           // ChargeGuard：同进程已买过的 chargeId
  logs: [],                // SSE 历史
  snapshot: null,
}

// ---- 工具 ------------------------------------------------------------------
const ok = (obj) => JSON.stringify({ ok: true, ...obj })
const fail = (code, message, status = 400) =>
  JSON.stringify({ ok: false, code, message })

function log(text) {
  state.logs.push({ ts: Date.now() / 1000, level: 'info', text })
  if (state.logs.length > 500) state.logs.shift()
}

function session() {
  return {
    logged_in: state.loggedIn,
    user_id: state.userId,
    login_dt: state.loginDt,
    preview: state.loggedIn
      ? {
          userId: state.userId,
          userName: 'MockPlayer',
          playerRating: 15234,
          lastPlayVersion: '1.56.00',
          isLogin: true,
          loginDeltaTime: 0,
        }
      : null,
    machine: {
      client_id: 'A63E01DEMO01',
      region_id: 1,
      place_id: 1000,
      place_name: 'Mock 店铺',
      region_name: 'Mock 区域',
      ready: true,
    },
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch { resolve({}) }
    })
  })
}

function fakeSnapshot() {
  return {
    _userId: state.userId,
    _failed: [],
    userData: [{ userId: state.userId, userName: 'MockPlayer', playCount: 1257, currentPlay: 185, playerRating: 15234, point: 88000, totalPoint: 231000 }],
    userExtend: [{ userId: state.userId, categoryIndex: 2022, musicIndex: 10, extraFlag: 1721 }],
    userOption: [{ userId: state.userId, selectionCategory: 0 }],
    userCharacterList: Array.from({ length: 5 }, (_, i) => ({
      characterId: [395, 101, 400402, 400401, 200401][i],
      level: [3800, 4455, 134, 134, 134][i],
      awakening: [5, 5, 3, 3, 3][i],
    })),
    userMapList: Array.from({ length: 104 }, (_, i) => ({ mapId: 550001 + (i % 3), distance: 1424000 + i * 100 })),
    userLoginBonusList: [],
    userRatingList: [{ ratingList: [{ musicId: 11414, level: 4, achievement: 1008413, deluxscore: 906 }] }],
    userItemList: Array.from({ length: 1070 }, (_, i) => ({ itemKind: 5, itemId: 1000 + i, stock: 1, isValid: true })),
    userMusicDetailList: Array.from({ length: 739 }, (_, i) => ({
      musicId: 1 + i, level: 3, playCount: 3, achievement: 980000 + i, deluxscoreMax: 850,
      scoreRank: 12, comboStatus: 1, syncStatus: 1,
    })),
    userCourseList: [],
    userChargeList: state.charges,
    userFavoriteList: [],
    userActivityList: [],
    userMissionDataList: [],
    userIntimateList: [],
    userShopItemStockList: [],
    userFavoritemusicList: [],
    userKaleidxScopeList: Array.from({ length: 8 }, (_, i) => ({
      gateId: i + 1, isGateFound: true, isKeyFound: i < 3, isClear: i < 2,
      totalRestLife: 0, totalAchievement: 970000, totalDeluxscore: 780,
      bestAchievement: 1005000, bestDeluxscore: 880,
      bestAchievementDate: '2026-10-01 12:00:00.0', bestDeluxscoreDate: '2026-10-01 12:00:00.0',
      playCount: 12, clearDate: '2026-10-01 12:30:00.0', lastPlayDate: '2026-10-10 20:00:00.0',
      isInfoWatched: true,
    })),
    userGhost: [],
  }
}

// ---- 路由 ------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`)
  const p = url.pathname
  const method = req.method

  // CORS（前端可能跑在另一个 origin）
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (method === 'OPTIONS') { res.writeHead(204); return res.end() }

  // ---- SSE ----
  if (p === '/api/stream' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('event: hello\ndata: {}\n\n')
    for (const l of state.logs.slice(-100)) {
      res.write('data: ' + JSON.stringify(l) + '\n\n')
    }
    const timer = setInterval(() => res.write(': ping\n\n'), 15000)
    // 订阅新日志
    const onLog = (l) => res.write('data: ' + JSON.stringify(l) + '\n\n')
    subscribers.add(onLog)
    req.on('close', () => { clearInterval(timer); subscribers.delete(onLog) })
    return
  }

  const json = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(body)
  }

  // ---- 健康 / 状态 ----
  if (p === '/api/health') {
    return json(200, ok({
      astral_root: '(mock)',
      astral: 'mock',
      session: session(),
    }))
  }
  if (p === '/api/status') {
    return json(200, ok({ session: session() }))
  }

  // ---- 登录 / 登出 ----
  if (p === '/api/login' && method === 'POST') {
    const body = await readBody(req)
    const qr = String(body.qr || '')
    log('=== ParseQRCode 开始运行 ===')
    log('  [接口说明] 解析二维码并换取 userId 与 token。')
    log('  [位置参数] ' + (qr.slice(0, 40) || '(空)'))
    if (state.loggedIn) {
      log('[错误] 已登录，请先登出')
      return json(409, fail('already_logged_in', '已登录：请先登出再扫码新账号', 409))
    }
    if (!qr) {
      log('[错误] 二维码为空')
      return json(400, fail('bad_request', '二维码不能为空', 400))
    }
    log('  [运行结果] 成功 tuple(2 项)（耗时 42 ms）')
    log('=== ParseQRCode 运行结束 ===')
    log('=== Ping 开始运行 ===')
    log('  [运行结果] 成功 True（耗时 11 ms）')
    log('=== Ping 运行结束 ===')

    state.loggedIn = true
    state.userId = 10000000 + Math.floor(Math.random() * 89999999)
    state.loginDt = Math.floor(Date.now() / 1000)
    state.snapshot = null

    const result = { user_id: state.userId, login_dt: state.loginDt, login_id: state.loginDt * 1000, preview: session().preview }
    if (body.pull_snapshot !== false) {
      log('=== GetNeedUserData 开始运行 ===')
      state.snapshot = fakeSnapshot()
      result.snapshot_summary = Object.fromEntries(
        Object.entries(state.snapshot)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => [k, Array.isArray(v) ? v.length : v && typeof v === 'object' ? 1 : 0]),
      )
      result.snapshot_failed = []
      log('  [运行结果] 成功 dict(' + Object.keys(result.snapshot_summary).length + ' 键)（耗时 812 ms）')
      log('=== GetNeedUserData 运行结束 ===')
    }
    log('=== UserLogin 开始运行 ===')
    log('  [运行结果] 成功 UserLoginResponseVO(5 字段)（耗时 168 ms）')
    log('=== UserLogin 运行结束 ===')
    return json(200, ok({ result, session: session() }))
  }

  if (p === '/api/logout' && method === 'POST') {
    log('=== UserLogout 开始运行 ===')
    const was = state.loggedIn
    state.loggedIn = false
    state.userId = 0
    state.loginDt = 0
    state.snapshot = null
    state.chargeRead = false
    state.purchased = []
    log('  [运行结果] 成功 True（耗时 55 ms）')
    log('=== UserLogout 运行结束 ===')
    return json(200, ok({ result: { logged_out: was, error: '' }, session: session() }))
  }

  const needLogin = () => {
    if (state.loggedIn) return null
    return json(409, fail('not_logged_in', '尚未登录：请先扫码登录', 409))
  }

  // ---- 写操作 ----
  for (const [name, label] of [
    ['/api/upsert', '上传成绩'],
    ['/api/unlock', '解锁歌曲'],
    ['/api/charge/buy', '购买功能票'],
    ['/api/charge/use', '消耗功能票'],
  ]) {
    if (p === name && method === 'POST') {
      log('\n------------------------------------------------------------\n' + label + '\n------------------------------------------------------------')
      const denied = needLogin()
      if (denied) return denied
      const body = await readBody(req)
      const confirm = !!body.confirm

      if (name === '/api/charge/buy') {
        const held = state.charges.filter((c) => c.stock > 0)
        if (held.length && confirm) {
          log('[错误] 账号已持有功能票，拒绝购买')
          return json(409, fail('charge_guard_no_stock', '账号已持有功能票，拒绝购买（重复购买有封号风险）', 409))
        }
        if (!state.chargeRead && confirm) {
          log('[错误] 未查询过票券，ChargelogGuardError')
          return json(409, fail('charge_guard_no_stock', '买票前必须先查过 GetUserCharge', 409))
        }
        const cid = Number(body.charge_id || 5)
        if (state.purchased.includes(cid) && confirm) {
          return json(409, fail('charge_guard_no_stock', '同账号同进程只允许买一次票', 409))
        }
        if (confirm) {
          const row = state.charges.find((c) => c.chargeId === cid) || state.charges[2]
          row.stock = 1
          row.purchaseDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
          row.validDate = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) + ' 04:00:00.0'
          state.purchased.push(cid)
        }
        log('=== UpsertUserChargelog 开始运行 ===')
        log('  [运行结果] ' + (confirm ? '成功 UpsertResponseVO(3 字段)' : '成功 UserChargelogRequestVO(6 字段)') + '（耗时 96 ms）')
        log('=== UpsertUserChargelog 运行结束 ===')
        return json(200, ok({
          dry_run: !confirm,
          result: { held_before: state.charges.filter((c) => c.stock > 0), held_after: state.charges.filter((c) => c.stock > 0) },
        }))
      }

      if (name === '/api/charge/use') {
        const held = state.charges.filter((c) => c.stock > 0)
        if (!held.length) {
          return json(409, fail('no_held_ticket', '账号当前没有持有任何功能票，没有可消耗的东西', 409))
        }
        const target = body.ticket_id != null
          ? held.find((c) => c.chargeId === Number(body.ticket_id))
          : held[0]
        if (!target) {
          return json(409, fail('ticket_not_held', '指定的 chargeId 当前并不持有', 409))
        }
        if (confirm) target.stock = Math.max(0, target.stock - 1)
        return json(200, ok({
          dry_run: !confirm,
          result: { ticket: 'Mockチケット', ticket_id: target.chargeId, credit_num: 1, play_credit: 2, stock_after: target.stock, still_held: target.stock > 0 },
        }))
      }

      // upsert / unlock
      if (name === '/api/unlock' && !(body.music_ids || []).length) {
        return json(400, fail('bad_request', 'music_ids 不能为空', 400))
      }
      log('=== UpsertUserAll 开始运行 ===')
      log('  [接口说明] 上传一局成绩（UpsertUserAllApi，★ 有副作用）')
      log('  [运行结果] ' + (confirm ? '成功 UpsertResponseVO(3 字段)（耗时 1342 ms）' : '成功 UserAllRequestVO(7 字段)（耗时 38 ms）'))
      if (confirm) log('  ★ 落库回查：lastPlayDate 已更新，确认写入 ✅')
      log('=== UpsertUserAll 运行结束 ===')
      return json(200, ok({
        dry_run: !confirm,
        result: {
          returnCode: confirm ? 1 : null,
          dryRun: !confirm,
          nodes: confirm ? 36 : 36,
          mock: true,
          echo: { play: body.play || null, music_ids: body.music_ids || null },
        },
      }))
    }
  }

  // ---- 票券查询 ----
  if (p === '/api/charge/list' && method === 'POST') {
    log('\n------------------------------------------------------------\n查询票券\n------------------------------------------------------------')
    const denied = needLogin()
    if (denied) return denied
    state.chargeRead = true
    log('=== GetUserCharge 开始运行 ===')
    log('  [运行结果] 成功 dict(3 键)（耗时 62 ms）')
    log('=== GetUserCharge 运行结束 ===')
    return json(200, ok({
      result: {
        list: state.charges,
        held: state.charges.filter((c) => c.stock > 0),
        guard: {
          has_fresh_read: true,
          last_read_age: 0,
          purchased: state.purchased,
          fresh_sec: 600,
        },
      },
    }))
  }

  // ---- 快照 ----
  if (p === '/api/snapshot' && method === 'GET') {
    const denied = needLogin()
    if (denied) return denied
    if (!state.snapshot) return json(404, fail('no_snapshot', '当前会话没有快照（登录时没抓）', 404))
    const { _userId, _failed, ...nodes } = state.snapshot
    return json(200, ok({ result: {
      summary: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1])),
      failed: [], user_id: _userId, nodes,
    } }))
  }
  if (p === '/api/snapshots' && method === 'GET') {
    return json(200, ok({ result: state.loggedIn ? [{ user_id: state.userId, size: 584600, mtime: Math.floor(Date.now() / 1000) }] : [] }))
  }
  if (p.startsWith('/api/snapshot/') && method === 'GET') {
    const id = Number(p.split('/').pop())
    if (!state.loggedIn || id !== state.userId || !state.snapshot) {
      return json(404, fail('not_found', '没有 user_id=' + id + ' 的存档', 404))
    }
    const { _userId, _failed, ...nodes } = state.snapshot
    return json(200, ok({ result: {
      summary: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1])),
      failed: [], user_id: id, nodes,
    } }))
  }

  // ---- config.py 机台标识 ----
  if (p === '/api/config' && method === 'GET') {
    return json(200, ok({ result: {
      client_id: 'A63E01DEMO01', region_id: 1, place_id: 1000,
      place_name: 'Mock 店铺', region_name: 'Mock 区域',
      keychip_id: 'A63E-01DEMO011007',
      authv1_write_config: false,
      config_exists: true,
      config_path: '(mock)/config.py',
    } }))
  }
  if (p === '/api/config/write' && method === 'POST') {
    const denied = needLogin()
    if (denied) return denied
    const body = await readBody(req)
    if (!String(body.client_id || '').trim()) {
      return json(400, fail('bad_request', 'CLIENT_ID 不能为空', 400))
    }
    log('=== write_back_config 开始运行 ===')
    log('  [已备份] (mock)/config.py.bak')
    log('  [已写回] (mock)/config.py')
    log('=== write_back_config 运行结束 ===')
    return json(200, ok({ result: {
      written: body.write_file !== false,
      backup: '(mock)/config.py.bak',
      path: '(mock)/config.py',
      values: {
        client_id: String(body.client_id).trim(),
        region_id: Number(body.region_id || 0),
        place_id: Number(body.place_id || 0),
        place_name: body.place_name || '',
        region_name: body.region_name || '',
      },
      keychip_id: String(body.client_id).slice(0, 4) + '-' + String(body.client_id).slice(4) + String(body.place_id || 0),
    }, session: session() }))
  }
  if (p === '/api/authv1' && method === 'POST') {
    const body = await readBody(req)
    const kc = String(body.keychip || '').trim()
    if (!kc) return json(400, fail('bad_request', 'keychip 不能为空', 400))
    const short = kc.replace(/-/g, '').slice(0, 11).toUpperCase()
    return json(200, ok({ result: {
      client_id: short, region_id: 1, place_id: 1007,
      place_name: '反查店铺', region_name: '反查区域',
      keychip: kc, result: 1,
    } }))
  }

  // ---- 转生 ----
  if (p === '/api/reincarnate' && method === 'POST') {
    const denied = needLogin()
    if (denied) return denied
    const body = await readBody(req)
    if (!body.dst_qr) return json(400, fail('bad_request', 'dst_qr 不能为空', 400))
    if (!body.src_json && !body.src_qr) return json(400, fail('bad_request', 'src_json 和 src_qr 至少要给一个', 400))
    if (![1, 3, 4].includes(Number(body.per_packet || 4))) {
      return json(400, fail('bad_request', 'per_packet 只能是 1/3/4', 400))
    }
    const per = Number(body.per_packet || 4)
    const total = Number(body.limit) || 739
    const batches = []
    for (let n = total; n > 0; n -= per) batches.push(Math.min(per, n))
    log('=== reincarnate 开始运行 ===')
    log('  计划：共 ' + total + ' 首 -> ' + batches.length + ' 包，每包 ' + batches.slice(0, 12).join('/') + (batches.length > 12 ? '...' : ''))
    log('  ★ 已避开 2 首包')
    log('=== reincarnate 运行结束 ===')
    return json(200, ok({ result: {
      exit_code: 0,
      meaning: 'ok',
      plan_only: !body.confirm,
      argv: [],
      batches,
      total,
    } }))
  }

  // ---- 更新包 ----
  if (p === '/api/delivery/list' && method === 'POST') {
    const body = await readBody(req)
    log('\n------------------------------------------------------------\n更新包清单\n------------------------------------------------------------')
    const items = [
      { idx: 1, kind: 'app', section: 'COMMON', key: 'INSTALL1', url: 'https://example.invalid/a000.app', name: 'A000.app', size: 1288490188, note: '', info_name: 'patch_info' },
      { idx: 2, kind: 'app', section: 'COMMON', key: 'INSTALL2', url: 'https://example.invalid/a001.app', name: 'A001.app', size: 214748364, note: '', info_name: 'patch_info' },
      { idx: 3, kind: 'opt', section: 'OPTION', key: 'OPT1', url: 'https://example.invalid/option.opt', name: 'option.opt', size: 52428800, note: '', info_name: 'option_info' },
    ]
    return json(200, ok({ result: {
      items,
      meta: { dli_raw: 'result=1&uri=https://example.invalid/patch_info|https://example.invalid/option_info', title_ver: body.ver || '1.55', client_id: body.keychip || 'A63E01DEMO01', instructions: [], infos: {} },
    } }))
  }
  if (p === '/api/delivery/download' && method === 'POST') {
    const body = await readBody(req)
    const files = (body.indexes || []).map((i) => ({
      idx: i, name: ['A000.app', 'A001.app', 'option.opt'][i - 1] || `pkg${i}.bin`,
      dest: `(mock)/download/pkg${i}.bin`, ok: true, size: 1024,
    }))
    return json(200, ok({ result: { out_dir: '(mock)/download', files } }))
  }

  json(404, fail('not_found', '未知路径：' + method + ' ' + p, 404))
})

const subscribers = new Set()
const _log = log
log = (text) => {           // 让 log() 同时推给 SSE 订阅者
  _log(text)
  const item = state.logs[state.logs.length - 1]
  for (const fn of subscribers) {
    try { fn(item) } catch { /* 连接已断 */ }
  }
}

server.listen(PORT, HOST, () => {
  console.log(`[mock] Astral Web UI mock 后端运行在 http://${HOST}:${PORT}`)
  console.log(`[mock] 全部数据均为假数据，不会连接任何真实服务器`)
  console.log(`[mock] SSE: http://${HOST}:${PORT}/api/stream`)
})
