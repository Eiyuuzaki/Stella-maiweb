// 版本预设。每个版本一张带 logo 的卡片；支持把多组配置排成长队列依次上传。
import React from 'react'
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material'
import { NumField, Section } from './components.jsx'
import { api } from './api.js'
import { useApp } from './store.jsx'
import { CHART_LEVELS, VERSIONS, chartsForVersion, versionLogo } from './versionCharts.js'
import { judgesForDx, randomDxForStar } from './dxStars.js'
import { ensureNotifyPermission, pushNotify } from './notify.js'

const TYPES = [
  { id: 'standard', label: '标准谱' },
  { id: 'dx', label: 'DX 谱' },
]
const COMBOS = ['无', 'FC', 'FC+', 'AP', 'AP+']
const SYNCS = ['单人', 'FS', 'FS+', 'FDX', 'FDX+', 'SYNC']
const STARS = [0, 1, 2, 3, 4, 5]
const QUEUE_KEY = 'stella-version-queue-v1'
const STATUS_LABEL = { pending: '待跑', running: '上传中', done: '已完成', error: '失败' }
const STATUS_COLOR = { pending: 'text.secondary', running: 'primary.main', done: 'success.main', error: 'error.main' }

// 达成率 -> 评级编号（协议值，13=SSS+ 为上限）
// ★ 不传的话后端走 config 默认 PLAY_SCORE_RANK=0（D）、PLAY_IS_CLEAR=false，
//   成绩 101% 但评级显示 D —— 2026-10-29 实测踩过
function rankOf(pct) {
  if (pct >= 100.5) return 13
  if (pct >= 100) return 12
  if (pct >= 99.5) return 11
  if (pct >= 99) return 10
  if (pct >= 98) return 9
  if (pct >= 97) return 8
  if (pct >= 94) return 7
  if (pct >= 90) return 6
  if (pct >= 80) return 5
  if (pct >= 75) return 4
  if (pct >= 70) return 3
  if (pct >= 65) return 2
  if (pct >= 60) return 1
  return 0
}

// 归零用：全部判为 Miss，总数守恒（判定和 = 物量），服务端自检才过
function zeroJudges(notes, type) {
  const names = ['tap', 'hold', 'slide', 'touch', 'break']
  return Object.fromEntries(names.map((name) => {
    const n = name === 'touch' && type !== 'dx' ? 0 : Number(notes?.[name]) || 0
    return [name, { CriticalPerfect: 0, Perfect: 0, Great: 0, Good: 0, Miss: n }]
  }))
}

function Choice({ label, selected, onClick }) {
  return (
    <Box
      component="button" type="button" onClick={onClick}
      sx={{
        px: 1.5, height: 36, borderRadius: '999px', cursor: 'pointer',
        border: '1px solid', borderColor: selected ? 'primary.main' : 'outlineVariant',
        bgcolor: selected ? 'primary.main' : 'transparent',
        color: selected ? 'primary.contrastText' : 'text.primary', font: 'inherit',
      }}
    >
      {label}
    </Box>
  )
}

function randomAchievement(min, max) {
  const low = Math.round(Math.min(min, max) * 10000)
  const high = Math.round(Math.max(min, max) * 10000)
  return (low + Math.floor(Math.random() * (high - low + 1))) / 10000
}

// 异常成绩判定：达成率和评级/徽章互相矛盾 = 大概率是批量发送时漏传字段造成的
// 典型症状：101% 却是 D 评级（scoreRank=0），或 101% 却没有 AP+
// ★ 只认"高达成率配低评级"的矛盾 —— 低达成率的 D 是正常游玩，不能误伤
// ★ 宴谱（musicId >= 100000）官方就没有评级，scoreRank=0 是正常的，必须排除
function anomalyReason(row) {
  if (!row) return null
  const mid = Number(row.musicId) || 0
  if (mid >= 100000) return null
  const achv = Number(row.achievement) || 0
  const rank = Number(row.scoreRank) || 0
  const combo = Number(row.comboStatus) || 0
  if (achv <= 0) return null
  const pct = achv / 10000
  const expect = rankOf(pct)
  if (pct >= 97 && rank === 0) return `达成率 ${pct.toFixed(4)}% 却是 D 评级`
  if (expect >= 8 && rank !== expect && rank < 8) {
    return `评级不符：达成率 ${pct.toFixed(4)}% 应为 ${expect}，实际 ${rank}`
  }
  if (pct >= 101 && combo !== 4) return `达成率 101% 但徽章不是 AP+`
  return null
}

function musicRows(snapshot) {
  const music = snapshot?.userMusicDetailList
  const rows = music?.userMusicList || music || []
  const flat = []
  for (const row of Array.isArray(rows) ? rows : []) {
    if (Array.isArray(row?.userMusicDetailList)) flat.push(...row.userMusicDetailList)
    else if (row && typeof row === 'object') flat.push(row)
  }
  return flat
}

function loadQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    // 上次中断的"上传中"任务回到待跑 —— 跳过逻辑会自动补传剩余的
    return Array.isArray(saved)
      ? saved.map((t) => ({ ...t, status: t.status === 'running' ? 'pending' : t.status }))
      : []
  } catch {
    return []
  }
}

export default function VersionPresetPage() {
  const { session, refreshStatus, notify } = useApp()
  const [versionId, setVersionId] = React.useState(VERSIONS.at(-1)?.id || 0)
  const [level, setLevel] = React.useState(3)
  const [type, setType] = React.useState('dx')
  const [minAchievement, setMinAchievement] = React.useState(100.5)
  const [maxAchievement, setMaxAchievement] = React.useState(100.9999)
  const [combo, setCombo] = React.useState(0)
  const [sync, setSync] = React.useState(0)
  const [stars, setStars] = React.useState(5)
  const [snapshot, setSnapshot] = React.useState(null)
  const [previewError, setPreviewError] = React.useState('')
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState('')
  const [doneCount, setDoneCount] = React.useState(0)
  const [runTotal, setRunTotal] = React.useState(0)
  const [queue, setQueue] = React.useState(loadQueue)
  const [queueRunning, setQueueRunning] = React.useState(false)
  // 覆盖模式：忽略"已有成绩更好"的跳过判断，全部重传（修复评级/徽章这类元数据）
  const [overwrite, setOverwrite] = React.useState(false)
  // 归零模式（伪清除）：全部发 0 分 —— 记录仍在、数值清零，游戏里显示 0.0000% D
  const [zeroOut, setZeroOut] = React.useState(false)
  // 只处理异常成绩：仅对"评级与达成率矛盾"的谱面归零，正常成绩不动
  const [onlyAnomaly, setOnlyAnomaly] = React.useState(false)
  // 任务完成系统推送（浏览器通知，切后台才弹）
  const [pushOn, setPushOn] = React.useState(() => localStorage.getItem('stella-notify') === '1')
  const setPush = async (on) => {
    if (on && !(await ensureNotifyPermission())) {
      notify('error', '浏览器拒绝了通知权限，请在地址栏权限设置里允许')
      return
    }
    localStorage.setItem('stella-notify', on ? '1' : '0')
    setPushOn(on)
  }

  const selected = VERSIONS.find((v) => v.id === versionId) || VERSIONS[0]
  const charts = chartsForVersion(versionId, { type, levels: [level] })
  const levelLabel = CHART_LEVELS.find((item) => item.id === level)?.label || ''
  const maxAllowsApp = Number(maxAchievement) >= 101

  React.useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }, [queue])

  React.useEffect(() => {
    if (!session?.user_id) return undefined
    let stop = false
    api.snapshot().then((out) => { if (!stop) setSnapshot(out.result?.nodes || null) })
      .catch((err) => { if (!stop) setPreviewError(err.message || '没有读到账号快照') })
    return () => { stop = true }
  }, [session?.user_id])

  // 存整条记录（达成率 + scoreRank 等），异常检查要用
  const existingRows = React.useMemo(() => {
    const map = new Map()
    for (const row of musicRows(snapshot)) map.set(`${row.musicId}:${row.level}`, row)
    return map
  }, [snapshot])
  const existing = React.useMemo(() => {
    const map = new Map()
    for (const [key, row] of existingRows) map.set(key, Number(row.achievement) || 0)
    return map
  }, [existingRows])
  const preview = React.useMemo(() => charts.map((chart) => {
    const key = `${chart.musicId}:${chart.level}`
    const row = existingRows.get(key)
    const anomaly = anomalyReason(row)
    // 归零模式：一律以达成率 0 覆盖（伪清除），不做随机、不跳过
    const target = zeroOut ? 0 : randomAchievement(Number(minAchievement) || 0, Number(maxAchievement) || 0)
    const stored = existing.get(key)
    // 异常处理模式：只动判定为异常的那些，正常成绩一律跳过（保护自己打过的）
    let action = zeroOut || overwrite || stored == null || stored < Math.round(target * 10000) ? '上传' : '跳过'
    if (onlyAnomaly) action = anomaly ? '上传' : '跳过'
    return {
      ...chart, target, action, stored, anomaly,
      dx: zeroOut || (onlyAnomaly && anomaly) ? 0 : randomDxForStar(stars, chart.total),
    }
    // 随机值只在筛选或分数范围变化时重新生成，普通重绘不能改变它。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [versionId, type, level, minAchievement, maxAchievement, stars, existing, existingRows, overwrite, zeroOut, onlyAnomaly])
  const anomalyCount = preview.filter((row) => row.anomaly).length
  const uploadCount = preview.filter((row) => row.action === '上传').length
  const uploads = preview.filter((row) => row.action === '上传')
  const pendingCount = queue.filter((task) => task.status === 'pending').length

  // 单曲/单版本立即上传（不走队列）
  async function startUpload() {
    if (!session?.logged_in || !uploads.length || running || queueRunning) return
    setRunning(true)
    setDoneCount(0)
    setRunTotal(uploads.length)
    let previous = []
    try {
      for (let index = 0; index < uploads.length; index += 4) {
        const batch = uploads.slice(index, index + 4)
        const message = `正在上传 ${index + 1}–${index + batch.length} / ${uploads.length}`
        setProgress(message)
        await api.updateBatchProgress({ running: true, done: index, total: uploads.length, message })
        await api.upsert({
          plays: batch.map((chart, offset) => ({
            music_id: chart.musicId,
            music_level: chart.level,
            achievement: Math.round(chart.target * 10000),
            score_rank: rankOf(chart.target),
            is_clear: chart.target >= 80,
            combo_status: chart.target >= 101 ? 4 : combo,
            sync_status: sync,
            deluxscore: chart.dx,
            total_combo: chart.total,
            max_combo: zeroOut ? 0 : chart.total,
            max_sync: chart.total,
            total_sync: chart.total,
            track_no: offset + 1,
            judge_counts: zeroOut
              ? zeroJudges(chart.notes, chart.type)
              : judgesForDx(chart.notes, chart.dx, chart.type),
          })),
          confirm: true,
          verify_landing: false,
          overwrite_scores: overwrite || zeroOut,
        })
        if (previous.length) {
          // 回查是尽力而为：失败（如已登出）不阻断收尾上报
          try { await api.verifyPlays(previous, session?.user_id) } catch { /* 忽略 */ }
        }
        previous = batch.map((chart) => ({
          music_id: chart.musicId,
          music_level: chart.level,
          achievement: Math.round(chart.target * 10000),
        }))
        // 每批结束都 type1 登出 + 续关（回查需要活动会话）；运行结束后统一 type4 释放
        await api.logout(true)
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await api.continueLogin()
        await refreshStatus()
        setDoneCount(index + batch.length)
      }
      // 最后一局的延迟回查：在续关后的新会话里查（Get 需要活动会话）
      if (previous.length) { try { await api.verifyPlays(previous, session?.user_id) } catch { /* 忽略 */ } }
      setDoneCount(uploads.length)
      setProgress(`完成 ${uploads.length} 首`)
      pushNotify('Stella 上传完成', `${selected?.title || ''} ${uploads.length} 首`)
      await api.updateBatchProgress({ running: false, done: uploads.length, total: uploads.length, message: `完成 ${uploads.length} 首` })
      // 全部收尾完成，释放账号（释放后必须刷新前端登录状态）
      await api.logout(false)
    } catch (err) {
      setPreviewError(err.message || '批量上传失败')
      // 出错也要解除顶栏的"运行中"状态，否则胶囊会永远停在最后一批
      await api.updateBatchProgress({ running: false, done: 0, total: 0, message: `上传失败：${err.message || '未知错误'}` }).catch(() => {})
      // 中断时会话留在服务器上，尽力释放
      try { await api.logout(false) } catch { /* 已释放或失败则忽略 */ }
    } finally {
      await refreshStatus().catch(() => {})
      setRunning(false)
    }
  }

  // 队列：跑一个任务（一批 4 首的分批循环），返回供下一任务回查的 previous
  async function runTask(task, qi, previous, uploadedKeys) {
    const charts = chartsForVersion(task.versionId, { type: task.type, levels: [task.level] })
    const uploads = []
    for (const chart of charts) {
      const target = zeroOut ? 0 : randomAchievement(Number(task.minAchievement) || 0, Number(task.maxAchievement) || 0)
      const key = `${chart.musicId}:${chart.level}`
      const stored = uploadedKeys.has(key) ? Infinity : existing.get(key)
      if (zeroOut || overwrite || stored == null || stored < Math.round(target * 10000)) {
        uploads.push({ ...chart, target, dx: zeroOut ? 0 : randomDxForStar(task.stars, chart.total) })
      }
    }
    setDoneCount(0)
    setRunTotal(uploads.length)
    if (!uploads.length) {
      setProgress(`队列 ${qi + 1} · ${task.versionTitle}：全部跳过，无需上传`)
      return previous
    }
    for (let index = 0; index < uploads.length; index += 4) {
      const batch = uploads.slice(index, index + 4)
      const message = `队列 ${qi + 1} · ${task.versionTitle} · 上传 ${index + 1}–${index + batch.length} / ${uploads.length}`
      setProgress(message)
      await api.updateBatchProgress({ running: true, done: index, total: uploads.length, message })
      await api.upsert({
        plays: batch.map((chart, offset) => ({
          music_id: chart.musicId,
          music_level: chart.level,
          achievement: Math.round(chart.target * 10000),
          score_rank: rankOf(chart.target),
          is_clear: chart.target >= 80,
          combo_status: chart.target >= 101 ? 4 : task.combo,
          sync_status: task.sync,
          deluxscore: chart.dx,
          total_combo: chart.total,
          max_combo: zeroOut ? 0 : chart.total,
          max_sync: chart.total,
          total_sync: chart.total,
          track_no: offset + 1,
          judge_counts: zeroOut
            ? zeroJudges(chart.notes, chart.type)
            : judgesForDx(chart.notes, chart.dx, chart.type),
        })),
        confirm: true,
        verify_landing: false,
        overwrite_scores: overwrite || zeroOut,
      })
      if (previous.length) await api.verifyPlays(previous)
      previous = batch.map((chart) => ({
        music_id: chart.musicId,
        music_level: chart.level,
        achievement: Math.round(chart.target * 10000),
      }))
      for (const chart of batch) uploadedKeys.add(`${chart.musicId}:${chart.level}`)
      // 每批都 type1 登出 + 续关；释放由队列收尾统一 type4
      await api.logout(true)
      await new Promise((resolve) => setTimeout(resolve, 3000))
      await api.continueLogin()
      await refreshStatus()
      setDoneCount(index + batch.length)
    }
    // 最后一批的延迟回查在续关后的新会话里进行（Get 需要活动会话）
    if (previous.length) { try { await api.verifyPlays(previous, session?.user_id) } catch { /* 忽略 */ } }
    return previous
  }

  function addToQueue() {
    if (running || queueRunning || !uploadCount) return
    setQueue((q) => [...q, {
      id: `${Date.now()}`,
      versionId,
      versionTitle: selected?.title || '',
      type,
      typeLabel: TYPES.find((item) => item.id === type)?.label || '',
      level,
      levelLabel,
      minAchievement,
      maxAchievement,
      stars,
      combo,
      sync,
      estBatches: Math.ceil(uploadCount / 4),
      status: 'pending',
    }])
  }

  async function startQueue() {
    if (!session?.logged_in || queueRunning || running) return
    const tasks = queue.filter((task) => task.status === 'pending')
    if (!tasks.length) return
    setQueueRunning(true)
    setDoneCount(0)
    setPreviewError('')
    const uploadedKeys = new Set()
    let previous = []
    let completedAll = false
    try {
      for (let qi = 0; qi < tasks.length; qi++) {
        const task = tasks[qi]
        setQueue((q) => q.map((t) => (t.id === task.id ? { ...t, status: 'running' } : t)))
        previous = await runTask(task, qi, previous, uploadedKeys)
        setQueue((q) => q.map((t) => (t.id === task.id ? { ...t, status: 'done' } : t)))
        if (tasks.length > 1) {
          pushNotify(`Stella 任务 ${qi + 1}/${tasks.length} 完成`, `${task.versionTitle} · ${task.typeLabel} · ${task.levelLabel}`)
        }
      }
      completedAll = true
      setProgress(`队列完成：${tasks.length} 个任务`)
      pushNotify('Stella 队列完成', `${tasks.length} 个任务全部上传完毕`)
      await api.updateBatchProgress({ running: false, done: 1, total: 1, message: `队列完成（${tasks.length} 个任务）` })
    } catch (err) {
      setPreviewError(err.message || '队列任务失败，已停止后续任务')
      pushNotify('Stella 队列中断', err.message || '未知错误')
      await api.updateBatchProgress({ running: false, done: 0, total: 0, message: `队列中断：${err.message || '未知错误'}` }).catch(() => {})
    } finally {
      // 收尾统一释放账号（成功/失败都要；此时会话在最后一次续关上）
      try { await api.logout(false) } catch { /* 忽略 */ }
      await refreshStatus().catch(() => {})
      setQueueRunning(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Section
        title="版本预设"
        subtitle="配置一组后加入队列，可排队多个版本依次上传。曲目已经固定在前端里。"
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {TYPES.map((item) => (
              <Choice key={item.id} label={item.label} selected={type === item.id} onClick={() => setType(item.id)} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {CHART_LEVELS.map((item) => (
              <Choice key={item.id} label={item.label} selected={level === item.id} onClick={() => setLevel(item.id)} />
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <NumField label="最低达成率" value={minAchievement} onChange={setMinAchievement} sx={{ maxWidth: 180 }} />
            <NumField label="最高达成率" value={maxAchievement} onChange={setMaxAchievement} sx={{ maxWidth: 180 }} />
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {COMBOS.map((label, index) => (
              <Choice key={label} label={label} selected={combo === index} onClick={() => setCombo(index === 4 && !maxAllowsApp ? combo : index)} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {SYNCS.map((label, index) => (
              <Choice key={label} label={label} selected={sync === index} onClick={() => setSync(index)} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {STARS.map((star) => (
              <Choice key={star} label={`${star} 星`} selected={stars === star} onClick={() => setStars(star)} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Choice label="覆盖模式" selected={overwrite} onClick={() => setOverwrite(!overwrite)} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              忽略已有成绩，全部重传（修复评级/徽章等元数据时用）
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Choice label="归零（伪清除）" selected={zeroOut} onClick={() => { setZeroOut(!zeroOut); if (!zeroOut) setOverwrite(true) }} />
            <Typography sx={{ fontSize: 13, color: zeroOut ? 'error.main' : 'text.secondary' }}>
              {zeroOut
                ? '⚠️ 全部谱面将以 0 分覆盖：记录仍在、游戏里显示 0.0000% D，不可撤销'
                : '把本难度的所有成绩清零（伪删除，记录不会消失）'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Choice
              label={`只清异常成绩${anomalyCount ? `（${anomalyCount}）` : ''}`}
              selected={onlyAnomaly}
              onClick={() => { setOnlyAnomaly(!onlyAnomaly); if (!onlyAnomaly) setZeroOut(true) }}
            />
            <Typography sx={{ fontSize: 13, color: anomalyCount ? 'warning.main' : 'text.secondary' }}>
              {anomalyCount === 0
                ? (session?.logged_in ? '本难度没有检测到异常成绩' : '登录后扫描本难度的异常成绩')
                : `检测到 ${anomalyCount} 首异常：只归零这些，你自己打过的正常成绩不动`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Choice label="完成系统推送" selected={pushOn} onClick={() => setPush(!pushOn)} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              任务完成/中断时弹 Windows 系统通知（切到别的窗口才弹，不打扰）
            </Typography>
          </Stack>
          {anomalyCount > 0 && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography sx={{ fontSize: 13 }}>
                {preview.filter((r) => r.anomaly).slice(0, 5).map((r) => (
                  <span key={`${r.musicId}:${r.level}`}>
                    {`#${r.musicId} ${r.title}：${r.anomaly}　`}
                  </span>
                ))}
                {anomalyCount > 5 && `…另有 ${anomalyCount - 5} 首`}
              </Typography>
            </Alert>
          )}
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {`${selected?.title || ''} · ${TYPES.find((item) => item.id === type)?.label} · ${levelLabel} · 将上传 ${uploadCount} 张 · 跳过 ${preview.length - uploadCount} 张 · 分 ${Math.ceil(uploadCount / 4)} 局`}
          </Typography>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Button variant="contained" disabled={!session?.logged_in || !uploadCount || running || queueRunning} onClick={startUpload}>
              {running ? '上传中…' : `立即上传 ${uploadCount} 首`}
            </Button>
            <Button variant="outlined" disabled={running || queueRunning || !uploadCount} onClick={addToQueue}>
              加入队列
            </Button>
          </Stack>
          {(running || queueRunning || doneCount > 0) && (
            <Box>
              <LinearProgress variant="determinate" value={runTotal ? doneCount / runTotal * 100 : 0} sx={{ height: 8, borderRadius: 999 }} />
              <Typography sx={{ mt: 0.75, fontSize: 13, color: 'text.secondary' }}>
                {`${doneCount} / ${runTotal} 首`}
              </Typography>
            </Box>
          )}
          {progress && <Alert severity="info">{progress}</Alert>}
          {!session?.user_id && <Alert severity="info">登录后才能对照账号已有成绩。当前只显示待选谱面。</Alert>}
          {previewError && <Alert severity="warning">{previewError}</Alert>}
        </Stack>
      </Section>

      {queue.length > 0 && (
        <Section
          title="上传队列"
          subtitle={`${pendingCount} 个待跑 · 共 ${queue.length} 个任务 · 按顺序执行，同一登录会话内自动续关`}
        >
          <Stack spacing={1}>
            {queue.map((task, index) => (
              <Stack key={task.id} direction="row" spacing={1.5} alignItems="center"
                sx={{ p: 1, borderRadius: '12px', border: '1px solid', borderColor: 'outlineVariant' }}>
                <Box component="img" src={versionLogo(task.versionId)} alt="" sx={{ height: 30, maxWidth: 56, objectFit: 'contain' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, noWrap: true }}>
                    {`${index + 1}. ${task.versionTitle} · ${task.typeLabel} · ${task.levelLabel} · ★${task.stars}`}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {`${task.minAchievement}–${task.maxAchievement}% · 约 ${task.estBatches} 局`}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: STATUS_COLOR[task.status] || 'text.secondary', whiteSpace: 'nowrap' }}>
                  {STATUS_LABEL[task.status] || task.status}
                </Typography>
                <Button size="small" color="error" disabled={queueRunning || running}
                  onClick={() => setQueue((q) => q.filter((t) => t.id !== task.id))}>
                  删除
                </Button>
              </Stack>
            ))}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button variant="contained" disabled={!session?.logged_in || queueRunning || running || pendingCount === 0} onClick={startQueue}>
                {queueRunning ? '队列上传中…' : `开始上传队列（${pendingCount} 个任务）`}
              </Button>
              <Button disabled={queueRunning || running} onClick={() => setQueue([])}>
                清空
              </Button>
            </Stack>
          </Stack>
        </Section>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.5 }}>
        {VERSIONS.map((version) => {
          const active = version.id === versionId
          const count = chartsForVersion(version.id, { type, levels: [level] }).length
          return (
            <Box
              key={version.id} component="button" type="button" onClick={() => setVersionId(version.id)}
              sx={{
                p: 1.5, textAlign: 'left', cursor: 'pointer', font: 'inherit',
                borderRadius: '12px', border: '1px solid',
                borderColor: active ? 'primary.main' : 'outlineVariant',
                bgcolor: active ? 'action.selected' : 'background.paper', color: 'text.primary',
              }}
            >
              <Box sx={{ height: 78, display: 'grid', placeItems: 'center', mb: 1 }}>
                <Box component="img" src={versionLogo(version.id)} alt="" sx={{ maxWidth: '100%', maxHeight: 72, objectFit: 'contain' }} />
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 650 }}>{version.title}</Typography>
              <Typography sx={{ mt: 0.25, fontSize: 12, color: 'text.secondary' }}>{`${count} 张${levelLabel}`}</Typography>
            </Box>
          )
        })}
      </Box>
    </Stack>
  )
}
