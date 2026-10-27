// 主页 / 仪表盘 —— MD3 风格的卡片网格。
//
// 设计目标（对应桌面端宽屏的空间利用）：
//   1. 大屏（>=1400px）一行 3 张卡，中屏（>=900px）2 张，窄屏 1 张
//   2. 卡片是 MD3 的 surface-container-low + outline 边框，不用重阴影
//   3. 首屏一屏内能看完「我现在能做什么」—— 每张卡一个动作入口
import React from 'react'
import {
  Alert, Box, Button, Card, CardActionArea, CardContent, Chip,
  Paper, Stack, Tooltip, Typography,
} from '@mui/material'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import MemoryIcon from '@mui/icons-material/Memory'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import StorageIcon from '@mui/icons-material/Storage'
import BuildIcon from '@mui/icons-material/Build'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import { useApp } from './store.jsx'
import { StatusChip } from './components.jsx'
import { API_BASE, API_SOURCE_LABELS } from './api.js'
import { useProfiles } from './profiles.js'

const ACTIONS = [
  {
    key: 'login', label: '扫码登录', icon: <QrCode2Icon />,
    desc: '用机台的微信二维码登录账号，建立会话。',
    to: 'login', tone: 'primary',
  },
  {
    key: 'profiles', label: '机台预设', icon: <MemoryIcon />,
    desc: '保存多组 CLIENT_ID / 区域 / 店铺，一键切换并写入 config.py。',
    to: 'profiles', tone: 'secondary',
  },
  {
    key: 'upsert', label: '上传成绩', icon: <CloudUploadIcon />,
    desc: '上传一局游玩成绩（36 节点 / 110 字段 / 差分）。',
    to: 'upsert', tone: 'tertiary',
  },
  {
    key: 'unlock', label: '解锁歌曲', icon: <LockOpenIcon />,
    desc: '解锁（解禁）歌曲 / Master / Re:Master 难度。',
    to: 'unlock', tone: 'primary',
  },
  {
    key: 'charge', label: '功能票', icon: <ConfirmationNumberIcon />,
    desc: '购买 / 消耗 2x·3x·5x 功能票，带 ChargeGuard 安全闸门。',
    to: 'charge', tone: 'secondary',
  },
  {
    key: 'snapshot', label: '数据快照', icon: <StorageIcon />,
    desc: '查看账号 19 个节点的基线数据快照。',
    to: 'snapshot', tone: 'tertiary',
  },
  {
    key: 'tools', label: '转生 / 更新包', icon: <BuildIcon />,
    desc: '账号数据迁移（分批上传），查询下载 .app / .opt 更新包。',
    to: 'tools', tone: 'primary',
  },
]

export default function DashboardPage() {
  const { session, health, logs, streamState, setPage } = useApp()
  const { profiles, active } = useProfiles()

  const machine = session?.machine || {}
  const loggedIn = !!session?.logged_in
  const streamOk = streamState === 'open'
  const problems = []

  if (health?.ok === false) {
    problems.push({ text: '后端未就绪：' + (health.error || '无法连接或导入失败'), to: 'login' })
  }
  if (!machine.ready) {
    problems.push({ text: '尚未配置机台标识 —— 到「机台预设」填写', to: 'profiles' })
  }
  if (!loggedIn) {
    problems.push({ text: '尚未登录 —— 先扫码建立会话', to: 'login' })
  }
  // connecting 是正常瞬时态（EventSource 会自动重连），不当成问题；
  // timeout 才是真的连不上（后端没起 / 地址错）
  if (streamState === 'timeout') {
    problems.push({ text: '实时日志流连不上 —— 请确认后端已启动（127.0.0.1:8765）', to: null })
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 650 }}>Stella</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>先处理账号和机台，再上传成绩。</Typography>
      </Box>
      <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
        {/* 未登录：红 Error 图标 + on-surface 文字 */}
        <StatusChip ok={loggedIn}>
          {loggedIn ? `已登录 · user ${session.user_id}` : '未登录'}
        </StatusChip>
        {/* 机台已配置：蓝 Check 图标 */}
        <StatusChip ok={machine.ready}>
          {machine.ready ? '机台已配置' : '机台未配置'}
        </StatusChip>
        {active && <StatusChip label={`预设：${active.name}`} />}
        <Tooltip title={`后端地址来源：${API_SOURCE_LABELS}`}>
          <StatusChip label={`后端：${API_BASE === '/api' ? '同源 /api' : API_BASE}`} />
        </Tooltip>
        {/* 日志流：连接中给 warning 色 Hourglass 图标，断开红 Error，连接蓝 Check */}
        <StatusChip
          ok={streamOk ? true : streamState === 'connecting' ? undefined : false}
          icon={
            streamOk ? <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            : streamState === 'connecting' ? <HourglassEmptyIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            : <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
          }
        >
          {streamOk ? '日志流已连接' : streamState === 'connecting' ? '日志流连接中' : '日志流未连接'}
        </StatusChip>
        <StatusChip label={`${profiles.length} 个预设 · ${logs.length} 条日志`} />
      </Stack>

      {/* ---- 待办提示：卡片式列表，每条带明确的「去处理」按钮 ---- */}
      {problems.length > 0 && (
        <Paper elevation={0} sx={{
          p: 2, borderRadius: '12px', width: '100%', maxWidth: 720,
          border: '1px solid #E8EAEE',
          '&:hover': { boxShadow: '0 4px 8px rgba(127,143,159,.3)' },
        }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              还有 {problems.length} 件事没做
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {problems.map((p, i) => (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  px: 1.5, py: 1,
                  borderRadius: '8px',
                  bgcolor: 'background.default',
                  border: '1px solid', borderColor: 'divider',
                }}
              >
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                  {p.text}
                </Typography>
                {p.to && (
                  <Button
                    size="small"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => setPage(p.to)}
                    sx={{ flexShrink: 0 }}
                  >
                    去处理
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ---- 功能卡片网格 ---- */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
        {ACTIONS.map((a) => (
          <Box key={a.key}>
            <Card elevation={0} sx={{
              height: '100%', border: '1px solid #E8EAEE',
              backgroundImage: 'linear-gradient(180deg, #fff 0%, #F7FBFF 100%)',
              '&:hover': { boxShadow: '0 4px 8px rgba(127,143,159,.3)' },
            }}>
              <CardActionArea
                onClick={() => setPage(a.to)}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', p: 2.5 }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: '8px', flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      backgroundColor: (t) =>
                        a.tone === 'primary' ? t.palette.primaryContainer
                        : a.tone === 'secondary' ? t.palette.secondaryContainer
                        : t.palette.tertiaryContainer,
                      color: (t) =>
                        a.tone === 'primary' ? t.palette.onPrimaryContainer
                        : a.tone === 'secondary' ? t.palette.onSecondaryContainer
                        : t.palette.onTertiaryContainer,
                    }}
                  >
                    {a.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>{a.label}</Typography>
                  <ArrowForwardIcon fontSize="small" sx={{ opacity: 0.4 }} />
                </Stack>
                <CardContent sx={{ p: 0, flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {a.desc}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
      </Box>

      {/* ---- 说明 ---- */}
      <Alert severity="info">
        所有写操作默认只做**预检**（构造报文、不发包）；确认真实执行时需要输入确认词。
        请遵守游戏服务条款，不要用于破坏游戏公平性。
      </Alert>
    </Stack>
  )
}



