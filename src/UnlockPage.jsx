// 解锁歌曲页 —— 对应 unlockmusic.py。
// 它没有自己的协议实现，直接复用 UpsertUserAll 的整套流程，
// 只是多一个「要解锁哪些歌」的入参。
import React from 'react'
import {
  Alert, Box, Button, Chip, Grid, Stack, TextField, Typography,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import { useApp } from './store.jsx'
import { api } from './api.js'
import { Section, JsonBox, NumField, TextField2, Toggle, DangerConfirm, StatusChip } from './components.jsx'
import { NeedLogin } from './UpsertPage.jsx'

const ITEM_KINDS = [
  { kind: 5, name: '歌曲本体 MusicUnlockList' },
  { kind: 6, name: 'Master 难度 MusicUnlockMasterList' },
  { kind: 7, name: 'Re:Master 难度 MusicUnlockReMasterList' },
]

export default function UnlockPage() {
  const { session, busy, act, notify } = useApp()
  const [musicIds, setMusicIds] = React.useState('')
  const [master, setMaster] = React.useState(true)
  const [remaster, setRemaster] = React.useState(true)
  const [musicId, setMusicId] = React.useState(143)
  const [level, setLevel] = React.useState(4)
  const [confirm, setConfirm] = React.useState(false)
  const [result, setResult] = React.useState(null)

  const parsed = React.useMemo(
    () =>
      musicIds
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0),
    [musicIds],
  )

  async function run(send) {
    if (!parsed.length) {
      notify('error', '请先填写要解锁的 musicId')
      return
    }
    const out = await act(
      () =>
        api.unlock({
          music_ids: parsed,
          unlock_master: master,
          unlock_remaster: remaster,
          play: { music_id: Number(musicId), music_level: Number(level) },
          confirm: send,
        }),
      { successText: send ? '已真实解锁' : '预检完成：未发包' },
    )
    if (out) setResult(out)
  }

  // 未登录 = 只读预览
  const readOnly = !session?.logged_in

  return (
    <Box>
      <NeedLogin
        title="歌曲解锁"
        desc="解锁（解禁）歌曲本体、Master 或 Re:Master 难度 —— 本质是往 userItemList 补几条 UserItem，复用上传成绩的整套流程。填 musicId 列表即可，已解锁的条目会自动跳过。"
      />
      <Section
        title="解锁（解禁）歌曲 / 难度"
        subtitle="不是单独的接口 —— 往 userItemList 里补几条 UserItem，复用 upsert.py 的整套流程"
        right={readOnly ? <StatusChip ok={false}>只读预览</StatusChip> : <StatusChip ok>user {session.user_id}</StatusChip>}
      >
        <Alert severity="info" sx={{ mb: 2 }}>
          解锁项形如 <code>{'{"itemKind":5,"itemId":1085,"stock":1,"isValid":true}'}</code>。
          服务器上已存在的条目会自动跳过 —— 重复插入会让服务端直接 HTTP 500。
        </Alert>

        <TextField2
          label="要解锁的 musicId（逗号 / 空格分隔）"
          value={musicIds}
          onChange={setMusicIds}
          placeholder="例如 11414, 1085"
          hint="musicId >= 10000 是 DX 谱，需要额外解禁 Master/Re:Master。"
        />
        {parsed.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {parsed.map((id) => (
              <Chip key={id} size="small" label={`#${id}${id >= 10000 ? ' DX谱' : ''}`} variant="outlined" />
            ))}
            <Chip size="small" color="primary" label={`共 ${parsed.length} 首`} />
          </Stack>
        )}

        <Grid container spacing={1.5} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} lg={4} xl={3}>
            <NumField label="musicId（playlog 用）" value={musicId} onChange={setMusicId}
              hint="本局 playlog 记哪首歌。与要解锁的歌可以不同。" />
          </Grid>
          <Grid item xs={12} sm={6} lg={4} xl={3}>
            <NumField label="level（playlog 用）" value={level} onChange={setLevel}
              hint="0=Basic 1=Advanced 2=Expert 3=Master 4=Re:Master" />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
          <Toggle label="解禁 Master" checked={master} onChange={setMaster}
            hint="写 itemKind=6。标准谱（<10000）天生解锁，只对 DX 谱有意义。" />
          <Toggle label="解禁 Re:Master" checked={remaster} onChange={setRemaster}
            hint="写 itemKind=7。还受活动开关约束 —— 写了也可能进游戏仍是灰的。" />
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>写入的 itemKind</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>itemKind</TableCell>
                <TableCell>解锁什么</TableCell>
                <TableCell>本次</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ITEM_KINDS.map((it) => {
                const on =
                  it.kind === 5 ? true : it.kind === 6 ? master && parsed.some((i) => i >= 10000) : remaster && parsed.some((i) => i >= 10000)
                return (
                  <TableRow key={it.kind}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{it.kind}</TableCell>
                    <TableCell>{it.name}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" color={on ? 'success' : 'default'}
                        label={on ? '写入' : '跳过'} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: 2.5 }}>
          <Button variant="outlined" startIcon={<LockOpenIcon />} disabled={busy || readOnly}
            onClick={() => run(false)}>
            预检（不发包）
          </Button>
          <Button variant="contained" color="error" startIcon={<LockOpenIcon />} disabled={busy || readOnly}
            onClick={() => setConfirm(true)}>
            真实解锁
          </Button>
        </Stack>

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
        title="确认真实解锁？"
        body={{
          main: '即将往 userItemList 写入解锁项：',
          rows: [
            ['user_id', session?.user_id ?? '—'],
            ['musicIds', parsed.join(', ') || '（空）'],
            ['Master', master ? '解禁' : '跳过'],
            ['Re:Master', remaster ? '解禁' : '跳过'],
          ],
          detail: '已存在的解锁项会自动跳过；对已存在条目重复插入会导致服务端 HTTP 500。',
        }}
        confirmWord="确认解锁"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onOk={async () => { setConfirm(false); await run(true) }}
      />
    </Box>
  )
}

