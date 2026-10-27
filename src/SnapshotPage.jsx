// 账号数据快照查看器 —— 读 data/<userId>.json。
import React from 'react'
import {
  Alert, Box, Chip, Paper, Stack, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useApp } from './store.jsx'
import { api, fmtSize, fmtTime } from './api.js'
import { Section, StatusChip } from './components.jsx'
import { NeedLogin } from './UpsertPage.jsx'

const NODE_NAMES = {
  userData: '用户基础数据',
  userExtend: '扩展数据',
  userOption: '选项设置',
  userCharacterList: '角色列表',
  userMapList: '地图进度',
  userLoginBonusList: '登录奖励',
  userRatingList: 'Rating',
  userItemList: '道具',
  userMusicDetailList: '曲目成绩（按 musicId+level）',
  userCourseList: '段位课程',
  userChargeList: '功能票券',
  userFavoriteList: '收藏',
  userActivityList: '活动',
  userMissionDataList: '任务',
  userIntimateList: '好友亲密',
  userShopItemStockList: '商店库存',
  userFavoritemusicList: '收藏音乐',
  userKaleidxScopeList: 'KaleidxScope 门',
  userGhost: '幽灵对战',
}

export default function SnapshotPage() {
  const { session, act, logColors: lc } = useApp()
  const [saved, setSaved] = React.useState(null)
  const [current, setCurrent] = React.useState(null)
  const [tab, setTab] = React.useState(0)
  const [node, setNode] = React.useState('userData')

  async function refreshSaved() {
    const out = await act(() => api.snapshots(), { refresh: false })
    if (out) setSaved(out.result)
  }

  async function loadCurrent() {
    const out = await act(() => api.snapshot(), { refresh: false })
    if (out) setCurrent(out.result)
  }

  React.useEffect(() => { refreshSaved() }, [])

  // 未登录 = 只读预览：本地存档列表可以看，当前会话快照需要登录
  const readOnly = !session?.logged_in

  const data = tab === 0 ? current : null

  return (
    <Box>
      {!readOnly && (
        <Section
          title="当前会话快照"
          subtitle="登录时抓取的 19 个节点基线数据（上传成绩 / 解锁 / 用票的差分前提）"
          right={
            <Stack direction="row" spacing={1}>
              <StatusChip ok={!!current}>{current ? '已就绪' : '未抓取'}</StatusChip>
              <Chip size="small" variant="outlined" label="刷新" onClick={loadCurrent}
                icon={<RefreshIcon />} />
            </Stack>
          }
        >
          {!current ? (
            <Alert severity="info">
              当前会话没有快照（登录时可能没勾「登录后抓取结算快照」）。
              点右上角「刷新」现在抓一份。
            </Alert>
          ) : (
          <>
            {current.failed?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {current.failed.length} 个节点抓取失败：
                {current.failed.map((f) => f.node).join('、')}
              </Alert>
            )}
            <NodeSummary summary={current.summary} active={node} onPick={setNode} />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {node} · {NODE_NAMES[node] || ''}
              </Typography>
              <NodeView value={current.nodes?.[node]} />
            </Box>
          </>
        )}
      </Section>
      )}

      <NeedLogin
        title="数据快照"
        desc="查看账号在服务器上的完整基线数据 —— 19 个节点（角色、地图、Rating、道具、曲目成绩、票券、KaleidxScope 门…）。登录时抓取的快照会存到 Astral/data/<userId>.json，供上传成绩作差分基线；下方是已存档的数据，未登录也能浏览。"
      />

      <Section
        title="本地存档"
        subtitle="Astral/data/<userId>.json —— GetNeedUserData 抓完会自动落盘（覆盖式）"
      >
        {!saved?.length ? (
          <Alert severity="info">data/ 目录下还没有任何存档。</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>userId</TableCell>
                <TableCell align="right">大小</TableCell>
                <TableCell align="right">修改时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {saved.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{s.user_id}</TableCell>
                  <TableCell align="right">{fmtSize(s.size)}</TableCell>
                  <TableCell align="right">{fmtTime(s.mtime)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      variant="outlined"
                      label="查看"
                      onClick={async () => {
                        const out = await act(() => api.savedSnapshot(s.user_id), { refresh: false })
                        if (out) { setCurrent(out.result); setTab(0) }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </Box>
  )
}

function NodeSummary({ summary, active, onPick }) {
  const entries = Object.entries(summary || {}).sort((a, b) => b[1] - a[1])
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
      {entries.map(([k, v]) => (
        <Chip
          key={k}
          size="small"
          label={`${k} · ${v}`}
          color={k === active ? 'primary' : 'default'}
          variant={k === active ? 'filled' : 'outlined'}
          onClick={() => onPick(k)}
        />
      ))}
    </Stack>
  )
}

function NodeView({ value }) {
  const { logColors: lc } = useApp()
  const [page, setPage] = React.useState(0)
  const per = 50
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(value?.userMusicList) ? value.userMusicList
    : Array.isArray(value?.userItemList) ? value.userItemList
    : null
  if (value == null) return <Alert severity="warning">该节点没有数据。</Alert>
  if (rows) {
    value = rows
    const pages = Math.max(1, Math.ceil(value.length / per))
    const slice = value.slice(page * per, page * per + per)
    return (
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip size="small" variant="outlined" label={`${value.length} 条`} />
          <Tabs value={page} onChange={(_, v) => setPage(v)} sx={{ minHeight: 28 }}>
            {Array.from({ length: Math.min(pages, 12) }, (_, i) => (
              <Tab key={i} sx={{ minHeight: 28, py: 0 }} label={`${i * per + 1}-${Math.min(value.length, (i + 1) * per)}`} />
            ))}
          </Tabs>
        </Stack>
        <Paper variant="outlined" sx={{
          p: 1, maxHeight: 420, overflow: 'auto', bgcolor: lc.panelBg,
          borderColor: lc.panelBorder,
          fontFamily: 'Consolas, monospace', fontSize: 11.5, whiteSpace: 'pre',
        }}>
          {JSON.stringify(slice, null, 2)}
        </Paper>
      </Box>
    )
  }
  return (
    <Paper variant="outlined" sx={{
      p: 1, maxHeight: 420, overflow: 'auto', bgcolor: lc.panelBg,
      borderColor: lc.panelBorder,
      fontFamily: 'Consolas, monospace', fontSize: 11.5, whiteSpace: 'pre',
    }}>
      {JSON.stringify(value, null, 2)}
    </Paper>
  )
}
