// 关于页。Stella 是这个项目，Astral 只是它背后的协议库。
import React from 'react'
import { Box, Button, Paper, Stack, Typography, useTheme } from '@mui/material'
import './about-font.css'

const VERSION = '0.1.0'
const WENKAI = '"LXGW WenKai About", "Segoe UI", sans-serif'
const TITLE = '"Stella Title", "Segoe UI", sans-serif'
const DUST = [
  [7, 16, 1.1], [14, 58, 1], [24, 30, 1.4], [38, 74, 1], [52, 18, 1.2],
  [66, 46, 1], [78, 12, 1.5], [86, 66, 1], [93, 36, 1], [18, 84, 1.2],
  [44, 10, 1], [58, 88, 1.1], [72, 82, 1], [30, 48, 1],
]
const FACTS = [
  ['Stella', '这个独立项目。登录、成绩、批量任务和进度都在这里完成。'],
  ['Astral', '背后的协议库。它负责通信，不是产品名称。'],
  ['前端', '负责界面、流程和等待。协议组包仍由后端完成。'],
]
function LineIcon({ children }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      {children}
    </Box>
  )
}
const GitHubMark = () => <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.6a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1.1-.3-3.5 1.3a12.2 12.2 0 0 0-6.2 0C6.2 1.8 5.1 2.1 5.1 2.1a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 3.7 8.7c0 5.1 3.1 6.3 6.1 6.6a3.4 3.4 0 0 0-.9 2.6V22" />
const ScaleMark = () => <><path d="M12 3v18" /><path d="M3 7h18" /><path d="M6 7l-3 6h6z" /><path d="M18 7l-3 6h6z" /></>
const CodeMark = () => <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />
const AtomMark = () => <><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" /></>
const LayoutMark = () => <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="16" height="7" rx="1" /></>
const BoltMark = () => <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
const TypeMark = () => <><path d="M5 7V5h14v2" /><path d="M12 5v14" /><path d="M9 19h6" /></>
const META_CHIPS = [
  ['AGPL-3.0', <ScaleMark />],
  ['JavaScript', <CodeMark />],
  ['React', <AtomMark />],
  ['MUI', <LayoutMark />],
  ['Vite', <BoltMark />],
  ['SIL OFL 1.1', <TypeMark />],
]
const FEATURES = [
  ['版本批量', '按版本、谱面和难度分批上传，每批最多四首。'],
  ['连续续关', '每局结束后自动续关，并替换新的登录凭证。'],
  ['成绩推导', '达成率、AP 和 DX 星由同一份判定计算，不会互相矛盾。'],
  ['延迟回查', '返回成功不算写上，下一局开始后再逐首核对上一局。'],
  ['跨设备进度', '任务进度保存在后端，手机打开任意页面也能看到。'],
]
const DISCLAIMER = [
  'Stella 只是一个 Web 控制台，不是发包工具或协议实现。实际登录、上传、解锁、续关和登出均由独立的 Astral 协议库执行，相关通信行为与 Stella 项目无关。',
  'Stella 不是游戏官方软件，与游戏开发商、运营方、机台厂商、Astral 及其作者和任何第三方没有任何合作、授权、附属或背书关系。',
  'Astral 发出的请求可能立即、永久且不可撤销地修改真实服务器上的账号、成绩、道具、登录状态或其他资料。服务器返回成功不代表数据一定按预期保存。',
  '使用 Stella 调用 Astral 或其他外部组件，可能导致登录限制、成绩异常、数据覆盖、功能失效、账号封禁或其他未知后果。使用者自行选择、配置、确认并承担全部责任。',
  '开发者和贡献者不提供可用性、安全性、准确性、连续性或不中断运行的保证，也不对直接、间接、偶然、特殊或后果性损失承担责任，包括数据损失、账号损失、收益损失和设备损失。',
  '使用者必须遵守所在地法律、游戏服务条款、机台场所规则及适用的第三方许可。不得利用本项目干扰服务、侵犯他人账号或从事任何违法违规活动。若不能接受上述风险，请立即停止使用。',
]

export default function AboutPage() {
  const dark = useTheme().palette.mode === 'dark'
  const ink = dark ? '#d6e4f0' : '#102033'
  const mute = dark ? 'rgba(214,228,240,.64)' : 'rgba(16,32,51,.62)'
  const line = dark ? 'rgba(158,202,255,.4)' : 'rgba(0,97,164,.35)'
  const sky = dark
    ? 'radial-gradient(70% 80% at 28% 42%, #1d4d78 0%, #101820 62%)'
    : 'radial-gradient(70% 80% at 28% 38%, #d7e9ff 0%, #f7f9fc 64%)'

  return (
    <Stack spacing={2.5}>
      <Box sx={{
        position: 'relative', height: { xs: 360, sm: 400 }, borderRadius: '12px',
        overflow: 'hidden', border: '1px solid', borderColor: 'outlineVariant', background: sky,
        fontFamily: '"LXGW WenKai About", "Segoe UI", sans-serif',
      }}>
        {DUST.map(([x, y, r], i) => (
          <Box key={i} sx={{
            position: 'absolute', left: x + '%', top: y + '%', width: r * 2, height: r * 2,
            borderRadius: '50%', bgcolor: ink, opacity: 0.28,
          }} />
        ))}
        <Box component="svg" viewBox="0 0 760 300" preserveAspectRatio="xMidYMid meet"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: { xs: 'none', sm: 'block' } }}>
          <SkyPath color={dark ? '#9ecaff' : '#0061a4'} small={dark ? '#8aa0b8' : '#8d9199'} line={line}
            d="M275 156 C 380 70, 500 230, 600 108" ax="275" ay="156" bx="600" by="108" />
        </Box>
        <Box component="svg" viewBox="0 0 390 360" preserveAspectRatio="xMidYMid meet"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: { xs: 'block', sm: 'none' } }}>
          <SkyPath color={dark ? '#9ecaff' : '#0061a4'} small={dark ? '#8aa0b8' : '#8d9199'} line={line}
            d="M168 118 C 220 60, 260 150, 292 86" ax="168" ay="118" bx="292" by="86" />
        </Box>

        <Box sx={{ position: 'absolute', left: { xs: 18, sm: 48 }, top: { xs: 104, sm: 116 }, right: { xs: 92, sm: 'auto' } }}>
          <Typography fontFamily={WENKAI} sx={{ fontSize: 13, letterSpacing: 2, color: mute }}>ステラ</Typography>
          <Typography fontFamily={TITLE} sx={{
            mt: 0.5, fontSize: { xs: 44, sm: 64 }, fontWeight: 600, letterSpacing: 0,
            color: ink, lineHeight: 0.9,
          }}>Stella</Typography>
          <Typography fontFamily={WENKAI} sx={{ mt: 1.25, fontSize: 15, color: mute }}>舞萌 DX 的 Web 控制台</Typography>
        </Box>

        <Box sx={{ position: 'absolute', right: { xs: 16, sm: 32 }, top: { xs: 58, sm: 66 }, textAlign: 'right' }}>
          <Typography fontFamily={WENKAI} sx={{ fontSize: 13, color: mute }}>Astral</Typography>
          <Typography fontFamily={WENKAI} sx={{ fontSize: 11, letterSpacing: 1, color: mute }}>背后的协议库</Typography>
        </Box>

        <Box sx={{ position: 'absolute', left: { xs: 24, sm: 48 }, bottom: 24, right: 24 }}>
          <Typography fontFamily={WENKAI} sx={{ fontSize: 16, fontWeight: 600, color: ink, lineHeight: 1.6 }}>
            夜空一直在等待着被点亮的那一天。
          </Typography>
          <Typography fontFamily={WENKAI} sx={{ mt: 0.4, fontSize: 12, color: mute }}>
            {'— じん《ステラ》'}
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
        <Button variant="outlined" startIcon={<LineIcon><GitHubMark /></LineIcon>} href="https://github.com/Eiyuuzaki/Stella-maiweb" target="_blank" rel="noreferrer">GitHub</Button>
        {META_CHIPS.map(([label, icon]) => (
          <Button key={label} variant="outlined" startIcon={<LineIcon>{icon}</LineIcon>}>{label}</Button>
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px' }}>
        <Stack spacing={2.5}>
          {FACTS.map(([title, text]) => (
            <Box key={title}>
              <Typography fontFamily={WENKAI} sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>{title}</Typography>
              <Typography fontFamily={WENKAI} sx={{ mt: 0.5, fontSize: 15, lineHeight: 1.8, color: 'text.secondary' }}>{text}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px' }}>
        <Typography fontFamily={WENKAI} sx={{ mb: 2, fontSize: 20, fontWeight: 600 }}>项目特色</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {FEATURES.map(([title, text]) => (
            <Box key={title}>
              <Typography fontFamily={WENKAI} sx={{ fontSize: 17, fontWeight: 600 }}>{title}</Typography>
              <Typography fontFamily={WENKAI} sx={{ mt: 0.4, fontSize: 14, lineHeight: 1.8, color: 'text.secondary' }}>{text}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', borderColor: 'warning.main' }}>
        <Typography fontFamily={WENKAI} sx={{ mb: 1.5, fontSize: 20, fontWeight: 700, color: 'warning.dark' }}>免责声明</Typography>
        <Stack spacing={1.4}>
          {DISCLAIMER.map((text) => (
            <Typography key={text} fontFamily={WENKAI} sx={{ fontSize: 14, lineHeight: 1.85, color: 'text.secondary' }}>{text}</Typography>
          ))}
        </Stack>
      </Paper>
    </Stack>
  )
}

function SkyPath({ color, small, line, d, ax, ay, bx, by }) {
  const pathId = React.useId().replace(/:/g, '')
  return (
    <g>
      <path id={pathId} d={d} fill="none" stroke={line} strokeWidth="1.2" strokeDasharray="2 8" />
      <g>
        <animateMotion dur="32s" repeatCount="indefinite" rotate="0" calcMode="spline"
          keyPoints="0;1;0" keyTimes="0;0.5;1"
          keySplines="0.42 0 0.58 1;0.42 0 0.58 1">
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <Glow cx={0} cy={0} color={color} />
      </g>
      <Glow cx={bx} cy={by} color={small} small />
    </g>
  )
}

function Glow({ cx, cy, color, small }) {
  const r = small ? 3 : 9
  // 只动画透明度，不移动、不缩放、不加模糊。
  // 浏览器离开页面时会暂停 CSS 动画，所以后台没有持续开销。
  return (
    <g style={{
      transformOrigin: `${cx}px ${cy}px`,
      animation: `${small ? 'stella-star-small' : 'stella-star'} 7s ease-in-out infinite`,
    }}>
      <circle cx={cx} cy={cy} r={r * 3.2} fill={color} opacity={small ? 0.1 : 0.16} />
      <circle cx={cx} cy={cy} r={r * 1.8} fill={color} opacity={small ? 0.18 : 0.3} />
      <circle cx={cx} cy={cy} r={r} fill={color} />
    </g>
  )
}
