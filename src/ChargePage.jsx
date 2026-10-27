// 功能票页 —— 对应 buy_ticket.py / use_ticket.py。
// 重点是把 ChargeGuard 的安全闸门状态显式展示出来。
import React from 'react'
import {
  Alert, Box, Button, Chip, Grid, Stack, Typography,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useApp } from './store.jsx'
import { api } from './api.js'
import { Section, JsonBox, NumField, Toggle, DangerConfirm, StatusChip } from './components.jsx'
import { NeedLogin } from './UpsertPage.jsx'

const TICKETS = [
  { id: 2, name: '2倍チケット', credit: 1 },
  { id: 3, name: '3倍チケット', credit: 2 },
  { id: 4, name: '4倍チケット', credit: 3 },
  { id: 5, name: '5倍チケット', credit: 4 },
  { id: 6, name: '6倍チケット', credit: 5 },
]

export default function ChargePage() {
  const { session, busy, act, notify } = useApp()
  const [charges, setCharges] = React.useState(null)
  const [guard, setGuard] = React.useState(null)
  const [chargeId, setChargeId] = React.useState(5)
  const [ticketId, setTicketId] = React.useState('')
  const [confirmBuy, setConfirmBuy] = React.useState(false)
  const [confirmUse, setConfirmUse] = React.useState(false)
  const [result, setResult] = React.useState(null)

  const held = charges?.held || []

  async function refresh() {
    const out = await act(() => api.chargeList(), { refresh: false })
    if (out) {
      setCharges(out.result)
      setGuard(out.result.guard)
    }
  }

  React.useEffect(() => {
    if (session?.logged_in) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.logged_in])

  async function buy(send) {
    const out = await act(
      () => api.chargeBuy({ charge_id: Number(chargeId), confirm: send }),
      { successText: send ? '已购买' : '预检完成：未发包' },
    )
    if (out) { setResult(out); await refresh() }
  }

  async function use_(send) {
    const out = await act(
      () => api.chargeUse({ ticket_id: ticketId === '' ? null : Number(ticketId), confirm: send }),
      { successText: send ? '已消耗' : '预检完成：未发包' },
    )
    if (out) { setResult(out); await refresh() }
  }

  // 未登录 = 只读预览
  const readOnly = !session?.logged_in

  return (
    <Box>
      <NeedLogin
        title="功能票管理"
        desc="购买 / 消耗 2x·3x·5x 等功能票。买票走 UpsertUserChargelogApi（带 ChargeGuard 闸门：已持票时拒绝购买，防止封号）；用票是把 userChargeList 里目标票 stock - 1，服务端即认为这张票被这一局用掉。"
      />
      {/* ---- 当前票券 + 闸门状态 ---- */}
      <Section
        title="当前票券"
        subtitle="GetUserChargeApi —— 票源只看账号自己的票券表，不看机台本地上架清单"
        right={
          <Stack direction="row" spacing={1}>
            <StatusChip ok={!held.length}>{held.length ? `持有 ${held.length} 张` : '未持票'}</StatusChip>
            <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} disabled={busy}>刷新</Button>
          </Stack>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>chargeId</TableCell>
              <TableCell>票种</TableCell>
              <TableCell align="right">creditNum</TableCell>
              <TableCell align="right">stock</TableCell>
              <TableCell>purchaseDate</TableCell>
              <TableCell>validDate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(charges?.list || []).length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
                （空 —— 账号没有任何票券记录）
              </TableCell></TableRow>
            )}
            {(charges?.list || []).map((c) => (
              <TableRow key={c.chargeId} selected={Number(c.stock) > 0}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{c.chargeId}</TableCell>
                <TableCell>{TICKETS.find((t) => t.id === c.chargeId)?.name || '—'}</TableCell>
                <TableCell align="right">{TICKETS.find((t) => t.id === c.chargeId)?.credit ?? '—'}</TableCell>
                <TableCell align="right">
                  {Number(c.stock) > 0
                    ? <Chip size="small" color="success" variant="outlined" label={`${c.stock} ★`} />
                    : <span style={{ opacity: 0.6 }}>{c.stock}</span>}
                </TableCell>
                <TableCell sx={{ opacity: 0.75 }}>{c.purchaseDate || '—'}</TableCell>
                <TableCell sx={{ opacity: 0.75 }}>{c.validDate || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {guard && (
          <Alert severity={guard.has_fresh_read ? 'success' : 'warning'} sx={{ mt: 1.5 }}>
            ChargeGuard：{guard.has_fresh_read
              ? `已登记「刚查过票券」（${guard.last_read_age != null ? guard.last_read_age.toFixed(0) : 0} 秒前，新鲜度窗口 ${guard.fresh_sec} 秒）—— 允许购买`
              : '尚未查询过票券 —— 此时购买会被 ChargelogGuardError 拒绝（未发包）。点「刷新」即可登记。'}
            {guard.purchased?.length > 0 && (
              <> · 本进程已买过：{guard.purchased.join(', ')}（同账号同进程只允许买一次）</>
            )}
          </Alert>
        )}
      </Section>

      {/* ---- 买票 ---- */}
      <Section
        title="购买功能票"
        subtitle="UpsertUserChargelogApi —— 会写入一条购买记录，不可撤销"
      >
        <Alert severity="warning" sx={{ mb: 2 }}>
          账号已持有功能票时<strong>拒绝购买</strong> —— 真机是「买完立刻被这一局用掉」（stock 恒为 0），
          重复购买是明显的异常行为，有封号风险。
        </Alert>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
          {TICKETS.map((t) => (
            <Chip
              key={t.id}
              label={`${t.id} · ${t.name}`}
              color={Number(chargeId) === t.id ? 'primary' : 'default'}
              variant={Number(chargeId) === t.id ? 'filled' : 'outlined'}
              onClick={() => setChargeId(t.id)}
            />
          ))}
          <NumField label="或直接输入 chargeId" value={chargeId} onChange={setChargeId} sx={{ width: 180 }} />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<ConfirmationNumberIcon />} disabled={busy || readOnly}
            onClick={() => buy(false)}>
            预检（不发包）
          </Button>
          <Button variant="contained" color="error" startIcon={<ConfirmationNumberIcon />} disabled={busy || readOnly}
            onClick={() => setConfirmBuy(true)}>
            真实购买
          </Button>
        </Stack>
      </Section>

      {/* ---- 用票 ---- */}
      <Section
        title="消耗功能票"
        subtitle="用 UpsertUserAll 表达「用这张票打了一局」—— userChargeList 里目标票 stock - 1"
      >
        <Alert severity="info" sx={{ mb: 2 }}>
          GetUserChargeApi 与 UpsertUserAllApi 里的 userChargeList 格式完全相同，
          所以把该节点里目标票的 stock 减 1，再让 playlog 带上 useTicketId / playCredit，
          服务端就认为这张票被这一局用掉了。playCredit = 投币数(1) + creditNum。
        </Alert>

        {held.length === 0 ? (
          <Alert severity="warning">账号当前没有持有任何功能票，没有可消耗的东西。想买票请用上面「购买功能票」。</Alert>
        ) : (
          <>
            <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                size="small"
                label="第一张持有的"
                color={ticketId === '' ? 'primary' : 'default'}
                variant={ticketId === '' ? 'filled' : 'outlined'}
                onClick={() => setTicketId('')}
              />
              {held.map((c) => (
                <Chip
                  key={c.chargeId}
                  size="small"
                  label={`chargeId ${c.chargeId} · stock ${c.stock}`}
                  color={Number(ticketId) === Number(c.chargeId) ? 'primary' : 'default'}
                  variant={Number(ticketId) === Number(c.chargeId) ? 'filled' : 'outlined'}
                  onClick={() => setTicketId(String(c.chargeId))}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" startIcon={<RemoveCircleIcon />} disabled={busy || readOnly}
                onClick={() => use_(false)}>
                预检（不发包）
              </Button>
              <Button variant="contained" color="error" startIcon={<RemoveCircleIcon />} disabled={busy || readOnly}
                onClick={() => setConfirmUse(true)}>
                真实消耗
              </Button>
            </Stack>
          </>
        )}
      </Section>

      {result && (
        <Section title="上次结果">
          <JsonBox data={result.result} maxHeight={360} />
        </Section>
      )}

      <DangerConfirm
        open={confirmBuy}
        title="确认真实购买功能票？"
        body={{
          main: '即将购买一张功能票：',
          rows: [
            ['chargeId', chargeId],
            ['票种', TICKETS.find((t) => t.id === Number(chargeId))?.name || '—'],
            ['user_id', session?.user_id ?? '—'],
          ],
          detail: '会写入一条购买记录。真机是「买完立刻被这一局用掉」，账号已持票时服务端视为重复购买，有封号风险。',
        }}
        confirmWord="确认购买"
        busy={busy}
        onCancel={() => setConfirmBuy(false)}
        onOk={async () => { setConfirmBuy(false); await buy(true) }}
      />

      <DangerConfirm
        open={confirmUse}
        title="确认真实消耗功能票？"
        body={{
          main: '即将消耗一张功能票（相当于用这张票打了一局）：',
          rows: [
            ['chargeId', ticketId === '' ? '（第一张持有的）' : ticketId],
            ['user_id', session?.user_id ?? '—'],
          ],
          detail: '消耗方式是把 userChargeList 里该票的 stock 减 1，同时 playlog 带上 useTicketId —— 服务端即认为这张票被本局用掉。',
        }}
        confirmWord="确认消耗"
        busy={busy}
        onCancel={() => setConfirmUse(false)}
        onOk={async () => { setConfirmUse(false); await use_(true) }}
      />
    </Box>
  )
}
