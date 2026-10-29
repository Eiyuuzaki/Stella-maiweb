import React from 'react'
import {
  AppBar, Avatar, Box, Chip, Container, Divider, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, Snackbar, Alert, Toolbar,
  Tooltip, Typography, LinearProgress, Badge, Stack,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import StorageIcon from '@mui/icons-material/Storage'
import BuildIcon from '@mui/icons-material/Build'
import MemoryIcon from '@mui/icons-material/Memory'
import TerminalIcon from '@mui/icons-material/Terminal'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { AppProvider, useApp } from './store.jsx'
import { api } from './api.js'
import { StatusChip } from './components.jsx'
import DashboardPage from './DashboardPage.jsx'
import LoginPage from './LoginPage.jsx'
import ProfilesPage from './ProfilesPage.jsx'
import UpsertPage from './UpsertPage.jsx'
import UnlockPage from './UnlockPage.jsx'
import CollectionPage from './CollectionPage.jsx'
import ChargePage from './ChargePage.jsx'
import SnapshotPage from './SnapshotPage.jsx'
import ToolsPage from './ToolsPage.jsx'
import AboutPage from './AboutPage.jsx'
import VersionPresetPage from './VersionPresetPage.jsx'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic'

//: MD3 侧边导航栏宽度（expanded 280dp / collapsed 88dp 的中间值）
const NAV_W = 264

const PAGES = [
  { key: 'dashboard', label: '主页', icon: <DashboardIcon />, comp: DashboardPage },
  { key: 'login', label: '登录 / 日志', icon: <QrCode2Icon />, comp: LoginPage },
  { key: 'profiles', label: '机台预设', icon: <MemoryIcon />, comp: ProfilesPage },
  { key: 'upsert', label: '上传成绩', icon: <CloudUploadIcon />, comp: UpsertPage },
  { key: 'versions', label: '版本预设', icon: <LibraryMusicIcon />, comp: VersionPresetPage },
  { key: 'unlock', label: '解锁歌曲', icon: <LockOpenIcon />, comp: UnlockPage },
  { key: 'collections', label: '收藏品', icon: <LockOpenIcon />, comp: CollectionPage },
  { key: 'charge', label: '功能票', icon: <ConfirmationNumberIcon />, comp: ChargePage },
  { key: 'snapshot', label: '数据快照', icon: <StorageIcon />, comp: SnapshotPage },
  { key: 'tools', label: '转生 / 更新包', icon: <BuildIcon />, comp: ToolsPage },
  { key: 'about', label: '关于', icon: <InfoOutlinedIcon />, comp: AboutPage },
]

function Shell() {
  const { session, toast, busy, mode, toggleMode, page, setPage, streamState, logs } = useApp()
  const [navOpen, setNavOpen] = React.useState(false)
  const [showUserId, setShowUserId] = React.useState(false)
  const [batchProgress, setBatchProgress] = React.useState(null)

  React.useEffect(() => {
    let stop = false
    let hideTimer = null
    let hiddenSig = null
    const load = () => api.batchProgress().then((out) => {
      if (stop) return
      const p = out.progress
      const sig = JSON.stringify([p.running, p.done, p.total, p.message])
      // 完成态已自动隐藏过且内容没变 → 不再显示；新任务（running 或新内容）才恢复
      if (!p.running && sig === hiddenSig) return
      if (!stop) setBatchProgress(p)
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
      if (p.running) { hiddenSig = null; return }
      if (p.total > 0) {
        hiddenSig = sig
        hideTimer = setTimeout(() => {
          hideTimer = null
          if (!stop) setBatchProgress(null)
        }, 60000)
      }
    }).catch(() => {})
    load()
    const timer = setInterval(load, 3000)
    return () => { stop = true; clearInterval(timer); if (hideTimer) clearTimeout(hideTimer) }
  }, [])

  const current = PAGES.find((p) => p.key === page) || PAGES[0]
  const Comp = current.comp
  const loggedIn = !!session?.logged_in
  const streamOk = streamState === 'open'

  const navItems = PAGES.map((p) => (
    <ListItemButton
      key={p.key}
      selected={p.key === page}
      onClick={() => { setPage(p.key); setNavOpen(false) }}
      sx={{ py: 1 }}
    >
      <ListItemIcon sx={{ minWidth: 40, color: p.key === page ? 'primary.main' : 'inherit' }}>
        {p.icon}
      </ListItemIcon>
      <ListItemText
        primary={p.label}
        primaryTypographyProps={{ fontWeight: p.key === page ? 600 : 400 }}
      />
      {p.key === 'login' && streamState === 'closed' && (
        <Chip size="small" color="error" variant="outlined" label="断开" sx={{ height: 18, fontSize: 10 }} />
      )}
    </ListItemButton>
  ))

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 品牌区：Stella（前端名）+ 星光 logo */}
      <Toolbar variant="dense" sx={{ gap: 1.5, px: 2 }}>
        <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 15 }}>
          <AutoAwesomeIcon sx={{ fontSize: 17 }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Stella</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            舞萌 DX Web 控制台
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 1 }}>{navItems}</List>
      <Divider />
      {/* 底部：机台 + 主题（MD3：左对齐、16px 垂直节奏） */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 /* 16px */ }}>
        {/* 机台 */}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            机台
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>
            {session?.machine?.client_id || '（未配置 CLIENT_ID）'}
          </Typography>
        </Box>

        {/* 主题切换：MD3 Icon Button（圆形 hover）+ Body Medium 状态文字
            ★ 图标语义 = 将要切换到的目标模式（浅色态显示月亮=点去深色） */}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            主题
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title={mode === 'dark' ? '切换到浅色' : '切换到深色'}>
              <IconButton
                onClick={toggleMode}
                sx={{
                  width: 40, height: 40, borderRadius: '9999px',
                  bgcolor: 'surfaceContainerHighest',
                  '&:hover': { bgcolor: 'outlineVariant' },
                }}
              >
                {mode === 'dark'
                  ? <LightModeIcon sx={{ fontSize: 20, color: 'onSurface' }} />
                  : <DarkModeIcon sx={{ fontSize: 20, color: 'onSurface' }} />}
              </IconButton>
            </Tooltip>
            <Typography variant="body2" color="text.secondary">
              当前主题：{mode === 'dark' ? '深色' : '浅色'}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ---- 常驻侧边栏（桌面端） ---- */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: NAV_W,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: NAV_W,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'surfaceContainerLow',
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* ---- 临时抽屉（移动端） ---- */}
      <Drawer
        variant="temporary"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: NAV_W, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      {/* ---- 主区 ---- */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="default"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'transparent',
            backgroundImage: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(22,29,39,.62), rgba(22,29,39,.42))'
              : 'linear-gradient(180deg, rgba(255,255,255,.72), rgba(247,249,252,.5))',
            backdropFilter: 'blur(18px)',
          }}
        >
          <Toolbar variant="dense" sx={{ gap: 1.5 }}>
            <IconButton
              edge="start"
              onClick={() => setNavOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600, fontSize: 18 }}>
              {current.label}
            </Typography>
            {batchProgress?.total > 0 && (
              <Chip size="small" color={batchProgress.running ? 'warning' : 'success'} variant="outlined"
                label={`${batchProgress.message || '批量任务'} · ${batchProgress.done}/${batchProgress.total}`} />
            )}
            {busy && <Chip size="small" color="warning" variant="outlined" label="执行中…" />}
            <Tooltip title={streamOk ? '实时日志（已连接）' : streamState === 'connecting' ? '实时日志（连接中）' : '实时日志（未连接）'}>
              <IconButton size="small" onClick={() => setPage('login')}>
                <Badge variant="dot" color={streamOk ? 'success' : streamState === 'connecting' ? 'warning' : 'error'} overlap="circular">
                  <TerminalIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={mode === 'dark' ? '切换到浅色' : '切换到深色'}>
              <IconButton size="small" onClick={toggleMode} sx={{ display: { md: 'none' } }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <StatusChip ok={loggedIn} onClick={loggedIn ? () => setShowUserId((value) => !value) : undefined}>
              {loggedIn
                ? (showUserId ? `ID ${session.user_id}` : (session.preview?.userName || '未命名'))
                : '未登录'}
            </StatusChip>
          </Toolbar>
          {busy && <LinearProgress color="secondary" />}
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 3, px: { xs: 2, sm: 3 }, flex: 1, overflowX: 'hidden' }}>
          <Comp />
        </Container>
      </Box>

      <Snackbar
        key={toast?.id}
        open={!!toast}
        autoHideDuration={toast?.kind === 'error' ? 8000 : 4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => undefined}
      >
        <Alert severity={toast?.kind || 'info'} variant="filled" sx={{ width: '100%' }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// ★ AppProvider 只由 main.jsx 提供一次（同时喂 ThemeProvider 和 Shell）。
//   这里再包一层会出现两个独立 context：Shell 读内层、ThemeProvider 读外层，
//   切主题时只有内层变 —— 外层 mode 不动，主题永远不切换。
export default function App() {
  return <Shell />
}
