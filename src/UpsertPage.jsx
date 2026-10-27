// 上传成绩页 —— 对应 upsert.py 的全部 PLAY_* 配置。
// 所有字段都有 Astral 源码依据（Tooltip 里写明出处），缺省走 config.PLAY_*。
import React from 'react'
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  Grid, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import QrCodeIcon from '@mui/icons-material/QrCode'
import AutoModeIcon from '@mui/icons-material/AutoMode'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useApp } from './store.jsx'
import { api } from './api.js'
import { dxForStar } from './dxStars.js'
import {
  Section, JsonBox, NumField, TextField2, Toggle, DangerConfirm, StatusChip,
} from './components.jsx'

// ---- 人类可读的枚举（把"填数字"变成"选名字"）----
const LEVELS = [
  { v: 0, name: 'Basic' },
  { v: 1, name: 'Advanced' },
  { v: 2, name: 'Expert' },
  { v: 3, name: 'Master' },
  { v: 4, name: 'Re:Master' },
]
const SCORE_RANKS = [
  { v: 0, name: 'D' },
  { v: 1, name: 'C' }, { v: 2, name: 'B' }, { v: 3, name: 'BB' },
  { v: 4, name: 'BBB' }, { v: 5, name: 'A' }, { v: 6, name: 'AA' },
  { v: 7, name: 'AAA' }, { v: 8, name: 'S' }, { v: 9, name: 'S+' },
  { v: 10, name: 'SS' }, { v: 11, name: 'SS+' },
  { v: 12, name: 'SSS' }, { v: 13, name: 'SSS+' },
]

// ---- 徽章枚举（★ 用户实测校准 2026-10-26，最终版）----
// comboStatus：准确度徽章
//   0=无 · 1=FC · 2=FC+（FC 且无 Good）· 3=AP（无 Great 以下）· 4=AP+（绝赞全 CP）
const COMBO_BADGES = [
  { v: 0, name: '无' },
  { v: 1, name: 'FC' },
  { v: 2, name: 'FC+' },
  { v: 3, name: 'AP' },
  { v: 4, name: 'AP+' },
]
// syncStatus：双人同步徽章（★ 用户实测校准的最终映射）：
//   0=单人（默认）· 1=FS · 2=FS+ · 3=FDX · 4=FDX+ · 5=SYNC（双人同步游玩最低档）
const SYNC_BADGES = [
  { v: 0, name: '单人（默认）' },
  { v: 5, name: 'SYNC' },
  { v: 1, name: 'FS' },
  { v: 2, name: 'FS+' },
  { v: 3, name: 'FDX' },
  { v: 4, name: 'FDX+' },
]
// 达成率 -> 评级（官方分界，来自查分器 RateType + 玩家共识）
// S 起点 97%（用户口述与查分器一致）
function rankFromAchievement(pct) {
  // ★ 协议编号到 13 为止。账号快照里 100.1743% 记的是 12（SSS），
  //   之前把 SSS+ 写成 14，整张表都高了一档，101% 会发出非法评级。
  if (pct >= 100.5) return 13   // SSS+
  if (pct >= 100) return 12     // SSS
  if (pct >= 99.5) return 11    // SS+
  if (pct >= 99) return 10      // SS
  if (pct >= 98) return 9       // S+
  if (pct >= 97) return 8       // S
  if (pct >= 94) return 7       // AAA
  if (pct >= 90) return 6       // AA
  if (pct >= 80) return 5       // A
  if (pct >= 75) return 4       // BBB
  if (pct >= 70) return 3       // BB
  if (pct >= 65) return 2       // B
  if (pct >= 60) return 1       // C
  return 0                      // D
}
// DX 星级：dx_score / (3 × total_notes)，满分 5 星（查分器 dx_star max=5）
// 档位边界按查分器展示惯例：≥0.97→5星 0.94→4星 0.88→3星 0.80→2星 0.50→1星
function starsFromDx(dx, totalNotes) {
  if (!totalNotes) return 0
  const ratio = dx / (3 * totalNotes)
  if (ratio >= 0.97) return 5
  if (ratio >= 0.94) return 4
  if (ratio >= 0.88) return 3
  if (ratio >= 0.80) return 2
  if (ratio >= 0.50) return 1
  return 0
}


// 表单初值 = Astral config.py.example 的默认值（真机 2026-10-05 样本）
const EMPTY = {
  music_id: 143,
  music_level: 4,
  track_no: 1,
  version_int: 1056000,
  version_str: '1.56.00',
  achievement: 0,
  deluxscore: 0,
  score_rank: 0,
  is_clear: false,
  max_combo: 0,
  total_combo: 655,
  max_sync: 0,
  total_sync: 0,
  combo_status: 0,
  sync_status: 0,
  fast_count: 0,
  late_count: 0,
  category_index: 2022,
  music_index: 10,
  extra_flag: 1721,
  play_credit: 1,
  use_ticket_id: -1,
  play_mode: 0,
  is_tutorial: false,
  is_event_mode: false,
  is_new_free: false,
  is_freedom_mode: false,
  user_play_count_gain: 1,
  music_play_count_gain: 1,
  map_distance_gain: 0,
  character_exp_gain: 0,
}

// ★ 判定矩阵默认值 = 每类 1 个 Perfect（每类至少 1 note，is* 标志位才能置 true）。
//   服务器只做数字自洽校验（判定总数 = totalCombo），不对照真实谱面 ——
//   全 1 即可通过。真实判定分布用高级选项里的「反推工具」生成。
const JUDGE_DEFAULTS = {
  tap: { CriticalPerfect: 0, Perfect: 1, Great: 0, Good: 0, Miss: 0 },
  hold: { CriticalPerfect: 0, Perfect: 1, Great: 0, Good: 0, Miss: 0 },
  slide: { CriticalPerfect: 0, Perfect: 1, Great: 0, Good: 0, Miss: 0 },
  touch: { CriticalPerfect: 0, Perfect: 1, Great: 0, Good: 0, Miss: 0 },
  break: { CriticalPerfect: 0, Perfect: 1, Great: 0, Good: 0, Miss: 0 },
}

const JUDGE_LABELS = {
  tap: 'Tap / Star / Touch / EX（权重 500）',
  hold: 'Hold 系（权重 1000）',
  slide: 'Slide 系（权重 1500）',
  touch: 'Touch（权重 500）',
  break: '绝赞 Break 系（权重 2500）',
}

export default function UpsertPage() {
  const { session, busy, act, notify } = useApp()
  const [form, setForm] = React.useState(EMPTY)
  const [judge, setJudge] = React.useState(JUDGE_DEFAULTS)
  const [confirm, setConfirm] = React.useState(false)
  const [extra, setExtra] = React.useState('')
  const [verify, setVerify] = React.useState(true)
  const [cooldown, setCooldown] = React.useState('')
  const [result, setResult] = React.useState(null)

  // ---- 简易模式状态 ----
  const [simpleMode, setSimpleMode] = React.useState(true)
  // ★ 达成率单一真源 = form.achievement（×10000 整数）。
  //   之前用独立的 simpleAchv 字符串状态，导致"输入 150% 但 form 里还是 99%"
  //   的校验错位。现在输入框直接读写 form.achievement。
  //   ★ 未填时返回 ''（输入框显示灰色 placeholder），不要显示成实打实的 0 —— 
  //     0 在语义上等于"本局失败"，会被误读成已填值。
  const achvPct = form.achievement ? +(form.achievement / 10000).toFixed(4) : ''
  const setAchvPct = (v) => set('achievement')(v === '' ? '' : Math.round((Number(v) || 0) * 10000))
  const [simpleStars, setSimpleStars] = React.useState('any')       // 目标星级（any=不限）
  const [simpleCounts, setSimpleCounts] = React.useState(
    { tap: 135, hold: 2, slide: 4, touch: 0, break: 1 })            // 物量（内部默认）
  const [deriveResult, setDeriveResult] = React.useState(null)
  const [deriving, setDeriving] = React.useState(false)
  const [autoDerive, setAutoDerive] = React.useState(true)
  const [chartTitle, setChartTitle] = React.useState('')

  // 歌曲或难度一变就取真实物量。查不到就保留手填值，不打断输入。
  React.useEffect(() => {
    const musicId = Number(form.music_id)
    const level = Number(form.music_level)
    if (!musicId || musicId < 0) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const out = await api.chartInfo({ music_id: musicId, level })
        const notes = out?.result
        if (cancelled || !notes?.counts) return
        setSimpleCounts(notes.counts)
        setChartTitle(notes.title || '')
        const total = Number(notes.total) || 0
        const nextJudge = {}
        for (const kind of ['tap', 'hold', 'slide', 'touch', 'break']) {
          nextJudge[kind] = {
            CriticalPerfect: Number(notes.counts[kind]) || 0,
            Perfect: 0, Great: 0, Good: 0, Miss: 0,
          }
        }
        setJudge(nextJudge)
        setForm((f) => ({
          ...f,
          total_combo: total,
          max_combo: total,
          max_sync: total,
          total_sync: total,
        }))
      } catch {
        if (!cancelled) setChartTitle('')
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [form.music_id, form.music_level])

  // ★ 理论值约束（单向，达成率是唯一真源 —— 避免双向锁死）：
  //   达成率 ≥ 101  → 徽章强制 AP+ 并禁用（101 只可能是全 CP）
  //   达成率 < 101  → 徽章解锁；若当前是 AP+ 则自动降档为「无」
  //   用户选 AP+    → 达成率自动填 101（达成率**永不**禁用）
  //   解锁出口永远存在：改达成率（它始终可编辑）
  const isTheory = achvPct >= 101

  React.useEffect(() => {
    if (achvPct >= 101) {
      setForm((f) => (f.combo_status === 4 ? f : { ...f, combo_status: 4 }))
    } else if (form.combo_status === 4) {
      // 降到 101 以下：AP+ 不再成立 → 回退
      setForm((f) => ({ ...f, combo_status: 0 }))
    }
  }, [achvPct])

  // 用户改徽章：选 AP+ 时补齐达成率 101（其余档位不动达成率）
  function onComboChange(v) {
    set('combo_status')(v)
    if (v === 4) setAchvPct(101)
  }

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  // ---- 反推：调 /api/score/derive，把结果写回表单 ----
  // ★ 物量允许为空（输入框可清空），取值时统一兜底成 0
  const countsNum = {
    tap: Number(simpleCounts.tap) || 0,
    hold: Number(simpleCounts.hold) || 0,
    slide: Number(simpleCounts.slide) || 0,
    touch: Number(simpleCounts.touch) || 0,
    break: Number(simpleCounts.break) || 0,
  }
  const totalNotes = countsNum.tap + countsNum.hold + countsNum.slide
    + countsNum.touch + countsNum.break
  const judgeTotalNow = Object.values(judge).reduce((sum, row) => (
    sum + ['CriticalPerfect', 'Perfect', 'Great', 'Good', 'Miss']
      .reduce((s, key) => s + (Number(row?.[key]) || 0), 0)
  ), 0)

  // 最大连击跟着当前判定总数自动填。全连档必须等于总数；
  // 没选徽章时也先填总数，避免字段一直停在 0。
  React.useEffect(() => {
    const total = judgeTotalNow || totalNotes
    if (total > 0 && Number(form.max_combo) !== total) set('max_combo')(total)
  }, [judgeTotalNow, totalNotes])

  // ★ 星级 → DX 分自动推导（选了星级就该算出 DX，用户不用管具体数值）
  //   星级 = dx / (3 × 总物量) 的分档，反推时取该档比例**下限**的 DX 分。
  //   选「不限」时退回 97%（5 星下限）作为默认。
  const dxFromStars = totalNotes > 0 ? dxForStar(simpleStars === 'any' ? 5 : simpleStars, totalNotes) : 0

  // ★ 达成率 → 派生字段自动同步（评级 / 通关 / DX 分）
  //   简单模式只填达成率时，这些字段必须跟着算出来 ——
  //   否则会发出「100% 但 isClear=false、scoreRank=0」这种自相矛盾的报文
  //   （2026-10-26 实跑日志已证实该 bug）。
  React.useEffect(() => {
    if (achvPct === '' || !Number.isFinite(achvPct)) return
    setForm((f) => ({
      ...f,
      score_rank: rankFromAchievement(achvPct),
      is_clear: achvPct >= 80,
      // DX 分：星级优先（选了星级就用星级推导值），否则保持原值/估 97%
      deluxscore: simpleStars !== 'any'
        ? dxFromStars
        : (f.deluxscore || dxFromStars),
    }))
  }, [achvPct, totalNotes, simpleStars])

  function deriveBlockReason(pct) {
    if (!Number.isFinite(pct) || pct <= 0 || pct > 101) return '达成率请填 0 ~ 101 之间的百分比'
    const maxPct = countsNum.break > 0 ? 101 : 100
    if (pct > maxPct) {
      return countsNum.break > 0
        ? `达成率 ${pct}% 超过上限 ${maxPct}%（检查物量是否填对）`
        : `达成率 ${pct}% 超过上限 100% —— 这个谱面没有绝赞，要打 100% 以上请把绝赞数填成大于 0`
    }
    if (totalNotes === 0) return '物量还没取到，稍后再反推'
    return ''
  }

  async function deriveDistribution({ silent = false } = {}) {
    const pct = achvPct
    const reason = deriveBlockReason(pct)
    if (reason) {
      if (!silent) notify('error', reason)
      return
    }
    // ★ 星级 → DX 分换算：取该星档比例的下限 × 理论 DX(3N)
    //   （选 4 星 = 要求解里 DX ≥ 0.94×3N，反推排序时优先贴近）
    let targetDx = null
    if (simpleStars !== 'any') targetDx = dxForStar(simpleStars, totalNotes)
    setDeriving(true)
    try {
      const out = await act(
        () =>
          api.deriveScore({
            music_id: Number(form.music_id),
            level: Number(form.music_level),
            target_achievement_pct: pct,
            target_dx: targetDx,
            limit: 5,
            counts: countsNum,
          }),
        { refresh: false },
      )
      if (out?.result) {
        setDeriveResult(out.result)
        const best = out.result.rows?.[0]
        if (best) applyDerived(best)
      }
    } finally {
      setDeriving(false)
    }
  }

  // 自动反推：达成率、物量或星级变了就重新算。输入过程中等 0.6 秒，避免每个数字都请求。
  const deriveRef = React.useRef(deriveDistribution)
  deriveRef.current = deriveDistribution
  React.useEffect(() => {
    if (!autoDerive) return undefined
    if (deriveBlockReason(achvPct)) return undefined
    const timer = setTimeout(() => { deriveRef.current({ silent: true }) }, 600)
    return () => clearTimeout(timer)
  }, [autoDerive, achvPct, totalNotes, simpleStars, form.music_id, form.music_level])

  // 把反推结果（汇总判定 + 矩阵）写进表单 judge / form
  function applyDerived(row) {
    const m = row.judge_matrix
    const toUi = (o) => ({
      CriticalPerfect: o.CriticalPerfect, Perfect: o.Perfect, Great: o.Great,
      Good: o.Good, Miss: o.Miss,
    })
    setJudge({
      tap: toUi(m.tap), hold: toUi(m.hold), slide: toUi(m.slide),
      touch: toUi(m.touch), break: toUi(m.break),
    })
    // ★ 达成率用后端给的「推荐值」= 最接近目标的那个值（不是区间中值 ——
    //   中值会把 100.6 的目标算成 99.83，看起来像算错了）。
    //   老响应没有 achievement_pct 字段时退回"目标夹进区间"的算法。
    const achv = row.achievement_pct != null
      ? row.achievement_pct
      : Math.min(Math.max(Number(deriveResult?.target_pct ?? 0),
          row.achievement_min_pct), row.achievement_max_pct)
    // ★ 从判定矩阵推导徽章：
    //   无 Miss 且无 Good → 至少 FC；绝赞全 CP → AP；整曲无 Great → AP
    //   绝赞全 CP（无论其他）→ AP+（用户定义，优先级最高）
    const noMiss = m.tap.Miss + m.hold.Miss + m.slide.Miss + m.touch.Miss + m.break.Miss === 0
    const noGood = m.tap.Good + m.hold.Good + m.slide.Good + m.touch.Good + m.break.Good === 0
    const noGreat = noGood && m.tap.Great + m.hold.Great + m.slide.Great + m.touch.Great + m.break.Great === 0
    const breakAllCP = m.break.CriticalPerfect === countsNum.break && countsNum.break > 0
    let combo = 0
    if (noMiss) combo = 1                                   // FC
    if (noMiss && noGood) combo = 2                         // FC+（FC 且无 Good）
    if (noMiss && noGood && noGreat) combo = 3              // AP（无 Great 以下）
    if (noMiss && noGood && noGreat && breakAllCP) combo = 4 // AP+（绝赞全 CP）
    setForm((f) => ({
      ...f,
      achievement: Math.round(achv * 10000),
      deluxscore: row.dx ?? row.dx_min ?? 0,
      score_rank: deriveRank(achv),
      is_clear: achv >= 80,
      max_combo: Object.values(m).reduce((sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0), 0),
      // ★ 徽章语义随反推结果推导（反推即"这局怎么打的"），覆盖用户之前的选择 ——
      //   用户之后仍可在下拉里改
      combo_status: combo,
      sync_status: 0,          // 单人默认 = 0（用户实测校准）
    }))
  }

  // 从达成率反推评级档（协议映射）
  function deriveRank(achv) {
    return rankFromAchievement(achv)
  }

  function buildPlay() {
    // ★ 表单里允许留空（输入框可清空），但报文必须是数字 ——
    //   这里统一把空值/非数字兜底成 0，避免把 '' 发到后端导致类型错误。
    const num = (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
    const p = { ...form }
    for (const k of Object.keys(p)) {
      if (typeof p[k] === 'string' && p[k] !== '' && !Number.isNaN(Number(p[k]))
          && k !== 'version_str') {
        p[k] = num(p[k])
      } else if (p[k] === '') {
        p[k] = 0
      }
    }
    // 判定矩阵同样兜底
    const safeJudge = {}
    for (const [jtype, boxes] of Object.entries(judge)) {
      safeJudge[jtype] = {}
      for (const [box, n] of Object.entries(boxes)) safeJudge[jtype][box] = num(n)
    }
    p.judge_counts = safeJudge
    return p
  }

  // ★ 按总物量 + 达成率 + 徽章自动分配 25 格判定（保证总数守恒）
  //   服务端硬约束：判定总数必须 == totalCombo，否则被当作异常成绩。
  //   这里按「普通音符 CP → 绝赞 CP」的顺序分配，失分优先落在 Great/Good/Miss。
  function autoFillJudges({ silent = false } = {}) {
    const total = totalNotes || Number(form.total_combo) || 0
    if (total <= 0) {
      if (!silent) notify('error', '总物量还没取到，填好歌曲和难度后再分配')
      return
    }
    const achv = achvPct === '' ? 0 : achvPct
    const combo = Number(form.combo_status) || 0

    // 各类型音符占比（用物量输入，没有就按典型比例）
    const base = totalNotes > 0
      ? countsNum
      : { tap: total, hold: 0, slide: 0, touch: 0, break: 0 }
    const baseSum = base.tap + base.hold + base.slide + base.touch + base.break || total
    const alloc = {
      tap: Math.round(total * base.tap / baseSum),
      hold: Math.round(total * base.hold / baseSum),
      slide: Math.round(total * base.slide / baseSum),
      touch: Math.round(total * base.touch / baseSum),
      break: Math.round(total * base.break / baseSum),
    }
    // 补齐舍入误差（都塞给 tap）
    const allocated = alloc.tap + alloc.hold + alloc.slide + alloc.touch + alloc.break
    alloc.tap += total - allocated

    // 判定分配策略（按徽章档位）
    //   0=无 → 按达成率估算失分；1=FC → 无 Miss；2=FC+ → 无 Miss/Good
    //   3=AP → 无 Great 以下；4=AP+ → 全 CP
    const empty = () => ({ CriticalPerfect: 0, Perfect: 0, Great: 0, Good: 0, Miss: 0 })
    const next = { tap: empty(), hold: empty(), slide: empty(), touch: empty(), break: empty() }

    if (combo === 4) {
      // AP+：全部 CP
      for (const k of Object.keys(alloc)) next[k].CriticalPerfect = alloc[k]
    } else if (combo === 3) {
      // AP：无 Great 以下，CP/P 混搭（按达成率给 CP 比例）
      for (const k of Object.keys(alloc)) {
        const n = alloc[k]
        const cp = Math.round(n * Math.min(1, (achv - 99) / 2 + 0.5))
        next[k].CriticalPerfect = Math.min(cp, n)
        next[k].Perfect = n - next[k].CriticalPerfect
      }
    } else {
      // FC / FC+ / 无：用「Great 数量」表达失分（达成率越低 Great 越多）
      //   每个 Great 相对 CP 损失约 0.1%~0.15%，粗略按 1% 失分 ≈ 8 个 Great
      const loss = Math.max(0, 101 - achv)
      let great = Math.min(total, Math.round(loss * 8))
      for (const k of Object.keys(alloc)) {
        const n = alloc[k]
        if (n === 0) continue
        const g = Math.min(n, Math.round(great * n / total))
        great -= g
        next[k].Great = g
        const rest = n - g
        // 剩余给 CP/P（AP 档位以下允许 P）
        const cp = Math.round(rest * 0.9)
        next[k].CriticalPerfect = cp
        next[k].Perfect = rest - cp
      }
    }

    setJudge(next)
    set('total_combo')(total)
    set('max_combo')(total)
    if (!silent) notify('success', `已按物量 ${total} 分配判定（徽章档 ${combo}，达成率 ${achv}%）`)
  }

  const fillRef = React.useRef(autoFillJudges)
  fillRef.current = autoFillJudges
  React.useEffect(() => {
    if (!autoDerive || totalNotes <= 0 || achvPct === '') return undefined
    const timer = setTimeout(() => { fillRef.current({ silent: true }) }, 700)
    return () => clearTimeout(timer)
  }, [autoDerive, totalNotes, achvPct, form.combo_status])

  // ★ 提交前的字段校验（与服务端 validate_play 同源规则，做即时反馈）
  //   返回错误字符串数组，空数组 = 通过
  function validateForm() {
    const errs = []
    const achv = Number(form.achievement) || 0            // 内部已是 ×10000 的整数
    // ★ 未填（0）= 必填项缺失，不是"0% 成绩"
    if (achv === 0) {
      errs.push('达成率未填 —— 这是必填项（0 表示本局失败，请显式填写或留空后不提交）')
    } else if (achv < 0 || achv > 1010000) {
      errs.push(`达成率 ${(achv / 10000).toFixed(4)}% 超出范围 0~101%（101% 是理论值上限）`)
    }
    if (Number(form.deluxscore) < 0) errs.push('DX 分不能为负')

    const combo = Number(form.combo_status) || 0
    if (combo === 3 || combo === 4) {
      if (achv < 990000) {
        errs.push(`通关徽章选了 AP/AP+，但达成率只有 ${(achv / 10000).toFixed(4)}% —— 需 ≥ 99%（无 Great 以下才可能 AP）`)
      }
      if (combo === 4 && achv !== 1010000) {
        errs.push('通关徽章选了 AP+，但达成率不是 101% —— AP+ 只能是理论值')
      }
    }

    // 判定矩阵：不能有负数；总数应与 totalCombo 一致
    let judgeTotal = 0
    for (const [jtype, boxes] of Object.entries(judge)) {
      for (const [box, n] of Object.entries(boxes)) {
        const v = Number(n) || 0
        if (v < 0) errs.push(`判定 ${jtype}.${box} 不能为负`)
        judgeTotal += v
      }
    }
    if (judgeTotal === 0) {
      errs.push('判定明细全为 0 —— 至少给每类 note 一个判定，否则服务端视为异常成绩')
    }
    // ★ 判定总数必须等于 totalCombo（协议硬约束，服务端会校验）
    const totalCombo = Number(form.total_combo) || 0
    if (judgeTotal > 0 && totalCombo > 0 && judgeTotal !== totalCombo) {
      errs.push(
        `判定明细总数 ${judgeTotal} ≠ 总物量 ${totalCombo}`
        + ' —— 两者必须相等。点「按物量自动分配判定」可一键补齐。')
    }
    // ★ FC/AP 与 maxCombo 的一致性
    const combo2 = Number(form.combo_status) || 0
    const maxCombo = Number(form.max_combo) || 0
    if (combo2 >= 1 && judgeTotal > 0 && maxCombo !== judgeTotal) {
      errs.push(`选了 FC/AP 档但最大连击 ${maxCombo} ≠ 判定总数 ${judgeTotal} —— 全连时两者必须相等`)
    }
    return errs
  }

  async function run(send) {
    // ★ 前端先拦：字段非法直接报错，不发请求
    const errs = validateForm()
    if (errs.length) {
      notify('error', '校验未通过：' + errs.join('；'))
      return
    }
    let extraData = null
    if (extra.trim()) {
      try {
        extraData = JSON.parse(extra)
      } catch (e) {
        notify('error', 'extra_data 不是合法 JSON：' + e.message)
        return
      }
    }
    const out = await act(
      () =>
        api.upsert({
          play: buildPlay(),
          extra_data: extraData,
          confirm: send,
          verify_landing: verify,
          cooldown_sec: cooldown === '' ? null : Number(cooldown),
        }),
      {
        successText: send ? '已真实上传（不可撤销）' : '预检完成：未发包',
      },
    )
    if (out) setResult(out)
  }

  // 未登录 = 只读预览模式：页面照常渲染，提交类按钮禁用
  const readOnly = !session?.logged_in

  // ★ 实时校验（渲染期计算，输入即反馈）
  const formErrors = validateForm()

  return (
    <Box>
      <NeedLogin
        title="成绩上传"
        desc="向舞萌DX 服务器上传一局完整的结算数据 —— 表单里填好曲目、成绩与判定明细，先「预检」构造报文确认无误，再「真实上传」写入。支持 extra_data 塞入任意节点。"
      />

      <Section
        title="上传一局成绩"
        subtitle="扫码 → 预览 → 登录 → UpsertUserAll（36 节点 / 110 字段 / 差分）→ 落库回查 → 登出"
        right={readOnly
          ? <StatusChip ok={false}>只读预览</StatusChip>
          : <StatusChip ok>user {session?.user_id ?? '—'}</StatusChip>}
      >

        {/* ============ 简易模式：曲目与难度（永远可见，不进高级） ============ */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>曲目与难度</Typography>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="musicId" value={form.music_id} onChange={set('music_id')}
              hint="谱面编号。标准谱小于 10000，DX 谱大于等于 10000。填好后自动取这首歌的真实物量。"
              helperText={chartTitle || ' '} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <TextField
              select
              label="难度"
              value={form.music_level}
              onChange={(e) => set('music_level')(Number(e.target.value))}
              fullWidth
              SelectProps={{ MenuProps: { disableScrollLock: true } }}
            >
              {LEVELS.map((l) => (
                <MenuItem key={l.v} value={l.v}>{l.name}（{l.v}）</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* ============ 目标成绩：达成率 + 星级 + 徽章（全下拉）+ 评级只读 ============ */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>目标成绩</Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="达成率 (%)" value={achvPct} onChange={setAchvPct}
              placeholder="如 99.5123"
              hint="结算画面上的百分比，如 99 或 100.5。满分 101（有绝赞的谱面）。改到 101 会自动锁定通关徽章为 AP+。"
              inputProps={{ step: 0.0001 }} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <TextField
              select
              label="DX 星级（可选）"
              value={simpleStars}
              onChange={(e) => setSimpleStars(e.target.value)}
              fullWidth
              SelectProps={{ MenuProps: { disableScrollLock: true } }}
              helperText={
                totalNotes > 0
                  ? `将填入 DX 分 ≈ ${dxFromStars} / ${3 * totalNotes}`
                  : '先填物量才能换算 DX 分'
              }
            >
              <MenuItem value="any">不限</MenuItem>
              {[5, 4, 3, 2, 1].map((s) => (
                <MenuItem key={s} value={String(s)}>★{String(s)}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Tooltip
              title={isTheory
                ? '达成率为 101（理论值）—— 必然是 AP+，此档位锁定。要改徽章请先把达成率降到 101 以下。'
                : '选 AP+ 会自动把达成率填为 101（理论值）'}
              arrow placement="top"
            >
              <TextField
                select
                label="通关徽章（可选）"
                value={String(form.combo_status)}
                onChange={(e) => onComboChange(Number(e.target.value))}
                fullWidth
                disabled={isTheory}
                SelectProps={{ MenuProps: { disableScrollLock: true } }}
              >
                {COMBO_BADGES.map((b) => (
                  <MenuItem key={b.v} value={String(b.v)}>{b.name}</MenuItem>
                ))}
              </TextField>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <TextField
              select
              label="同步徽章（可选）"
              value={String(form.sync_status)}
              onChange={(e) => set('sync_status')(Number(e.target.value))}
              fullWidth
              SelectProps={{ MenuProps: { disableScrollLock: true } }}
            >
              {SYNC_BADGES.map((b) => (
                <MenuItem key={b.v} value={String(b.v)}>{b.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        {/* ★ 评级只读展示：达成率的派生物，不是输入 */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            将获得评级：
          </Typography>
          {achvPct === '' ? (
            <Typography variant="body2" color="text.disabled">填达成率后自动显示</Typography>
          ) : (
            <>
              <Chip
                label={SCORE_RANKS.find((r) => r.v === rankFromAchievement(achvPct))?.name || '—'}
                color="primary"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                通关：{achvPct >= 80 ? '是' : '否'}（自动）
              </Typography>
            </>
          )}
        </Stack>

        {/* ★ 实时校验提示：有错立刻显示，并禁用提交按钮 */}
        {formErrors.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              当前表单无法提交（{formErrors.length} 项问题）
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {formErrors.map((e, i) => (
                <li key={i}><Typography variant="caption">{e}</Typography></li>
              ))}
            </Box>
          </Alert>
        )}

        {/* ---- 提交按钮（简单模式主流程终点） ---- */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" startIcon={<CloudUploadIcon />}
            disabled={busy || readOnly || formErrors.length > 0}
            onClick={() => run(false)}>
            预检（不发包）
          </Button>
          <Button variant="contained" color="error" startIcon={<CloudUploadIcon />}
            disabled={busy || readOnly || formErrors.length > 0}
            onClick={() => setConfirm(true)}>
            真实上传
          </Button>
          <Toggle label="上传后落库回查" checked={verify} onChange={setVerify}
            hint="发包后重新拉服务器数据，确认真的写进去了。returnCode=1 不代表数据被应用。" />
        </Stack>


        {/* ---- 高级选项：完整字段（折叠） ---- */}
        <Accordion
          defaultExpanded={false}
          sx={{
            mt: 2,                                  // 与上方提交区拉开距离
            mb: 0,                                  // Section 自带 padding 收尾
            borderRadius: '12px',
            // ★ 必须与 Section 的 surfaceContainerLow 有可区分的视觉边界：
            //   用 outline 边框 + 更深一档的底色，否则卡片"消失"在容器里
            border: '1px solid', borderColor: 'outlineVariant',
            bgcolor: 'surfaceContainer',
            overflow: 'hidden',                     // 圆角裁剪展开内容
            '&:before': { display: 'none' },
            boxShadow: 'none',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              高级选项 —— 完整字段（判定明细 / 物量 / 本局消耗 / 增量差分）
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>

        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
          机台界面状态（真机固定值，一般不用改）
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="trackNo" value={form.track_no} onChange={set('track_no')}
              hint="本局第几首" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="categoryIndex" value={form.category_index} onChange={set('category_index')}
              hint="机台选曲界面的分类页签编号（如「原创」「东方」等），真机固定为 2022。成绩记录与玩家设置会自动写成同一个值，一般不用改 —— 改成 0 会被服务端视为异常。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="version (int)" value={form.version_int} onChange={set('version_int')}
              hint="游戏版本号（数字形式），1056000 代表 1.56.00。同版本必须与下面的字符串版一致。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <TextField2 label="version (str)" value={form.version_str} onChange={set('version_str')}
              hint="同一个版本号的字符串形式（1.56.00）。两个字段只是格式不同，值必须对应。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="musicIndex" value={form.music_index} onChange={set('music_index')}
              hint="机台选曲界面光标停在第几首歌（界面位置记录，不影响成绩）。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="extraFlag" value={form.extra_flag} onChange={set('extra_flag')}
              hint="机台界面的额外状态标记，真机固定 1721，一般不用改。" />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, color: 'primary.main' }}>成绩</Typography>
        {/* ---- 可选工具：判定分布反推 ---- */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5, gap: 1 }}>
            <AutoModeIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              判定分布反推
            </Typography>
            <Toggle label="自动反推" checked={autoDerive} onChange={setAutoDerive}
              hint="达成率、物量或星级变化后自动重算 25 格判定。关掉后只在点「生成」时计算。" />
          </Stack>

          {/* ★ 物量是反推的**输入**，必须排在生成按钮之前 */}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            1. 谱面物量（求解约束；服务器不对照真实谱面，默认值即可跑通）
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 1.75 }}>
            <Grid item xs={6} sm={3} lg={2}>
              <NumField label="TAP 数" value={simpleCounts.tap}
                onChange={(v) => setSimpleCounts((c) => ({ ...c, tap: v }))} />
            </Grid>
            <Grid item xs={6} sm={3} lg={2}>
              <NumField label="HOLD 数" value={simpleCounts.hold}
                onChange={(v) => setSimpleCounts((c) => ({ ...c, hold: v }))} />
            </Grid>
            <Grid item xs={6} sm={3} lg={2}>
              <NumField label="SLIDE 数" value={simpleCounts.slide}
                onChange={(v) => setSimpleCounts((c) => ({ ...c, slide: v }))} />
            </Grid>
            <Grid item xs={6} sm={3} lg={2}>
              <NumField label="TOUCH 数" value={simpleCounts.touch}
                hint="只有 DX 谱（musicId ≥ 10000）才有 Touch。标准谱填 0。"
                onChange={(v) => setSimpleCounts((c) => ({ ...c, touch: v }))} />
            </Grid>
            <Grid item xs={6} sm={3} lg={2}>
              <NumField label="绝赞数" value={simpleCounts.break}
                onChange={(v) => setSimpleCounts((c) => ({ ...c, break: v }))} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', pt: 1 }}>
                总物量 {totalNotes} 音
                {' · '}
                理论上限 <b>{countsNum.break > 0 ? '101%' : '100%'}</b>
                {countsNum.break === 0 && '（无绝赞）'}
                {Number(form.music_id) < 10000 && countsNum.touch > 0
                  && ' · 标准谱没有 Touch'}
              </Typography>
            </Grid>
          </Grid>

          {/* 2. 目标成绩（来自上方「目标成绩」区）→ 生成 */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              2. 目标 {achvPct === '' ? '（未填达成率）' : `${achvPct}%`}
              {simpleStars !== 'any' ? ` · ★${simpleStars}` : ''} → 生成 25 格判定
            </Typography>
            <Button variant="contained" size="small" startIcon={<AutoModeIcon />}
              onClick={() => deriveDistribution()} disabled={busy || deriving}>
              {deriving ? '反推中…' : (autoDerive ? '重新生成' : '生成')}
            </Button>
          </Stack>
          {deriveResult && (() => {
            const best = deriveResult.rows?.[0]
            if (!best) return null
            return (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  目标 {deriveResult.target_pct}% → 推荐写入
                  <b> {best.achievement_pct}%</b>
                  （该组合可打出 {best.achievement_min_pct}% ~ {best.achievement_max_pct}%）
                  · DX {best.dx}
                  {best.covers_target
                    ? ' · ✅ 覆盖目标'
                    : ` · ⚠ 偏差 ${best.error_pct}%`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  结果已写入下方判定明细与达成率，可微调
                </Typography>
              </Box>
            )
          })()}
          {deriveResult?.fallback_note && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              ⓘ {deriveResult.fallback_note}
            </Typography>
          )}
        </Paper>
        {/* ★ 成绩：达成率/评级已在上方「目标成绩」区（单一入口），
              这里只保留纯协议字段（DX 分 / combo / sync / fast-late） */}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="deluxscore" value={form.deluxscore} onChange={set('deluxscore')}
              hint="DX 分数。简单模式的反推会自动填入，这里可手动覆盖。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="scoreRank（协议值）" value={form.score_rank} onChange={set('score_rank')}
              hint="评级数字。由达成率自动推导（简单模式显示为文字），这里可强制覆盖。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="最大连击" value={form.max_combo} onChange={set('max_combo')} hint="本局最长的连续命中数。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="总物量" value={form.total_combo} onChange={set('total_combo')}
              hint="这首歌的音符总数（服务端存档里的值）。判定明细之和必须等于它。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="判定之和（自动）"
              value={Object.values(judge).reduce((s, j) =>
                s + (Number(j.CriticalPerfect) || 0) + (Number(j.Perfect) || 0)
                  + (Number(j.Great) || 0) + (Number(j.Good) || 0) + (Number(j.Miss) || 0), 0)}
              onChange={() => {}}
              hint="判定明细五类之和。必须等于上面的总物量，否则服务端视为异常成绩。"
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="最大同步连击" value={form.max_sync} onChange={set('max_sync')} hint="双人模式下最长的连续同步命中数。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="总同步数" value={form.total_sync} onChange={set('total_sync')} hint="双人模式下总共同步命中的次数。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="FAST 次数" value={form.fast_count} onChange={set('fast_count')} hint="打早了（FAST）的音符数。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="LATE 次数" value={form.late_count} onChange={set('late_count')} hint="打晚了（LATE）的音符数。" />
          </Grid>
        </Grid>

        {/* ★ isClear 由达成率自动推导（≥80% 通关），这里只做只读展示 + 手动覆盖入口 */}
        <Stack direction="row" flexWrap="wrap" sx={{ mt: 2, gap: 3 }} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            isClear（通关）：{form.is_clear ? 'true' : 'false'}
            <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
              （达成率 ≥ 80% 自动为 true）
            </Typography>
          </Typography>
          <Toggle label="强制覆盖 isClear" checked={form.is_clear} onChange={set('is_clear')}
            hint="仅在需要构造异常报文时使用 —— 正常情况由达成率推导" />
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, color: 'primary.main' }}>
          判定明细（每类音符各判定的数量）
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1, gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            25 个判定字段，五类之和必须等于总物量（当前 {Number(form.total_combo) || 0}）。
          </Typography>
          <Button size="small" variant="outlined" onClick={autoFillJudges}>
            按物量自动分配
          </Button>
        </Stack>
        <Grid container spacing={1.5}>
          {Object.keys(judge).map((kind) => (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={kind}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {JUDGE_LABELS[kind]}
              </Typography>
              <Stack direction="row" spacing={0.75}>
                {['CriticalPerfect', 'Perfect', 'Great', 'Good', 'Miss'].map((j) => (
                  <TextField2
                    key={j}
                    label={j === 'CriticalPerfect' ? 'CP' : j === 'Perfect' ? 'P' : j === 'Great' ? 'G' : j === 'Good' ? 'GD' : 'MS'}
                    value={judge[kind][j]}
                    onChange={(v) =>
                      setJudge((prev) => ({ ...prev, [kind]: { ...prev[kind], [j]: v } }))
                    }
                    type="number"
                  />
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, color: 'primary.main' }}>本局消耗</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="playCredit" value={form.play_credit} onChange={set('play_credit')}
              hint="本局消耗的投币数 = 投币成本 + 票附带的次数。真机正常值是 1。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="useTicketId" value={form.use_ticket_id} onChange={set('use_ticket_id')}
              hint="本局用了哪张功能票。-1 表示没用票（绝大多数情况都是 -1）。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="playMode" value={form.play_mode} onChange={set('play_mode')} hint="游玩模式。0 = 普通单人/双人游玩，一般不用改。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Box sx={{ pt: 1 }}>
              <Toggle label="活动模式" checked={form.is_event_mode} onChange={set('is_event_mode')} hint="是否在活动模式下游玩，普通对局关闭即可。" />
            </Box>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, color: 'primary.main' }}>
          本局带来的变化（增量）
        </Typography>
        <Alert severity="info" sx={{ mb: 1.5 }}>
          总游玩次数和这首歌的游玩次数默认各 +1，和真机结算一致。
          改成 0 时条目仍会回传，但服务器可能把整包当成「这局没变化」丢掉。
        </Alert>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="总游玩次数 +" value={form.user_play_count_gain} onChange={set('user_play_count_gain')}
              hint="账号总游玩次数增加多少。真机每局 +1。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="这首歌次数 +" value={form.music_play_count_gain} onChange={set('music_play_count_gain')}
              hint="这首歌这个难度的游玩次数增加多少。真机每局 +1。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="mapDistanceGain" value={form.map_distance_gain} onChange={set('map_distance_gain')}
              hint="地图进度前进多少。真机一局约 11000。默认 0 = 不推进地图。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <NumField label="characterExpGain" value={form.character_exp_gain} onChange={set('character_exp_gain')}
              hint="组队角色升几级。真机一局 5 只各 +1 级。默认 0 = 不加经验。" />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, color: 'primary.main' }}>
          extra_data（额外塞节点，可选）
        </Typography>
        <TextField2
          label='JSON，键必须是 36 个节点之一，例如 {"userKaleidxScopeList":[...], "isNewKaleidxScopeList":"1"}'
          value={extra}
          onChange={setExtra}
          multiline
          minRows={3}
          maxRows={10}
          placeholder="留空 = 不传"
        />
        <Typography variant="caption" color="text.secondary">
          新增条目请显式传位串 "1"；"0" 表示存量更新。对已存在条目填 1 会 HTTP 500。
        </Typography>
          </AccordionDetails>
        </Accordion>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={result.dry_run ? 'info' : 'success'} sx={{ mb: 1 }}>
              {result.dry_run ? '预检完成，未发包' : '已发包'}
            </Alert>
            <JsonBox data={result.result} maxHeight={420} />
          </Box>
        )}
      </Section>

      <DangerConfirm
        open={confirm}
        title="确认真实上传成绩？"
        body={{
          main: '即将向舞萌DX 服务器写入一局成绩：',
          rows: [
            ['user_id', session?.user_id ?? '—'],
            ['musicId / level', `${form.music_id} / L${form.music_level}`],
            ['achievement', form.achievement],
            ['deluxscore', form.deluxscore],
            ['isClear', String(form.is_clear)],
          ],
          detail: '此操作会真实写入服务器。请遵守游戏服务条款，不要用于破坏游戏公平性。',
        }}
        confirmWord="确认上传"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onOk={async () => {
          setConfirm(false)
          await run(true)
        }}
      />
    </Box>
  )
}

// 未登录横幅：显示在页面顶部 —— 页面内容照常渲染（只读预览），
// 提交类按钮由各页用 readOnly 禁用。横幅本身带「去登录」。
export function NeedLogin({ title = '此页面', desc }) {
  const { setPage } = useApp()
  return (
    <Alert
      severity="info"
      icon={<QrCodeIcon />}
      sx={{ mb: 2.5, borderRadius: '12px', alignItems: 'flex-start', py: 1.5 }}
      action={
        <Button color="inherit" size="small" variant="outlined"
          onClick={() => setPage('login')}
          sx={{ borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0, mt: 0.25 }}>
          去登录
        </Button>
      }
    >
      {/* ★ 主句一行、说明一段：不挤在同一段里；窄屏下按钮浮到右上也不挡字 */}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        未登录 —— 以下为{title}的只读预览，登录后才能执行操作
      </Typography>
      {desc && (
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 0.5, lineHeight: 1.7, maxWidth: 620 }}>
          {desc}
        </Typography>
      )}
    </Alert>
  )
}

