// 机台预设页 —— 快速填写 config.py 的 6 个值、保存多个预设、随时切换。
//
// ★ 预设只存在浏览器 localStorage，与后端解耦（后端摘离也能用）。
// ★ 后端负责：读 config.py 当前值 / 把预设写进 config.py 并热加载。
//   后端不支持时降级为「复制 config.py 片段自己粘贴」。
import React from 'react'
import {
  Alert, Box, Button, Chip, Divider, Grid, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useApp } from './store.jsx'
import { api } from './api.js'
import {
  Section, JsonBox, NumField, TextField2, StatusChip, DangerConfirm, BusyChip,
} from './components.jsx'
import {
  useProfiles, useConfigCapability, CONFIG_FIELDS, blankProfile,
  deriveKeychip, toConfigSnippet, exportProfiles, importProfiles,
} from './profiles.js'

export default function ProfilesPage() {
  const { session, busy, act, notify, setPage } = useApp()
  const { profiles, activeId, active, setActive, upsert, remove } = useProfiles()
  const cap = useConfigCapability()

  const [draft, setDraft] = React.useState(() => ({ ...blankProfile() }))
  const [editingId, setEditingId] = React.useState('')
  const [note, setNote] = React.useState('')
  const [name, setName] = React.useState('')
  const [confirmApply, setConfirmApply] = React.useState(null)
  const [confirmDelete, setConfirmDelete] = React.useState(null)
  const [lastResult, setLastResult] = React.useState(null)
  const fileRef = React.useRef(null)

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))

  function resetForm() {
    setDraft({ ...blankProfile() })
    setEditingId('')
    setName('')
    setNote('')
  }

  function startEdit(p) {
    setDraft({ ...blankProfile(), ...p })
    setEditingId(p.id)
    setName(p.name || '')
    setNote(p.note || '')
  }

  async function saveProfile() {
    if (!draft.client_id?.trim()) {
      notify('error', 'CLIENT_ID 不能为空')
      return
    }
    const saved = upsert({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim() || `预设 ${profiles.length + 1}`,
      note: note.trim(),
      ...draft,
    })
    notify('success', editingId ? '预设已更新' : `预设「${saved.name}」已保存`)
    resetForm()
  }

  // 选中一个预设 -> 填入表单（不直接应用，让用户确认）
  function loadToForm(p) {
    setDraft({ ...blankProfile(), ...p })
    setEditingId('')
    setName(p.name || '')
    setNote(p.note || '')
  }

  // 把预设写进 config.py
  async function applyProfile(p) {
    // 写入会热加载 api 并清空会话，后端要求先登录 —— 没登录就先引导
    const out = await act(
      () =>
        api.writeConfig({
          client_id: p.client_id,
          region_id: Number(p.region_id) || 0,
          place_id: Number(p.place_id) || 0,
          place_name: p.place_name || '',
          region_name: p.region_name || '',
          write_file: true,
        }),
      {
        // ★ 机台切换不需要登录（环境配置 ≠ 玩家账号）。写入会热加载并使
        //   现有登录会话失效 —— 如果之前有登录，提示重新扫码。
        successText: session?.logged_in
          ? `已应用「${p.name}」并写入 config.py（登录会话已失效，如需操作账号请重新扫码）`
          : `已应用预设「${p.name}」并写入 config.py`,
      },
    )
    if (out) {
      setLastResult(out)
      setActive(p.id)
    }
  }

  // 从 config.py 反读当前值 -> 存成新预设（最省事的「建档」方式）
  async function captureCurrent() {
    const out = await act(() => api.getConfig(), { refresh: false })
    if (!out) return
    const c = out.result
    const saved = upsert({
      name: `来自 config.py ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`,
      note: `快照自 ${c.config_path}`,
      client_id: c.client_id,
      region_id: c.region_id,
      place_id: c.place_id,
      place_name: c.place_name,
      region_name: c.region_name,
    })
    notify('success', `已从 config.py 建档：「${saved.name}」`)
  }

  async function lookupAuthv1() {
    const kc = draft.client_id?.trim()
    if (!kc) { notify('error', '先填 CLIENT_ID（或完整 Keychip）'); return }
    const out = await act(() => api.authv1(kc), { refresh: false })
    if (!out) return
    const r = out.result || {}
    setDraft((d) => ({
      ...d,
      client_id: r.client_id || d.client_id,
      region_id: r.region_id ?? d.region_id,
      place_id: r.place_id ?? d.place_id,
      place_name: r.place_name || d.place_name,
      region_name: r.region_name || d.region_name,
    }))
    notify('success', '已从 ALL.Net 认证服务器取回机台身份')
  }

  async function onImport(e) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const list = await importProfiles(f)
      if (!list.length) { notify('error', '文件里没有可导入的预设'); return }
      for (const p of list) upsert(p)     // 逐条入库（各自生成新 id）
      notify('success', `已导入 ${list.length} 个预设`)
    } catch (err) {
      notify('error', '导入失败：' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  const derived = deriveKeychip(draft)
  const current = cap.current

  return (
    <Box>
      {/* ---- 当前生效值 ---- */}
      <Section
        title="config.py 当前生效值"
        subtitle={cap.supported ? current?.config_path : '后端未提供 config 读取能力'}
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip ok={cap.supported}>
              {cap.supported ? '可读写' : '只读预设'}
            </StatusChip>
            {cap.supported && (
              <Chip size="small" variant="outlined" label="重新读取" onClick={cap.probe} />
            )}
          </Stack>
        }
      >
        {!cap.checked ? (
          <Typography variant="caption" color="text.secondary">正在探测后端能力…</Typography>
        ) : cap.supported && current ? (
          <>
            <Grid container spacing={2}>
              {CONFIG_FIELDS.map((f) => (
                <Grid item xs={6} sm={4} key={f.key}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {f.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: f.key === 'client_id' ? 'Consolas, monospace' : undefined }}>
                    {String(current[f.key] ?? '') || '（空）'}
                  </Typography>
                </Grid>
              ))}
              <Grid item xs={6} sm={4} lg={3} xl={2}>
                <Typography variant="caption" color="text.secondary" display="block">KEYCHIP_ID（推导）</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Consolas, monospace' }}>
                  {current.keychip_id || '（空）'}
                </Typography>
              </Grid>
            </Grid>
            <Alert severity={current.config_exists ? 'success' : 'warning'} sx={{ mt: 1.5 }}>
              {current.config_exists
                ? 'config.py 已存在。写入前会自动备份为 config.py.bak，并做 ast 语法自检。'
                : 'config.py 还不存在 —— 首次写入会从 config.py.example 复制一份。'}
            </Alert>
          </>
        ) : (
          <Alert severity="info">
            当前后端不提供 config 读写（{cap.reason}）。
            预设功能仍可正常使用，应用时会给出 config.py 片段让你手动粘贴。
          </Alert>
        )}
      </Section>

      {/* ---- 预设列表 ---- */}
      <Section
        title="机台预设"
        subtitle={`共 ${profiles.length} 个 · 保存在浏览器本地，与后端解耦`}
        right={
          <Stack direction="row" spacing={1}>
            {cap.supported && (
              <Chip size="small" variant="outlined" label="从 config.py 建档" onClick={captureCurrent} />
            )}
            <Chip
              size="small" variant="outlined" icon={<FileDownloadIcon />} label="导出"
              onClick={() => exportProfiles(profiles)} disabled={!profiles.length}
            />
            <Chip
              size="small" variant="outlined" icon={<FileUploadIcon />} label="导入"
              onClick={() => fileRef.current?.click()}
            />
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
          </Stack>
        }
      >
        {profiles.length === 0 ? (
          <Alert severity="info">
            还没有预设。在下面填好 6 个值、点「保存为预设」即可；
            也可以点右上角「从 config.py 建档」把当前配置直接存下来。
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>CLIENT_ID</TableCell>
                <TableCell>区域 / 店铺</TableCell>
                <TableCell>店铺名</TableCell>
                <TableCell>KEYCHIP</TableCell>
                <TableCell>备注</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((p) => {
                const isActive = p.id === activeId
                return (
                  <TableRow key={p.id} hover selected={isActive}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: isActive ? 700 : 500 }}>
                          {p.name}
                        </Typography>
                        {isActive && <Chip size="small" color="success" variant="outlined" label="生效" />}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Consolas, monospace', fontSize: 11.5 }}>
                      {p.client_id || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {p.region_id} / {p.place_id}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{p.place_name || '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}>
                      {deriveKeychip(p) || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, opacity: 0.7, maxWidth: 140 }}>
                      <Tooltip title={p.note || ''}>
                        <span>{p.note ? (p.note.length > 18 ? p.note.slice(0, 18) + '…' : p.note) : '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="应用并写入 config.py">
                        <IconButton size="small" color="primary" onClick={() => setConfirmApply(p)} disabled={busy}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="载入到表单编辑">
                        <IconButton size="small" onClick={() => loadToForm(p)}>
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* ---- 编辑表单 ---- */}
      <Section
        title={editingId ? '编辑预设' : '新建预设'}
        subtitle="config.py 第二节「机台与店铺标识」的 5 个直接值；KEYCHIP_ID 由前两个推导"
        right={
          <Stack direction="row" spacing={1}>
            {editingId && <Chip size="small" variant="outlined" label="取消编辑" onClick={resetForm} />}
            <Button variant="contained" startIcon={<AddIcon />} onClick={saveProfile} disabled={busy}>
              {editingId ? '更新预设' : '保存为预设'}
            </Button>
          </Stack>
        }
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField2
              label="预设名称"
              value={name}
              onChange={setName}
              placeholder="例如：家中机台 / 店铺 A"
              hint="只是给你看的标签，不影响任何配置"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField2
              label="备注（可选）"
              value={note}
              onChange={setNote}
              placeholder="例如：Keychip 在 2026-10 换过"
            />
          </Grid>
          {CONFIG_FIELDS.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.key}>
              {f.key === 'client_id' || f.key === 'place_name' || f.key === 'region_name' ? (
                <TextField2 label={f.label} value={draft[f.key]} onChange={set(f.key)} hint={f.hint} />
              ) : (
                <NumField label={f.label} value={draft[f.key]} onChange={set(f.key)} hint={f.hint} />
              )}
            </Grid>
          ))}
          <Grid item xs={12} sm={6} lg={4} xl={3}>
            <Typography variant="caption" color="text.secondary" display="block">KEYCHIP_ID（推导）</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Consolas, monospace' }}>
              {derived || '（填 CLIENT_ID 后自动推导）'}
            </Typography>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TravelExploreIcon />}
            onClick={lookupAuthv1}
            disabled={busy || !draft.client_id?.trim() || !cap.supported}
          >
            从 ALL.Net 反查
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              navigator.clipboard?.writeText(toConfigSnippet(draft))
              notify('success', 'config.py 片段已复制到剪贴板')
            }}
          >
            复制 config.py 片段
          </Button>
          {!cap.supported && (
            <Typography variant="caption" color="text.secondary">
              后端不支持写盘时，用这个片段手动粘贴到 config.py
            </Typography>
          )}
        </Stack>
      </Section>

      {lastResult && (
        <Section title="上次应用结果">
          <JsonBox data={lastResult.result} />
        </Section>
      )}

      {/* ---- 确认对话框 ---- */}
      <DangerConfirm
        open={!!confirmApply}
        title="应用预设并写入 config.py？"
        body={confirmApply ? {
          main: `将把预设「${confirmApply.name}」写入 Astral/config.py：`,
          rows: [
            ['CLIENT_ID', confirmApply.client_id],
            ['REGION_ID', confirmApply.region_id],
            ['PLACE_ID', confirmApply.place_id],
            ['PLACE_NAME', confirmApply.place_name || '（空）'],
            ['REGION_NAME', confirmApply.region_name || '（空）'],
            ['KEYCHIP_ID', deriveKeychip(confirmApply) + '（推导）'],
          ],
          detail: '写入前自动备份 config.py.bak 并做 ast 语法自检；写入后 api 模块热加载立即生效。若当前已登录账号，会话会因环境变更而失效，需重新扫码。',
        } : ''}
        confirmWord="确认写入"
        busy={busy}
        onCancel={() => setConfirmApply(null)}
        onOk={async () => {
          const p = confirmApply
          setConfirmApply(null)
          await applyProfile(p)
        }}
      />

      <DangerConfirm
        open={!!confirmDelete}
        title="删除预设？"
        body={confirmDelete ? {
          main: `将删除预设「${confirmDelete.name}」。`,
          rows: [
            ['CLIENT_ID', confirmDelete.client_id],
            ['店铺', confirmDelete.place_name || '—'],
          ],
          detail: '这只影响浏览器本地存档，不会改动 config.py。',
        } : ''}
        busy={busy}
        onCancel={() => setConfirmDelete(null)}
        onOk={() => {
          const p = confirmDelete
          setConfirmDelete(null)
          remove(p.id)
          notify('success', `已删除「${p.name}」`)
        }}
      />
    </Box>
  )
}

