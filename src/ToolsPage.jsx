// 账号转生 + 更新包下载页 —— 对应 reincarnate.py / netdelivery.py。
import React from 'react'
import {
  Alert, Box, Button, Chip, Grid, Stack, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, Checkbox,
} from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DownloadIcon from '@mui/icons-material/Download'
import SearchIcon from '@mui/icons-material/Search'
import { useApp } from './store.jsx'
import { api, fmtSize } from './api.js'
import { Section, JsonBox, NumField, TextField2, Toggle, DangerConfirm, StatusChip } from './components.jsx'

export default function ToolsPage() {
  const { session, busy, act, notify } = useApp()
  return (
    <Box>
      <ReincarnateSection session={session} busy={busy} act={act} notify={notify} />
      <DeliverySection busy={busy} act={act} notify={notify} />
    </Box>
  )
}

// =============================================================================
// 转生
// =============================================================================

function ReincarnateSection({ session, busy, act, notify }) {
  const [srcJson, setSrcJson] = React.useState('')
  const [srcQr, setSrcQr] = React.useState('')
  const [dstQr, setDstQr] = React.useState('')
  const [limit, setLimit] = React.useState(0)
  const [perPacket, setPerPacket] = React.useState(4)
  const [wait, setWait] = React.useState(5)
  const [cloneIdentity, setCloneIdentity] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [saved, setSaved] = React.useState(null)

  React.useEffect(() => {
    api.snapshots().then((r) => setSaved(r.result)).catch(() => {})
  }, [])

  async function run(send) {
    if (!dstQr.trim()) { notify('error', '请填写目标账号二维码'); return }
    if (!srcJson.trim() && !srcQr.trim()) {
      notify('error', 'src_json 和 src_qr 至少要给一个'); return
    }
    const out = await act(
      () =>
        api.reincarnate({
          src_json: srcJson.trim() || null,
          src_qr: srcQr.trim() || null,
          dst_qr: dstQr.trim(),
          plan: !send,
          confirm: send,
          limit: Number(limit) || 0,
          per_packet: Number(perPacket) || 4,
          wait: Number(wait) || 0,
          clone_identity: cloneIdentity,
        }),
      { refresh: false, successText: send ? '转生完成' : '计划已生成（未发包）' },
    )
    if (out) setResult(out)
  }

  return (
    <Section
      title="账号转生"
      subtitle="把源账号 A 的数据克隆到目标账号 B —— 分批上传，每包最多 4 首，自动避开被禁止的 2 首包"
      right={<StatusChip ok={false}>未实跑验证</StatusChip>}
    >
      <Alert severity="error" sx={{ mb: 2 }}>
        ⚠ 此功能在 Astral 原工程中标记为「已实现但未实跑」。<strong>默认只跑 plan（列分批计划，不发包）</strong>。
        真实迁移前建议先用 <code>--limit 8</code> 小批量试。它会切换登录会话，执行前请确保没有其他登录。
      </Alert>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}>
          <TextField2
            label="源数据 JSON 路径（离线，推荐）"
            value={srcJson}
            onChange={setSrcJson}
            placeholder="data/12345678.json"
            hint="从 data/ 下已存档的快照读。留空则用下面的源账号二维码联网抓。"
          />
          {saved?.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              {saved.map((s) => (
                <Chip key={s.user_id} size="small" variant="outlined"
                  label={`${s.user_id}.json`}
                  onClick={() => setSrcJson(`data/${s.user_id}.json`)} />
              ))}
            </Stack>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField2
            label="源账号二维码（联网抓）"
            value={srcQr}
            onChange={setSrcQr}
            placeholder="SGWCMAID..."
            hint="会给源账号登录、抓数据、登出。与上面的 JSON 二选一。"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField2
            label="目标账号二维码（必填）"
            value={dstQr}
            onChange={setDstQr}
            placeholder="SGWCMAID..."
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5} sx={{ mt: 1 }}>
        <Grid item xs={6} sm={4} lg={3} xl={2}>
          <NumField label="每包曲目数" value={perPacket} onChange={setPerPacket}
            hint="只能是 1 / 3 / 4 —— 实测恰好 2 首会被服务端拒绝。" />
        </Grid>
        <Grid item xs={6} sm={4} lg={3} xl={2}>
          <NumField label="只迁前 N 首" value={limit} onChange={setLimit}
            hint="0 = 全部。试跑建议 8。" />
        </Grid>
        <Grid item xs={6} sm={4} lg={3} xl={2}>
          <NumField label="每次上传前等待(秒)" value={wait} onChange={setWait} hint="贴近真机节奏" />
        </Grid>
        <Grid item xs={6} sm={4} lg={3} xl={2}>
          <Box sx={{ pt: 1 }}>
            <Toggle label="连身份一起克隆" checked={cloneIdentity} onChange={setCloneIdentity}
              hint="默认保留目标账号自己的 userName / accessCode。" />
          </Box>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button variant="outlined" startIcon={<SwapHorizIcon />} disabled={busy}
          onClick={() => run(false)}>
          生成分批计划（不发包）
        </Button>
        <Button variant="contained" color="error" startIcon={<SwapHorizIcon />} disabled={busy}
          onClick={() => setConfirm(true)}>
          真实迁移
        </Button>
      </Stack>

      {result && (
        <Box sx={{ mt: 2 }}>
          <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 1 }}>
            exit_code = {result.result?.exit_code}（{result.result?.meaning}）
            {result.result?.plan_only ? ' · 仅计划，未发包' : ' · 已发包'}
          </Alert>
          <JsonBox data={result.result} />
        </Box>
      )}

      <DangerConfirm
        open={confirm}
        title="确认真实账号转生？"
        body={{
          main: '即将把源账号数据迁移到目标账号：',
          rows: [
            ['目标二维码', dstQr.slice(0, 24) + '…'],
            ['每包曲目数', perPacket],
            ['迁移数量', limit || '全部'],
            ['身份克隆', cloneIdentity ? '是' : '否'],
          ],
          detail: '⚠ 该功能在原工程中标记为「已实现（未实跑）」。真实迁移前建议先用 limit=8 小批量试。',
        }}
        confirmWord="确认转生"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onOk={async () => { setConfirm(false); await run(true) }}
      />
    </Section>
  )
}

// =============================================================================
// 更新包
// =============================================================================

function DeliverySection({ busy, act, notify }) {
  const [keychip, setKeychip] = React.useState('')
  const [ver, setVer] = React.useState('')
  const [items, setItems] = React.useState(null)
  const [meta, setMeta] = React.useState(null)
  const [picked, setPicked] = React.useState(() => new Set())
  const [outDir, setOutDir] = React.useState('')
  const [result, setResult] = React.useState(null)

  async function list() {
    const out = await act(
      () => api.deliveryList({ keychip: keychip.trim() || null, ver: ver.trim() || null }),
      { refresh: false, successText: '清单已获取' },
    )
    if (out) {
      setItems(out.result.items)
      setMeta(out.result.meta)
      setPicked(new Set())
    }
  }

  async function download() {
    if (!picked.size) { notify('error', '请先勾选要下载的包'); return }
    const out = await act(
      () =>
        api.deliveryDownload({
          indexes: [...picked],
          out: outDir.trim() || null,
          keychip: keychip.trim() || null,
          ver: ver.trim() || null,
        }),
      { refresh: false, successText: '下载完成' },
    )
    if (out) setResult(out)
  }

  return (
    <Section
      title="更新包下载"
      subtitle="netdelivery.py —— 查 / 下 .app / .opt 更新包（只读，不写任何账号数据）"
    >
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
        <TextField2 label="Keychip（留空用 config）" value={keychip} onChange={setKeychip}
          hint="CLIENT_ID 或完整 Keychip 都认" sx={{ width: 260 }} />
        <TextField2 label="上报版本（留空用 config）" value={ver} onChange={setVer}
          hint="默认 MAI_ENCODING = 1.55。1.56 ROM 实测仍发 1.55。" sx={{ width: 220 }} />
        <Button variant="contained" startIcon={<SearchIcon />} onClick={list} disabled={busy}>
          查清单
        </Button>
      </Stack>

      {meta?.dli_raw && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
          DLI: {meta.dli_raw}
        </Typography>
      )}

      {items && (
        <>
          <Table size="small" sx={{ mt: 1.5 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={items.length > 0 && picked.size === items.length}
                    indeterminate={picked.size > 0 && picked.size < items.length}
                    onChange={(e) =>
                      setPicked(e.target.checked ? new Set(items.map((i) => i.idx)) : new Set())
                    }
                  />
                </TableCell>
                <TableCell>#</TableCell>
                <TableCell>类型</TableCell>
                <TableCell align="right">大小</TableCell>
                <TableCell>文件名</TableCell>
                <TableCell>来源</TableCell>
                <TableCell>备注</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7}>（指示書里没有任何 INSTALL 项）</TableCell></TableRow>
              )}
              {items.map((it) => (
                <TableRow key={it.idx} hover selected={picked.has(it.idx)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={picked.has(it.idx)}
                      onChange={(e) => {
                        const next = new Set(picked)
                        if (e.target.checked) next.add(it.idx); else next.delete(it.idx)
                        setPicked(next)
                      }}
                    />
                  </TableCell>
                  <TableCell>{it.idx}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined"
                      color={it.kind === 'app' ? 'primary' : 'secondary'}
                      label={it.kind} />
                  </TableCell>
                  <TableCell align="right">{it.size != null ? fmtSize(it.size) : '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{it.name}</TableCell>
                  <TableCell sx={{ opacity: 0.7, fontSize: 11 }}>{it.section}/{it.key}</TableCell>
                  <TableCell sx={{ opacity: 0.7, fontSize: 11 }}>{it.note || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <TextField2 label="输出目录（留空 = Astral/download）" value={outDir} onChange={setOutDir}
              sx={{ width: 320 }} />
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={busy}>
              下载选中（{picked.size}）
            </Button>
          </Stack>
        </>
      )}

      {result && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">输出目录：{result.result?.out_dir}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell><TableCell>文件名</TableCell><TableCell align="right">大小</TableCell><TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(result.result?.files || []).map((f) => (
                <TableRow key={f.idx}>
                  <TableCell>{f.idx}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{f.name}</TableCell>
                  <TableCell align="right">{f.size != null ? fmtSize(f.size) : '—'}</TableCell>
                  <TableCell>
                    {f.ok ? <Chip size="small" color="success" variant="outlined" label="完成" />
                      : <Chip size="small" color="error" variant="outlined" label={f.error || '失败'} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Section>
  )
}

