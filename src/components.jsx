// 通用小组件：结果 JSON 查看器、开关开关、确认对话框、只读字段行。
import React from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, Link, Paper, Stack, TextField, Tooltip, Typography, FormControlLabel,
  Switch, Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useApp } from './store.jsx'
import { api, API_BASE, API_SOURCE, API_SOURCE_LABELS, setApiBase } from './api.js'
import { SOURCE_LABELS } from './apibase.js'

// 后端连接设置 —— 严格按 MD3 规范的实现。
//
// 结构（自上而下，8px 网格）：
//   1. 头部：Title Large(22/500) 左 + MD3 Assist Chip（右上角，justify-between）
//   2. 当前后端信息行：body-medium 灰色 label 左，粗体地址右邻 Text Button
//   3. 输入区：Outlined Text Field + Filled Button(40/全圆角) + Text Button，12px 间距居中
//   4. 帮助区：surface-variant 圆角块包裹 + mt 24px，body-small on-surface-variant
export function BackendPanel() {
  const { health, act, mode } = useApp()
  const dark = mode === 'dark'
  const [draft, setDraft] = React.useState('')
  const displayBase = API_BASE === '/api' ? '同源 /api' : API_BASE
  const sameOrigin = API_BASE === '/api'
  const ok = health?.ok !== false && health?.astral === 'imported'
  const suspiciousSameOrigin = sameOrigin && health?.ok === false

  async function probeNow() {
    await act(() => api.health(), { refresh: false })
  }

  return (
    // ★ 收紧：区块间距 24px → 16px，上半部分更紧凑
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* ---- 1. Header：标题 + 右上角状态（★ 用 StatusChip 与其它卡片同款同尺寸） ---- */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 17 }}>
          后端连接
        </Typography>
        {/* ★ 之前用 MUI Chip size=small：内部 padding 小，胶囊比其它卡片的
              StatusChip 窄一圈。统一用 StatusChip（32px 高、12px 内边距）。 */}
        <StatusChip
          ok={ok}
          label={ok ? '已连接' : (health?.astral === 'error' ? '后端异常' : '未连通')}
        />
      </Stack>

      {/* ---- 2. 当前后端行：灰 label → 粗体地址 → Text Button（紧邻地址，12px） ---- */}
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        sx={{ rowGap: 1, columnGap: 1.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          当前后端
        </Typography>
        <Typography
          variant="body1"
          sx={{ fontWeight: 700, fontFamily: 'Consolas, monospace', minWidth: 0, wordBreak: 'break-all' }}
        >
          {displayBase}
        </Typography>
        {/* ★ 紧跟地址之后（不贴卡片右缘）：主色文字 + pill 圆角 hover 背景 */}
        <Button
          variant="text"
          onClick={probeNow}
          sx={{ flexShrink: 0, px: 1.5, py: 0.5, minHeight: 0, borderRadius: '9999px' }}
        >
          重新探测
        </Button>
      </Stack>

      {/* ---- 3. 输入与操作区：严格垂直居中，按钮间 12px ---- */}
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        sx={{ columnGap: 1.5, rowGap: 1.5 }}
      >
        <TextField
          label="后端地址（留空 = 同源）"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="http://127.0.0.1:8765"
          sx={{ width: 380, maxWidth: '100%' }}
        />
        {/* Filled Button：40px、全圆角、水平内边距收紧（24 → 20px） */}
        <Button
          variant="contained"
          onClick={() => setApiBase(draft)}
          sx={{ height: 40, borderRadius: '9999px', px: 2.5, flexShrink: 0 }}
        >
          应用并重载
        </Button>
        {/* Text Button：与主按钮间 12px（columnGap 保证）、px 12px */}
        <Button
          variant="text"
          onClick={() => setApiBase('')}
          disabled={!sameOrigin}
          sx={{ height: 40, px: 1.5, flexShrink: 0 }}
        >
          清除覆盖
        </Button>
      </Stack>

      {/* ---- 4. 帮助区：surface-variant 圆角块；父 gap 16px + mt 8px = 与操作区相距 24px ---- */}
      <Box
        sx={{
          mt: 1,
          px: 2, py: 1.5,
          borderRadius: '8px',
          bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
          <Tooltip
            title={'地址来源优先级：' + Object.values(SOURCE_LABELS).join('  >  ')
              + '。留空时请求走同源 /api（由 Vite 代理或反向代理转发）。'}
            arrow
            placement="top"
          >
            <Box component="span" sx={{ display: 'inline-flex', mt: '2px', cursor: 'help' }}>
              <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Box>
          </Tooltip>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            也可以用 <code>?api=http://host:port</code> 直接打开页面来指定后端
            （优先级最高，不入本地存储）。
          </Typography>
        </Stack>
      </Box>

      {/* ---- 5. 诊断块（仅出错时）：灰底包裹，与操作区隔开 ---- */}
      {health?.ok === false && (
        <Box
          sx={{
            p: 2,
            borderRadius: '8px',
            bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: 'Consolas, monospace', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'text.secondary' }}>
            {`页面地址  ${typeof location !== 'undefined' ? location.origin + location.pathname : '?'}\nAPI_BASE  ${API_BASE}\n来源      ${API_SOURCE}\n探测错误  ${health.error || '(无)'}`}
          </Typography>
        </Box>
      )}

      {/* ---- 6. 错误修复建议（仅同源未连通时） ---- */}
      {suspiciousSameOrigin && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            当前页面所在的源上没有 Astral 后端
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            「同源 /api」模式要求页面本身由后端（8765）或 Vite 代理（5173）提供。
            推荐直接从{' '}
            <Link href="http://127.0.0.1:8765" target="_blank">http://127.0.0.1:8765</Link>{' '}
            打开（后端自带页面托管），或一键把 API 指向本机后端：
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => setApiBase('http://127.0.0.1:8765')}
            sx={{ borderRadius: '999px' }}
          >
            一键指向 http://127.0.0.1:8765
          </Button>
        </Alert>
      )}
    </Box>
  )
}

export function JsonBox({ data, maxHeight = 260, defaultOpen = false }) {
  const { logColors: lc } = useApp()
  const [open, setOpen] = React.useState(defaultOpen)
  let text
  try {
    text = JSON.stringify(data, null, 2)
  } catch {
    text = String(data)
  }
  return (
    <Box>
      <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ mb: 0.5 }}>
        {open ? '收起报文' : '展开报文'}（{text.length.toLocaleString()} 字符）
      </Button>
      {open && (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            maxHeight,
            overflow: 'auto',
            bgcolor: lc.panelBg,
            borderColor: lc.panelBorder,
            fontFamily: 'Consolas, "Cascadia Mono", monospace',
            fontSize: 11.5,
            whiteSpace: 'pre',
            lineHeight: 1.45,
            color: lc.text,
          }}
        >
          {text}
        </Paper>
      )}
    </Box>
  )
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <Tooltip title={hint || ''} arrow placement="top">
      <FormControlLabel
        // ★ 开关与文字之间留出明确间距，label 字重稍加重以看起来可点
        sx={{ gap: 1, mr: 0, ml: -0.5 }}
        slotProps={{ typography: { variant: 'body2', fontWeight: 500 } }}
        control={<Switch checked={!!checked} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
      />
    </Tooltip>
  )
}

// ★ 数字输入框：既能清空，也能正常输入小数点。
//
// 两个坑都要避开：
//   1) type="number" + 空值转 0 → 退格键删不掉（清空后立刻弹回 0）
//   2) 受控 value 直接用 Number → 输入 "99." 时 Number 得 99，父组件回传 99，
//      末尾的小数点被吃掉，永远输不进 "99.5"
//
// 解法：组件内部维护「草稿字符串」draft。
//   - 用户输入什么就存什么（只要符合数字格式）
//   - 只有当 draft 能解析成完整数字时才 onChange 通知父组件
//   - 父组件的 value 变化（比如反推写入、程序重置）时，若与 draft 数值不同才同步回 draft
//   这样 "99." / "-" / "0." 这些中间态都留在输入框里，不会被打断。
export function NumField({ label, value, onChange, hint, allowEmpty = true, ...rest }) {
  const [draft, setDraft] = React.useState(value ?? '')
  const focused = React.useRef(false)

  // 外部 value 变化时同步（跳过聚焦中的编辑，避免打断用户输入）
  React.useEffect(() => {
    if (focused.current) return
    const next = value ?? ''
    setDraft(next)
  }, [value])

  const handle = (raw) => {
    // 只接受「可选负号 + 数字 + 最多一个小数点」，其余字符忽略
    if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) return
    setDraft(raw)

    if (raw === '') {
      onChange(allowEmpty ? '' : 0)
      return
    }
    // "99." / "-" / "." 这类中间态不通知父组件（还不是完整数字）
    if (raw === '-' || raw === '.' || raw === '-.' || raw.endsWith('.')) return
    const num = Number(raw)
    if (Number.isNaN(num)) return
    onChange(num)
  }

  return (
    <Tooltip title={hint || ''} arrow placement="top">
      <TextField
        label={label}
        size="small"
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => handle(e.target.value)}
        onFocus={() => { focused.current = true }}
        onBlur={() => {
          focused.current = false
          // 失焦时把中间态规整掉（"99." → "99"）
          if (draft === '' || draft === '-' || draft === '.' || draft === '-.') {
            setDraft(allowEmpty ? '' : 0)
          } else if (draft.endsWith('.')) {
            setDraft(draft.slice(0, -1))
          }
        }}
        fullWidth
        {...rest}
      />
    </Tooltip>
  )
}

export function TextField2({ label, value, onChange, hint, ...rest }) {
  return (
    <Tooltip title={hint || ''} arrow placement="top">
      <TextField
        label={label}
        size="small"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        multiline={rest.multiline}
        minRows={rest.minRows}
        maxRows={rest.maxRows}
        {...rest}
      />
    </Tooltip>
  )
}

// ============================================================================
// StatusChip —— MD3 Outlined Chip（状态标签）
// ============================================================================
// 规范要点：
//   - Stadium 形状（9999px）、高 32px、内部左右 padding 12px
//   - 背景 transparent，边框 1px outline-variant（带透明度的灰）
//   - 文字一律 on-surface —— 状态差异靠【图标颜色】表达，文字不变红
//       · error  态：Error 图标（红）     —— 如「未登录」
//       · ok     态：Check 图标（主蓝）   —— 如「机台已配置」「日志流已连接」
//       · neutral：无图标，纯文本         —— 如「后端：同源 /api」
//   - hover：surface 状态层（bg-black/5），0.2s 过渡
export function StatusChip({ ok, icon, label, children, onClick }) {
  const { mode } = useApp()
  const dark = mode === 'dark'
  // 图标：优先用调用方显式传入的 icon；否则按 ok 三态自动给
  const lead = icon !== undefined
    ? icon
    : ok === undefined
      ? null
      : ok
        ? <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        : <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />

  const clickable = typeof onClick === 'function'

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,                                   // 图标与文字 gap 8px
        height: 32,                               // MD3 Chip 标准高度
        px: 1.5,                                  // 左右 12px
        borderRadius: '9999px',                   // Stadium
        border: '1px solid',                      // 1px outline
        borderColor: 'outlineVariant',
        bgcolor: 'transparent',
        color: 'onSurface',                       // 文字保持 on-surface
        transition: 'background 0.2s',
        // MD3 状态层：hover 时 bg-black/5（深色模式用白 5%）
        ...(clickable && {
          cursor: 'pointer',
          '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        }),
        minWidth: 0,
      }}
    >
      {lead}
      <Typography
        variant="body2"
        component="span"
        sx={{ fontWeight: 400, whiteSpace: 'nowrap', lineHeight: 1, color: 'onSurface' }}
      >
        {label ?? children}
      </Typography>
    </Box>
  )
}

export function BusyChip({ busy }) {
  return busy ? (
    <Chip size="small" color="warning" variant="outlined" icon={<HourglassEmptyIcon />} label="执行中…" />
  ) : null
}

// 有副作用操作的二次确认。危险操作必须显式勾选 + 输入确认词。
// ============================================================================
// DangerConfirm —— 有副作用操作的统一确认对话框（警告式，无输入）
// ============================================================================
// 设计原则：
//   1. **不要求打字** —— 输入确认词对单手操作太重，MD3 的做法是用
//      「视觉重量」代替「操作成本」：图标 + 警示底色块 + 红色主按钮。
//   2. body 支持 string（纯文本，居中前的左对齐多行）或
//      { main, detail, rows: [[k, v], ...] } 结构（键值参数表）。
//   3. confirmWord 参数保留兼容但不再强制输入（传入也只作为按钮文案提示）。
export function DangerConfirm({ open, title, body, confirmWord, onCancel, onOk, busy }) {
  const { mode } = useApp()
  const dark = mode === 'dark'
  // 结构化 body：{ main, detail, rows }
  const structured = body && typeof body === 'object'
  const rows = structured ? (body.rows || []) : []

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 26 }} />
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>{title}</Typography>
      </DialogTitle>
      <DialogContent>
        {/* 主句 */}
        {structured ? (
          <>
            <DialogContentText sx={{ mb: 1.5 }}>{body.main}</DialogContentText>
            {/* 参数表：键值对逐行，灰底块包裹 —— 比 pre 文本清晰得多 */}
            {rows.length > 0 && (
              <Box sx={{
                px: 2, py: 1.25, borderRadius: '8px', my: 1,
                bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)',
              }}>
                {rows.map(([k, v], i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="baseline"
                    sx={{ py: 0.4, borderBottom: i < rows.length - 1 ? '1px dashed' : 'none', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>
                      {k}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: /[A-Z_0-9]{4,}/.test(String(v)) || /^\d+$/.test(String(v)) ? 'Consolas, monospace' : undefined, fontWeight: 500, wordBreak: 'break-all' }}>
                      {String(v) || '（空）'}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            )}
            {body.detail && (
              <DialogContentText variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                {body.detail}
              </DialogContentText>
            )}
          </>
        ) : (
          <DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>{body}</DialogContentText>
        )}

        {/* 警示条：代替原来的输入确认词 —— 明确说"不可撤销"，视觉上红底 */}
        <Alert severity="error" variant="outlined" sx={{ mt: 2, borderRadius: '8px' }}>
          <Typography variant="body2">
            {confirmWord
              ? `此操作不可撤销（原需输入「${confirmWord}」—— 现已免输入，请确认参数后执行）`
              : '此操作将真实写入服务器且不可撤销，请确认参数无误。'}
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} disabled={busy} variant="text" sx={{ minWidth: 96 }}>
          取消
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy}
          onClick={onOk}
          sx={{ minWidth: 110 }}
        >
          {busy ? '执行中…' : '确认执行'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// MD3 Section：surface-container-low 卡片 + medium(12px) 圆角 + outline 边框。
// ★ sx 里的数字型 borderRadius 是 theme.shape.borderRadius 的**倍数**（12 → 144px！），
//   所以这里必须写显式 '12px'。
// ★ display:flex column：children 里写 flex:1 的元素可以撑满剩余高度
//   （LoginPage 的日志面板靠这个与左栏等高对齐）。
export function Section({ title, subtitle, children, right, compact, fill }) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: compact ? 1.5 : 2.5,
        mb: 2,
        borderRadius: '12px',
        ...(fill && {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          mb: 0,
          minHeight: 0,
          // Paper 内部直接是 children，让内容区可滚动
          overflow: 'hidden',
        }),
      }}
    >
      {/* ★ title 和 right 都没传时不渲染 header —— 否则空 Stack 的 mb 会
            把内容整体推下 16px（"后端连接"卡上方留白异常的根因） */}
      {(title || right) && (
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          flexWrap="wrap"
          sx={fill
            ? { mb: 1.5, flexShrink: 0, columnGap: 1.5, rowGap: 1 }
            : { mb: compact ? 1 : 2, columnGap: 1.5, rowGap: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 17 }}>{title}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {/* ★ right 顶到标题行：alignSelf 抵消 flex-start；flexShrink:0 防窄屏被压出界 */}
          <Box sx={{ flexShrink: 0, alignSelf: 'center' }}>
            {right}
          </Box>
        </Stack>
      )}
      {fill ? <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box> : children}
    </Paper>
  )
}

