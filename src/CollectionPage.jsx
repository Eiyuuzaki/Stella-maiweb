// 收藏品。和解锁歌曲使用同一个 userItemList，但类别不同。
import React from 'react'
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material'
import { DangerConfirm, JsonBox, NumField, Section, StatusChip } from './components.jsx'
import { api } from './api.js'
import { useApp } from './store.jsx'

const KINDS = [
  [1, '姓名框'],
  [2, '称号'],
  [3, '头像'],
  [10, '搭档'],
  [11, '背景板'],
  [12, '功能票道具'],
]

function ownedItems(snapshot) {
  const raw = snapshot?.userItemList
  const rows = raw?.userItemList || raw || []
  return (Array.isArray(rows) ? rows : []).filter((item) => (
    KINDS.some(([kind]) => kind === Number(item.itemKind)) && Number(item.stock) > 0
  ))
}

function allItems(snapshot) {
  const raw = snapshot?.userItemList
  const rows = raw?.userItemList || raw || []
  return Array.isArray(rows) ? rows.filter((item) => KINDS.some(([kind]) => kind === Number(item.itemKind))) : []
}

export default function CollectionPage() {
  const { session, act, busy, notify } = useApp()
  const [kind, setKind] = React.useState(3)
  const [itemId, setItemId] = React.useState('')
  const [items, setItems] = React.useState([])
  const [allRows, setAllRows] = React.useState([])
  const [result, setResult] = React.useState(null)
  const [confirm, setConfirm] = React.useState(null)
  const loggedIn = !!session?.logged_in

  async function reload() {
    if (!loggedIn) return
    const out = await act(() => api.snapshot(), { refresh: false })
    if (out?.result?.nodes) {
      setItems(ownedItems(out.result.nodes))
      setAllRows(allItems(out.result.nodes))
    }
  }

  React.useEffect(() => { reload() }, [loggedIn])

  async function submit(send, action = 'grant') {
    const id = Number(itemId)
    if (!id) return notify('error', '先填写收藏品编号')
    // isNew 判断要用全量列表（含 stock=0 的伪删除行）——
    // 只看已拥有的会导致伪删除后再发放时误发新增，服务端对重复主键会 500
    const exists = allRows.some((item) => Number(item.itemKind) === kind && Number(item.itemId) === id)
    const stock = action === 'remove' ? 0 : 1
    const zeroJudge = { CriticalPerfect: 0, Perfect: 0, Great: 0, Good: 0, Miss: 0 }
    const out = await act(() => api.upsert({
      // 占位 play 必须全零：组包会为它生成一条曲目明细，
      // 不显式清零的话 achievement/DX 会走 config 默认值（101%），凭空多出一条假成绩
      play: {
        music_id: 1, music_level: 0,
        achievement: 0, deluxscore: 0,
        combo_status: 0, sync_status: 0,
        max_combo: 0, total_combo: 0, max_sync: 0, total_sync: 0,
        judge_counts: { tap: zeroJudge, hold: zeroJudge, slide: zeroJudge, touch: zeroJudge, break: zeroJudge },
      },
      extra_data: {
        userItemList: [{ itemKind: kind, itemId: id, stock, isValid: true }],
        isNewItemList: exists ? '0' : '1',
      },
      confirm: send,
      verify_landing: false,
    }), { successText: send ? '收藏品请求已发送' : '预检完成' })
    if (out) setResult(out)
    if (send) await reload()
  }

  const filtered = items.filter((item) => Number(item.itemKind) === kind)

  return (
    <Stack spacing={2}>
      {!loggedIn && <Alert severity="info">登录后才能读取和修改收藏品。</Alert>}
      <Section title="已有收藏品" subtitle={`${filtered.length} 条，不展开全部编号`} right={<StatusChip ok={loggedIn}>{loggedIn ? '已登录' : '未登录'}</StatusChip>}>
        <TextField select size="small" label="类别" value={kind} onChange={(event) => setKind(Number(event.target.value))} sx={{ minWidth: 180 }}>
          {KINDS.map(([value, label]) => <MenuItem key={value} value={value}>{`${label} (${value})`}</MenuItem>)}
        </TextField>
        <Alert severity="info" sx={{ mt: 2 }}>
          {itemId
            ? (filtered.some((item) => String(item.itemId) === String(itemId)) ? `编号 ${itemId} 已拥有` : `编号 ${itemId} 未找到`)
            : '输入编号后再查询，避免一次显示几千条。'}
        </Alert>
      </Section>
      <Section title="发放或伪删除" subtitle="已有编号写更新，没有的编号写新增。">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <NumField label="收藏品编号" value={itemId} onChange={setItemId} sx={{ maxWidth: 220 }} />
          <Button variant="outlined" disabled={!loggedIn || busy} onClick={() => submit(false)}>预检</Button>
          <Button variant="contained" disabled={!loggedIn || busy} onClick={() => setConfirm('grant')}>发放</Button>
          <Button color="warning" disabled={!loggedIn || busy} onClick={() => setConfirm('remove')}>stock 改为 0</Button>
        </Stack>
        {result && <JsonBox data={result.result} maxHeight={320} />}
      </Section>
      <DangerConfirm
        open={!!confirm}
        title={confirm === 'remove' ? '确认把 stock 改为 0？' : '确认发放收藏品？'}
        body={{ main: '此操作会发送真实结算包。', rows: [['类别', kind], ['编号', itemId || '—'], ['stock', confirm === 'remove' ? 0 : 1]] }}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { const action = confirm; setConfirm(null); submit(true, action) }}
      />
    </Stack>
  )
}
