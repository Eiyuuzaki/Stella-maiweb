// 版本预设。每个版本一张带 logo 的卡片，一次只选中一个版本、一种谱面和一个难度。
import React from 'react'
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material'
import { NumField, Section } from './components.jsx'
import { api } from './api.js'
import { useApp } from './store.jsx'
import { CHART_LEVELS, VERSIONS, chartsForVersion, versionLogo } from './versionCharts.js'
import { judgesForDx, randomDxForStar } from './dxStars.js'

const TYPES = [
  { id: 'standard', label: '标准谱' },
  { id: 'dx', label: 'DX 谱' },
]
const COMBOS = ['无', 'FC', 'FC+', 'AP', 'AP+']
const SYNCS = ['单人', 'FS', 'FS+', 'FDX', 'FDX+', 'SYNC']
const STARS = [0, 1, 2, 3, 4, 5]

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

export default function VersionPresetPage() {
  const { session, refreshStatus } = useApp()
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
  const selected = VERSIONS.find((v) => v.id === versionId) || VERSIONS[0]
  const charts = chartsForVersion(versionId, { type, levels: [level] })
  const levelLabel = CHART_LEVELS.find((item) => item.id === level)?.label || ''
  const maxAllowsApp = Number(maxAchievement) >= 101

  React.useEffect(() => {
    if (!session?.user_id) return undefined
    let stop = false
    api.snapshot().then((out) => { if (!stop) setSnapshot(out.result?.nodes || null) })
      .catch((err) => { if (!stop) setPreviewError(err.message || '没有读到账号快照') })
    return () => { stop = true }
  }, [session?.user_id])

  const existing = React.useMemo(() => {
    const map = new Map()
    for (const row of musicRows(snapshot)) map.set(`${row.musicId}:${row.level}`, Number(row.achievement) || 0)
    return map
  }, [snapshot])
  const preview = React.useMemo(() => charts.map((chart) => {
    const target = randomAchievement(Number(minAchievement) || 0, Number(maxAchievement) || 0)
    const stored = existing.get(`${chart.musicId}:${chart.level}`)
    const action = stored == null || stored < Math.round(target * 10000) ? '上传' : '跳过'
    return { ...chart, target, action, stored, dx: randomDxForStar(stars, chart.total) }
    // 随机值只在筛选或分数范围变化时重新生成，普通重绘不能改变它。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [versionId, type, level, minAchievement, maxAchievement, stars, existing])
  const uploadCount = preview.filter((row) => row.action === '上传').length
  const uploads = preview.filter((row) => row.action === '上传')

  async function startUpload() {
    if (!session?.logged_in || !uploads.length || running) return
    setRunning(true)
    setDoneCount(0)
    let previous = []
    try {
      for (let index = 0; index < uploads.length; index += 4) {
        const batch = uploads.slice(index, index + 4)
        const last = index + 4 >= uploads.length
        const message = `正在上传 ${index + 1}–${index + batch.length} / ${uploads.length}`
        setProgress(message)
        await api.updateBatchProgress({ running: true, done: index, total: uploads.length, message })
        await api.upsert({
          plays: batch.map((chart, offset) => ({
            music_id: chart.musicId,
            music_level: chart.level,
            achievement: Math.round(chart.target * 10000),
            combo_status: chart.target >= 101 ? 4 : combo,
            sync_status: sync,
            deluxscore: chart.dx,
            total_combo: chart.total,
            max_combo: chart.total,
            max_sync: chart.total,
            total_sync: chart.total,
            track_no: offset + 1,
            judge_counts: judgesForDx(chart.notes, chart.dx, chart.type),
          })),
          confirm: true,
          verify_landing: false,
        })
        if (previous.length) await api.verifyPlays(previous)
        previous = batch.map((chart, offset) => ({
          music_id: chart.musicId,
          music_level: chart.level,
          achievement: Math.round(chart.target * 10000),
        }))
        await api.logout(!last)
        if (!last) {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await api.continueLogin()
        }
        await refreshStatus()
        setDoneCount(index + batch.length)
      }
      if (previous.length) await api.verifyPlays(previous)
      setDoneCount(uploads.length)
      setProgress(`完成 ${uploads.length} 首`)
      await api.updateBatchProgress({ running: false, done: uploads.length, total: uploads.length, message: `完成 ${uploads.length} 首` })
    } catch (err) {
      setPreviewError(err.message || '批量上传失败')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Section
        title="版本预设"
        subtitle="一次只选一个版本、一个难度。曲目已经固定在前端里。"
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
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {`${selected?.title || ''} · ${TYPES.find((item) => item.id === type)?.label} · ${levelLabel} · 将上传 ${uploadCount} 张 · 跳过 ${preview.length - uploadCount} 张 · 分 ${Math.ceil(uploadCount / 4)} 局`}
          </Typography>
          <Button variant="contained" disabled={!session?.logged_in || !uploadCount || running} onClick={startUpload}>
            {running ? '上传中…' : `开始上传 ${uploadCount} 首`}
          </Button>
          {(running || doneCount > 0) && (
            <Box>
              <LinearProgress variant="determinate" value={uploadCount ? doneCount / uploadCount * 100 : 0} sx={{ height: 8, borderRadius: 999 }} />
              <Typography sx={{ mt: 0.75, fontSize: 13, color: 'text.secondary' }}>
                {`${doneCount} / ${uploadCount} 首`}
              </Typography>
            </Box>
          )}
          {progress && <Alert severity="info">{progress}</Alert>}
          {!session?.user_id && <Alert severity="info">登录后才能对照账号已有成绩。当前只显示待选谱面。</Alert>}
          {previewError && <Alert severity="warning">{previewError}</Alert>}
        </Stack>
      </Section>

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
