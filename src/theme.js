// Material Design 3 主题。
//
// MD3 与 MUI 默认配色的关键差异：
//   1. **颜色角色（color roles）** —— 不用「primary/secondary 各一个色」，
//      而是 primary / on-primary / primary-container / on-primary-container 成套出现，
//      表面色也分成 surface / surface-container-low / -high / -highest 的层次。
//   2. **状态层** —— hover/pressed 用 8% / 12% 的 on-surface 叠加，不是换背景色。
//   3. **字阶** —— display / headline / title / body / label 五档，层级靠字号+字重区分。
//   4. **圆角有明确规范**（m3.material.io/styles/shape）：
//        none 0 · extra-small 4 · small 8 · medium 12 · large 16 · extra-large 28 · full 9999
//      对应到组件：按钮/Chip/FAB = full，卡片/对话框 = 12/28，
//      **文本框 outlined = 4dp**（不是 12），搜索栏 = 28。
//
// 参考：https://m3.material.io/styles/color/roles · https://m3.material.io/styles/shape
import { createTheme } from '@mui/material/styles'

const FONT =
  '"Stella UI", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'
const MONO = 'Consolas, "Cascadia Mono", "Courier New", monospace'

// MD3 圆角刻度（shape scale）
const SHAPE = {
  none: 0,
  xs: 4,      // extra-small：文本框 outlined、小按钮
  sm: 8,      // small：Chip、小卡片、Tooltip
  md: 12,     // medium：卡片、菜单
  lg: 16,     // large：侧边栏、大卡片
  xl: 28,     // extra-large：对话框、搜索栏
  full: 9999, // 按钮、FAB、Switch
}

// ---------------------------------------------------------------------------
// MD3 基线色板 —— 主色用 Material 3 默认蓝（tone 40 = #0061A4）
// ---------------------------------------------------------------------------

// 主色：MD3 baseline blue（P10 / P20 / P30 / P40 / P80 / P90 / P100）
const BLUE = {
  p10: '#001d35', p20: '#003258', p30: '#00497d', p40: '#0061a4',
  p80: '#9ecaff', p90: '#d1e4ff', p100: '#ffffff',
}
// 次色：MD3 baseline 的 secondary（蓝灰，S40 = #565f71）
const SECONDARY = {
  s10: '#131c2b', s20: '#293042', s30: '#3f4759', s40: '#565f71',
  s80: '#bdc7dc', s90: '#dae2f9',
}
// 第三色：青蓝（T40 = #00639b）
const TERTIARY = {
  t10: '#001d33', t20: '#003352', t30: '#004a75', t40: '#00639b',
  t80: '#9ecbff', t90: '#cfe5ff',
}
const ERROR = {
  e10: '#410002', e20: '#690005', e30: '#93000a', e40: '#ba1a1a',
  e80: '#ffb4ab', e90: '#ffdad6',
}
// 中性色带极轻的蓝调（MD3 baseline neutral variant 是冷灰）
const NEUTRAL = {
  n0: '#000000',
  n4: '#0a0c10',
  n6: '#0f1216',
  n10: '#1a1c1e',
  n12: '#1e2022',
  n17: '#2a2c2e',
  n22: '#353739',
  n24: '#393c3e',
  n87: '#dcdfe3',
  n90: '#e2e2e5',
  n92: '#e8e8eb',
  n94: '#eeedf0',
  n96: '#f3f3f6',
  n98: '#faf9fd',
  n100: '#ffffff',
}
const NEUTRAL_VARIANT = {
  nv30: '#43474e', nv50: '#73777f', nv60: '#8d9199', nv80: '#c3c7cf',
  nv90: '#e2e2e5',
}

function roles(mode) {
  const dark = mode === 'dark'
  if (dark) {
    return {
      primary: BLUE.p80, onPrimary: BLUE.p20, primaryContainer: BLUE.p30, onPrimaryContainer: BLUE.p90,
      secondary: SECONDARY.s80, onSecondary: SECONDARY.s20, secondaryContainer: SECONDARY.s30, onSecondaryContainer: SECONDARY.s90,
      tertiary: TERTIARY.t80, onTertiary: TERTIARY.t10, tertiaryContainer: TERTIARY.t30, onTertiaryContainer: TERTIARY.t90,
      error: ERROR.e80, onError: ERROR.e20, errorContainer: ERROR.e30, onErrorContainer: ERROR.e90,
      background: NEUTRAL.n6,
      surface: NEUTRAL.n6,
      surfaceDim: NEUTRAL.n6,
      surfaceBright: NEUTRAL.n24,
      surfaceContainerLowest: NEUTRAL.n4,
      surfaceContainerLow: NEUTRAL.n10,
      surfaceContainer: NEUTRAL.n12,
      surfaceContainerHigh: NEUTRAL.n17,
      surfaceContainerHighest: NEUTRAL.n22,
      onSurface: NEUTRAL.n90,
      onSurfaceVariant: NEUTRAL_VARIANT.nv80,
      outline: NEUTRAL_VARIANT.nv60,
      outlineVariant: NEUTRAL_VARIANT.nv30,
      inverseSurface: NEUTRAL.n90,
      inverseOnSurface: NEUTRAL.n20,
      shadow: NEUTRAL.n0,
      // 面板（日志 / JSON）用最低层表面 + 边框
      panel: NEUTRAL.n4,
      panelBorder: NEUTRAL_VARIANT.nv30,
      panelText: NEUTRAL.n87,
    }
  }
  return {
    primary: BLUE.p40, onPrimary: BLUE.p100, primaryContainer: BLUE.p90, onPrimaryContainer: BLUE.p10,
    secondary: SECONDARY.s40, onSecondary: '#ffffff', secondaryContainer: SECONDARY.s90, onSecondaryContainer: SECONDARY.s10,
    tertiary: TERTIARY.t40, onTertiary: '#ffffff', tertiaryContainer: TERTIARY.t90, onTertiaryContainer: TERTIARY.t10,
    error: ERROR.e40, onError: '#ffffff', errorContainer: ERROR.e90, onErrorContainer: ERROR.e10,
    background: NEUTRAL.n98,
    surface: NEUTRAL.n98,
    surfaceDim: NEUTRAL.n87,
    surfaceBright: NEUTRAL.n98,
    surfaceContainerLowest: NEUTRAL.n100,
    surfaceContainerLow: NEUTRAL.n96,
    surfaceContainer: NEUTRAL.n94,
    surfaceContainerHigh: NEUTRAL.n92,
    surfaceContainerHighest: NEUTRAL.n90,
    onSurface: NEUTRAL.n10,
    onSurfaceVariant: NEUTRAL_VARIANT.nv30,
    outline: NEUTRAL_VARIANT.nv50,
    outlineVariant: NEUTRAL_VARIANT.nv80,
    inverseSurface: NEUTRAL.n20,
    inverseOnSurface: NEUTRAL.n96,
    shadow: NEUTRAL.n0,
    panel: NEUTRAL.n100,
    panelBorder: NEUTRAL_VARIANT.nv80,
    panelText: NEUTRAL.n10,
  }
}

// 把 MD3 的「扁平角色色」转成 MUI palette 期望的结构。
// MUI 的 palette.primary 必须是 { main, light, dark, contrastText } 对象，
// 直接塞字符串会抛 "The color (primary) provided to augmentColor(color) is invalid"。
function toMuiColor(main, light, dark, contrastText) {
  return { main, light, dark, contrastText }
}

export function makeTheme(mode) {
  const r = roles(mode)
  const dark = mode === 'dark'

  return createTheme({
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: FONT,
      fontSize: 14,
      h1: { fontSize: 36, fontWeight: 500, lineHeight: 1.25, letterSpacing: 0 },
      h2: { fontSize: 28, fontWeight: 400, lineHeight: 1.29 },
      h3: { fontSize: 24, fontWeight: 400, lineHeight: 1.33 },
      h4: { fontSize: 22, fontWeight: 400, lineHeight: 1.27 },
      h5: { fontSize: 20, fontWeight: 500, lineHeight: 1.3 },
      h6: { fontSize: 18, fontWeight: 500, lineHeight: 1.33 },
      subtitle1: { fontSize: 16, fontWeight: 500, lineHeight: 1.5, letterSpacing: 0.15 },
      subtitle2: { fontSize: 14, fontWeight: 500, lineHeight: 1.43, letterSpacing: 0.1 },
      body1: { fontSize: 16, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0.5 },
      body2: { fontSize: 14, fontWeight: 400, lineHeight: 1.43, letterSpacing: 0.25 },
      caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.33, letterSpacing: 0.4 },
      overline: { fontSize: 11, fontWeight: 500, lineHeight: 1.45, letterSpacing: 0.5 },
      button: { fontSize: 14, fontWeight: 500, letterSpacing: 0.1, textTransform: 'none' },
    },
    palette: {
      mode,
      // ---- MUI 需要的颜色对象结构 ----
      primary: toMuiColor(r.primary, r.primaryContainer, r.primary, r.onPrimary),
      secondary: toMuiColor(r.secondary, r.secondaryContainer, r.secondary, r.onSecondary),
      error: toMuiColor(r.error, r.errorContainer, r.error, r.onError),
      warning: toMuiColor(dark ? '#ffdeA8' : '#ed6c02', dark ? '#4a2f00' : '#ffdeA8',
                          dark ? '#ffdeA8' : '#4a2f00', dark ? '#4a2f00' : '#ffffff'),
      info: toMuiColor(r.secondary, r.secondaryContainer, r.secondary, r.onSecondary),
      success: toMuiColor(r.tertiary, r.tertiaryContainer, r.tertiary, r.onTertiary),
      // ---- MD3 表面体系（MUI v6 原生支持这些自定义字段）----
      background: { default: r.background, paper: r.surfaceContainerLowest },
      surface: r.surface,
      surfaceContainerLowest: r.surfaceContainerLowest,
      surfaceContainerLow: r.surfaceContainerLow,
      surfaceContainer: r.surfaceContainer,
      surfaceContainerHigh: r.surfaceContainerHigh,
      surfaceContainerHighest: r.surfaceContainerHighest,
      onSurface: r.onSurface,
      onSurfaceVariant: r.onSurfaceVariant,
      outline: r.outline,
      outlineVariant: r.outlineVariant,
      primaryContainer: r.primaryContainer,
      onPrimaryContainer: r.onPrimaryContainer,
      secondaryContainer: r.secondaryContainer,
      onSecondaryContainer: r.onSecondaryContainer,
      tertiaryContainer: r.tertiaryContainer,
      onTertiaryContainer: r.onTertiaryContainer,
      errorContainer: r.errorContainer,
      onErrorContainer: r.onErrorContainer,
      inverseSurface: r.inverseSurface,
      inverseOnSurface: r.inverseOnSurface,
      // ---- text / action / divider ----
      text: { primary: r.onSurface, secondary: r.onSurfaceVariant },
      action: {
        hover: dark ? 'rgba(230,224,233,0.08)' : 'rgba(29,27,32,0.08)',
        selected: dark ? 'rgba(255,177,200,0.16)' : 'rgba(161,65,102,0.12)',
        disabledBackground: dark ? 'rgba(230,224,233,0.12)' : 'rgba(29,27,32,0.12)',
      },
      divider: r.outlineVariant,
    },
    components: {
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: dark ? r.surfaceContainerHighest : r.surfaceContainerLowest,
              '& fieldset': { borderColor: r.outlineVariant },
              '&:hover fieldset': { borderColor: r.outline },
              '&.Mui-focused fieldset': { borderColor: r.primary, borderWidth: 2 },
            },
            // ★ label 配平：small 输入框（高 36px）的浮起标签应为 13px。
            //   不配平时 label 16px 会比输入框还高，视觉上"文字下沉、压住边框"。
            '& .MuiInputLabel-root': {
              fontSize: 13.5,
              // ★ 浮起后必须有底衬色，否则透明的 label 文字会和 fieldset 边框线
              //   重叠（看起来像字骑在线上）。底衬色 = 输入框自己的背景色。
              '&.MuiInputLabel-shrink': {
                fontSize: 12,
                backgroundColor: dark ? r.surfaceContainerHighest : r.surfaceContainerLowest,
                padding: '0 5px',
                margin: '-1px 0',
                borderRadius: '4px',
              },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {},
          // ★ 只调字号，不动 padding —— MUI size=small 的输入框自带 40px 高度和
          //   与之匹配的 label 浮起位移量；手动覆盖 padding 会把高度压到 36px，
          //   导致浮起 label 骑不到边框上（视觉上"文字超出框顶"）。
          input: { fontSize: 13.5 },
        },
      },
      // InputLabel 全局配平（有 defaultProps 之外的直接用 MuiInputLabel 的场景）
      MuiInputLabel: {
        styleOverrides: {
          root: { fontSize: '13.5px' },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: { backgroundImage: 'none', border: '1px solid ' + r.outlineVariant },
        },
      },
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: { fontWeight: 500 },
          outlined: {
            borderColor: r.outlineVariant,
            backgroundColor: 'transparent',
            color: r.onSurface,
            '& .MuiChip-icon': { color: r.onSurfaceVariant },
            '&:hover': {
              backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderColor: r.outlineVariant,
            },
          },
        },
      },
      // MD3 表格行 hover 用状态层
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '6px 12px', borderBottom: '1px solid ' + r.outlineVariant },
          head: {
            fontWeight: 600,
            color: r.onSurfaceVariant,
            backgroundColor: r.surfaceContainerLow,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: dark ? 'rgba(226,226,229,0.06)' : 'rgba(26,28,30,0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: dark ? 'rgba(158,202,255,0.16)' : 'rgba(0,97,164,0.10)',
            },
          },
        },
      },
      // MD3 AppBar：surface 色而非 primary 色
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundColor: r.surfaceContainer, color: r.onSurface },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            marginInline: 8,
            borderRadius: 8,
            '&.Mui-selected': {
              backgroundColor: dark ? 'rgba(158,202,255,0.16)' : 'rgba(0,97,164,0.10)',
              '&:hover': { backgroundColor: dark ? 'rgba(158,202,255,0.22)' : 'rgba(0,97,164,0.14)' },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {},
          standardInfo: { backgroundColor: r.secondaryContainer, color: r.onSecondaryContainer },
          standardSuccess: { backgroundColor: r.tertiaryContainer, color: r.onTertiaryContainer },
          standardWarning: { backgroundColor: dark ? '#4a2f00' : '#ffdeA8', color: dark ? '#ffdeA8' : '#4a2f00' },
          standardError: { backgroundColor: r.errorContainer, color: r.onErrorContainer },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
      MuiDialogContent: { styleOverrides: { root: { paddingTop: 20 } } },
      // MD3：对话框文字一律左对齐（对话框本身居中）。显式声明，
      // 防止任何局部样式把 DialogTitle / DialogContentText 带成居中。
      MuiDialogTitle: { styleOverrides: { root: { textAlign: 'left' } } },
      MuiDialogContentText: { styleOverrides: { root: { textAlign: 'left' } } },
      // ============================================================================
      // Switch —— 高识别度开关
      // ============================================================================
      // 设计要点：
      //   1. 【对比度】thumb 永远纯白 #FFF，track 深色（OFF 浅灰蓝 / ON 深蓝）
      //   2. 【比例】track 44×24、thumb 20×20 正圆
      //   3. 【间距】thumb 距轨道边缘恒 2px（padding:2 + translateX 精确控制）
      //   4. 【实体感】thumb 带阴影；滑动 0.25s ease
      // ★ 本组件只有一个 MuiSwitch 键 —— 之前拆成两个同名键导致后者覆盖前者
      //   （trackRadius 变回默认 7px、thumb 颜色丢失），全部合并于此。
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 44,
            height: 24,
            padding: 0,
            borderRadius: 999,
          },
          track: {
            borderRadius: 999,
            // OFF 态轨道：浅色下用中灰蓝（与白 thumb 对比明显，又不抢眼）
            backgroundColor: dark ? r.surfaceContainerHighest : '#93a4bd',
            opacity: 1,
            transition: 'background-color 0.25s ease',
            boxSizing: 'border-box',
          },
          switchBase: {
            padding: 2,                      // thumb 距轨道边缘恒 2px
            transition: 'transform 0.25s ease',
            '& .MuiSwitch-thumb': {
              width: 20,
              height: 20,
              borderRadius: '50%',
              // thumb 永远纯白 —— backgroundColor 直接指定（MUI 默认是
              // currentColor，会继承父级 color 变成蓝色）
              backgroundColor: '#ffffff',
              color: '#ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 0 1px 0 rgba(0,0,0,0.15)',
              transition: 'all 0.25s ease',
            },
            '&.Mui-checked': {
              // 位移 = 44 - 2×2 - 20 = 20px
              transform: 'translateX(20px)',
            },
            // ON 态轨道：深蓝（写在这里依赖 switchBase 与 track 的兄弟关系，
            // 且必须同时覆盖默认 colorPrimary 的同型规则 —— 用 !important 兜底
            // 是因为 MUI v6 会为 colorPrimary 生成一条相同选择器的规则）
            '&.Mui-checked + .MuiSwitch-track': {
              backgroundColor: dark ? r.primary : '#0d47a1',
              opacity: 1,
            },
          },
          // 官方 colorPrimary 插槽：与上面等价，双保险保证优先级
          colorPrimary: {
            '&.Mui-checked + .MuiSwitch-track': {
              backgroundColor: dark ? r.primary : '#0d47a1',
              opacity: 1,
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: r.outlineVariant } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: SHAPE.sm,
            backgroundColor: r.inverseSurface,
            color: r.inverseOnSurface,
            fontSize: 12,
            padding: '6px 10px',
            maxWidth: 320,
          },
        },
      },
      MuiLinearProgress: { styleOverrides: { root: { height: 3, borderRadius: SHAPE.xs } } },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: r.surface,
            fontFamily: FONT,
            WebkitFontSmoothing: 'antialiased',
          },
          // 等宽面板变量（日志 / JSON）
          ':root': { '--mono': MONO, '--panel': r.panel, '--panel-border': r.panelBorder },
          code: {
            fontFamily: MONO,
            fontSize: '0.92em',
            backgroundColor: dark ? r.surfaceContainerHighest : r.surfaceContainer,
            padding: '1px 5px',
            borderRadius: SHAPE.xs,
          },
        },
      },
    },
  })
}

// 日志 / 报文面板配色（MD3：最低层表面 + outline 边框 + 语义色文字）
export function logColors(mode) {
  const r = roles(mode)
  const dark = mode === 'dark'
  return {
    panelBg: r.panel,
    panelBorder: r.panelBorder,
    panelText: r.panelText,
    time: dark ? NEUTRAL_VARIANT.nv60 : NEUTRAL_VARIANT.nv50,
    banner: dark ? BLUE.p80 : BLUE.p30,       // === xxx 开始运行 ===
    request: dark ? SECONDARY.s80 : SECONDARY.s30,   // -> 请求
    response: dark ? TERTIARY.t80 : TERTIARY.t30,    // <- 响应
    error: dark ? ERROR.e80 : ERROR.e40,
    warn: dark ? '#ffdeA8' : '#7a4b00',
  }
}

export { MONO, FONT, roles, SHAPE }
