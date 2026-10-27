// 扫码登录页 + 会话状态 + 实时日志流。
import React from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grid, Paper, Stack, TextField, Typography,
  IconButton, Tooltip,
} from '@mui/material'
import QrCodeIcon from '@mui/icons-material/QrCode'
import LogoutIcon from '@mui/icons-material/Logout'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { useApp, fmtTime } from './store.jsx'
import { api } from './api.js'
import { Section, StatusChip, Toggle, BackendPanel } from './components.jsx'
import { useProfiles } from './profiles.js'
import { isScreenCaptureSupported, scanScreen } from './qrcamera.js'
import MonitorIcon from '@mui/icons-material/Monitor'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'

export default function LoginPage() {
  const {
    session, logs, streamState, act, clearLogs, health, busy,
    logColors: lc, setPage,
  } = useApp()
  const { active: activeProfile } = useProfiles()

  const [qr, setQr] = React.useState('')
  const [pullSnapshot, setPullSnapshot] = React.useState(true)
  const [lastResult, setLastResult] = React.useState(null)
  const logRef = React.useRef(null)

  const machine = session?.machine || {}
  const loggedIn = !!session?.logged_in

  // 日志自动滚到底
  React.useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  async function doLogin() {
    if (!qr.trim()) return
    const out = await act(() => api.login(qr.trim(), pullSnapshot), {
      successText: '登录成功，会话已就绪',
    })
    if (out?.result) setLastResult(out.result)
    setQr('')
  }

  async function doLogout() {
    await act(() => api.logout(), { successText: '已登出' })
  }

  async function forceLogout() {
    await act(() => api.forceLogout(), { successText: '已发送强制登出' })
  }

  // ---- 扫屏幕（桌面首选）：二维码在微信公众号里，电脑上用微信 PC 版 /
  //      投屏显示后，框选屏幕区域识别。手机端无摄像头需求（码本来就在手机里）。
  const [scanning, setScanning] = React.useState(false)
  const canScanScreen = isScreenCaptureSupported() && !loggedIn

  // 屏幕取景：直接弹浏览器选择器，无需对话框
  async function scanScreenOnce() {
    const ac = new AbortController()
    setScanning(true)
    try {
      const text = await scanScreen(ac.signal)
      setQr(text.trim())
    } catch {
      /* 用户取消 */
    } finally {
      setScanning(false)
      ac.abort()
    }
  }
  const leftCol = (
    <Stack spacing={2}>
      <Section
        title="机台标识"
        subtitle="来自 Astral/config.py —— 没填的话任何请求都会被服务端拒绝"
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            {activeProfile && (
              <Chip size="small" variant="outlined" color="primary" label={`预设：${activeProfile.name}`} />
            )}
            <StatusChip ok={machine.ready}>{machine.ready ? '已配置' : '未配置'}</StatusChip>
          </Stack>
        }
      >
        <Grid container spacing={1.5}>
          {[
            ['CLIENT_ID', machine.client_id || '（空）', true],
            ['REGION_ID', machine.region_id, false],
            ['PLACE_ID', machine.place_id, false],
            ['PLACE_NAME', machine.place_name || '（空）', false],
            ['REGION_NAME', machine.region_name || '（空）', false],
          ].map(([k, v, mono]) => (
            <Grid item xs={6} sm={4} key={k}>
              <KV label={k} value={v} mono={mono} />
            </Grid>
          ))}
        </Grid>
        {!machine.ready && (
          <Alert
            severity="warning"
            sx={{ mt: 1.5, alignItems: 'center', py: 1 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={() => setPage('profiles')}
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                去配置
              </Button>
            }
          >
            {/* ★ 拆成两行：主句一句话一行；功能亮点用小字第二行，逐项以「·」分隔
                避免整段挤成折行乱麻 */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                还没有配置机台标识 —— 请到「机台预设」页填写
              </Typography>
              <Typography variant="caption" color="inherit" sx={{ opacity: 0.75, display: 'block', mt: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                支持多预设切换 · 从 ALL.Net 认证服务器反查 · 一键写入 config.py
              </Typography>
            </Box>
          </Alert>
        )}
      </Section>

      <Section
        title="扫码登录"
        subtitle="二维码从机台「扫码登录」界面获取，有效期 10 分钟（不是按次数计量）"
        right={
          <StatusChip ok={loggedIn}>
            {loggedIn ? `已登录 · user ${session.user_id}` : '未登录'}
          </StatusChip>
        }
      >
        {/* ★ 按钮与输入框同高对齐：alignItems 用 flex-start + 输入框带 helper 的高度差
              通过让按钮自带高度 40（TextField small 的实际高度）解决 */}
        <Stack direction="row" alignItems="flex-start" flexWrap="wrap" useFlexGap spacing={1}>
          <TextField
            label="二维码串 / URL"
            placeholder="SGWCMAID2610..."
            value={qr}
            onChange={(e) => setQr(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
            disabled={loggedIn}
            fullWidth
            sx={{ flex: '1 1 280px', minWidth: 0 }}
            inputProps={{ style: { fontFamily: 'Consolas, monospace' } }}
          />
          {/* 三个按钮绑成一组：空间不够时整组换行，并与输入框左边缘对齐 */}
          <Stack direction="row" spacing={1} flexWrap="nowrap" useFlexGap sx={{ flex: '0 0 auto' }}>
            <Button
              variant="contained"
              startIcon={<QrCodeIcon />}
              onClick={doLogin}
              disabled={loggedIn || !qr.trim() || busy}
              sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
            >
              登录
            </Button>
            {/* ★ 扫屏幕（桌面首选）：二维码在微信公众号里，电脑上用微信 PC 版 /
                  投屏显示后，直接框选屏幕区域识别。手机摄像头无意义（码就在手机里）。 */}
            {canScanScreen && (
              <Tooltip title="框选屏幕上的二维码区域，自动识别（微信 PC 版 / 投屏画面均可）">
                <Button
                  variant="outlined"
                  startIcon={scanning ? <HourglassEmptyIcon /> : <MonitorIcon />}
                  onClick={scanScreenOnce}
                  disabled={busy || scanning}
                  sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
                >
                  {scanning ? '识别中…' : '扫屏幕'}
                </Button>
              </Tooltip>
            )}
            <Button
              variant="outlined"
              color="warning"
              startIcon={<LogoutIcon />}
              onClick={doLogout}
              disabled={!loggedIn || busy}
              sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
            >
              登出
            </Button>
            <Button variant="outlined" color="error" onClick={forceLogout} disabled={busy} sx={{ mt: 0.25, whiteSpace: 'nowrap' }}>
              强制登出
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <Toggle
            label="登录后自动抓取结算快照"
            checked={pullSnapshot}
            onChange={setPullSnapshot}
            hint="开启后，登录成功会自动抓取 19 个节点的基线数据并落盘 data/<userId>.json —— 上传成绩/解锁/用票都需要它作差分基线。关闭则只登录、不抓数据（更快，但写操作前需手动抓取）。"
          />
        </Box>

        {lastResult && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            登录成功：user_id = {lastResult.user_id}，loginId = {lastResult.login_id}
            {lastResult.snapshot_summary && (
              <>，快照 {Object.keys(lastResult.snapshot_summary).length} 个节点</>
            )}
          </Alert>
        )}
      </Section>

      {loggedIn && session.preview && (
        <Section title="账号预览" subtitle="GetUserPreviewApi">
          <Grid container spacing={1.5}>
            {[
              ['userId', session.preview.userId],
              ['userName', session.preview.userName || '（空）'],
              ['rating', session.preview.playerRating],
              ['lastPlayVersion', session.preview.lastPlayVersion],
              ['isLogin', String(!!session.preview.isLogin)],
              ['loginDeltaTime', session.preview.loginDeltaTime],
            ].map(([k, v]) => (
              <Grid item xs={6} sm={4} key={k}><KV label={k} value={v} /></Grid>
            ))}
          </Grid>
        </Section>
      )}

      {/* ★ 后端连接面板自带 MD3 Title Large 头部与状态，Section 不再传 title/right
            （否则出现两个"后端连接"标题） */}
      <Section>
        <BackendPanel />
      </Section>
    </Stack>
  )

  return (
    <Grid container spacing={2.5} alignItems="stretch">
      {/* 左栏：登录相关（宽屏 5/12）。
          ★ item 内部套 flex 容器，让 leftCol 的最后一个 Section 贴到栏底 —— 与右栏对齐 */}
      <Grid item xs={12} lg={5} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, '& > :last-child': { flex: 1, mb: 0 } }}>
          {leftCol}
        </Box>
      </Grid>

      {/* 右栏：实时日志（宽屏 7/12）。
          ★ fill 模式：Section 撑满本栏高度（与左栏等高），日志面板填满剩余空间 */}
      <Grid item xs={12} lg={7} sx={{ display: 'flex' }}>
        <Box sx={{ width: '100%', display: 'flex' }}>
          <Section
            fill
            title="实时日志"
            subtitle="Astral api 的全部调用都会自动记录在这里（和 logs/latest.log 同步）"
            right={
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  variant="outlined"
                  color={streamState === 'open' ? 'success'
                    : streamState === 'connecting' ? 'warning' : 'error'}
                  label={streamState === 'open' ? '已连接'
                    : streamState === 'connecting' ? '连接中'
                    : streamState === 'timeout' ? '连不上（检查后端）' : '已关闭'}
                />
                <Tooltip title="清空">
                  <IconButton size="small" onClick={clearLogs}>
                    <DeleteSweepIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
          >
            <Paper
              ref={logRef}
              variant="outlined"
              sx={{
                flex: 1,
                minHeight: { xs: 340, lg: 380 },
                overflow: 'auto',
                p: 1.5,
                bgcolor: lc.panelBg,
                borderColor: lc.panelBorder,
                fontFamily: 'Consolas, "Cascadia Mono", monospace',
                fontSize: 12,
                lineHeight: 1.6,
                borderRadius: '12px',
              }}
            >
              {logs.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  （暂无日志 —— 登录或执行操作后这里会实时滚动）
                </Typography>
              )}
              {logs.map((l, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.25 }}>
                  <Box component="span" sx={{ color: lc.time, flexShrink: 0, userSelect: 'none' }}>
                    {fmtTime(l.ts)}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: l.text?.startsWith('===') ? lc.banner
                        : l.text?.startsWith('->') ? lc.request
                        : l.text?.startsWith('<-') ? lc.response
                        : l.text?.includes('[错误]') ? lc.error
                        : l.text?.includes('[警告]') ? lc.warn
                        : lc.text,
                    }}
                  >
                    {l.text}
                  </Box>
                </Box>
              ))}
            </Paper>
          </Section>
        </Box>
      </Grid>
    </Grid>
  )
}

function KV({ label, value, mono }) {
  // ★ 紧凑单行式：「CLIENT_ID  (空)」—— label 与值同行、基线对齐，
  //   比上下两行的卡片式更紧凑，也消除了「label 和值之间空隙大」的松散感
  return (
    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ flexShrink: 0, lineHeight: 1.6, letterSpacing: 0.2 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: mono ? 'Consolas, monospace' : undefined,
          fontWeight: 500,
          lineHeight: 1.5,
          wordBreak: 'break-all',
          minWidth: 0,
        }}
      >
        {String(value)}
      </Typography>
    </Stack>
  )
}

