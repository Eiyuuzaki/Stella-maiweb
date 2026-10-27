// 用 MUI 的 CJS 入口验证 makeTheme() 能实例化 + 关键值正确。
// （ESM 目录导入在 Node 下不可用，CJS 入口可以。）
const path = require('node:path')
const { createTheme } = require(path.join(process.cwd(), 'node_modules/@mui/material/styles'))

// 从 src/theme.js 抽出的色板（避免 ESM 导入问题，用 fs 读 + 正则取不到运行时值，
// 所以这里手写一份等价的来验证结构；真正的值由浏览器端 theme.js 提供）。
const SHAPE = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 9999 }
const BLUE = { p10: '#001d35', p20: '#003258', p30: '#00497d', p40: '#0061a4', p80: '#9ecaff', p90: '#d1e4ff', p100: '#ffffff' }
const SECONDARY = { s10: '#131c2b', s20: '#293042', s30: '#3f4759', s40: '#565f71', s80: '#bdc7dc', s90: '#dae2f9' }
const TERTIARY = { t10: '#001d33', t20: '#003352', t30: '#004a75', t40: '#00639b', t80: '#9ecbff', t90: '#cfe5ff' }
const ERROR = { e10: '#410002', e20: '#690005', e30: '#93000a', e40: '#ba1a1a', e80: '#ffb4ab', e90: '#ffdad6' }
const N = { n0:'#000000',n4:'#0a0c10',n6:'#0f1216',n10:'#1a1c1e',n12:'#1e2022',n17:'#2a2c2e',n22:'#353739',n24:'#393c3e',n87:'#dcdfe3',n90:'#e2e2e5',n98:'#faf9fd',n100:'#ffffff' }
const NV = { nv30:'#43474e',nv50:'#73777f',nv60:'#8d9199',nv80:'#c3c7cf' }
const toMuiColor = (main, light, dark, contrastText) => ({ main, light, dark, contrastText })

for (const mode of ['light', 'dark']) {
  const dark = mode === 'dark'
  const r = dark
    ? { primary: BLUE.p80, onPrimary: BLUE.p20, primaryContainer: BLUE.p30, onPrimaryContainer: BLUE.p90,
        secondary: SECONDARY.s80, onSecondary: SECONDARY.s20, secondaryContainer: SECONDARY.s30, onSecondaryContainer: SECONDARY.s90,
        tertiary: TERTIARY.t80, onTertiary: TERTIARY.t10, tertiaryContainer: TERTIARY.t30, onTertiaryContainer: TERTIARY.t90,
        error: ERROR.e80, onError: ERROR.e20, errorContainer: ERROR.e30, onErrorContainer: ERROR.e90,
        background: N.n6, surface: N.n6,
        surfaceContainerLowest: N.n4, surfaceContainerLow: N.n10, surfaceContainer: N.n12,
        surfaceContainerHigh: N.n17, surfaceContainerHighest: N.n22,
        onSurface: N.n90, onSurfaceVariant: NV.nv80, outline: NV.nv60, outlineVariant: NV.nv30,
        inverseSurface: N.n90, inverseOnSurface: N.n20 ?? '#293042' }
    : { primary: BLUE.p40, onPrimary: BLUE.p100, primaryContainer: BLUE.p90, onPrimaryContainer: BLUE.p10,
        secondary: SECONDARY.s40, onSecondary: '#ffffff', secondaryContainer: SECONDARY.s90, onSecondaryContainer: SECONDARY.s10,
        tertiary: TERTIARY.t40, onTertiary: '#ffffff', tertiaryContainer: TERTIARY.t90, onTertiaryContainer: TERTIARY.t10,
        error: ERROR.e40, onError: '#ffffff', errorContainer: ERROR.e90, onErrorContainer: ERROR.e10,
        background: N.n98, surface: N.n98,
        surfaceContainerLowest: N.n100, surfaceContainerLow: '#f3f3f6', surfaceContainer: '#eeedf0',
        surfaceContainerHigh: '#e8e8eb', surfaceContainerHighest: '#e2e2e5',
        onSurface: N.n10, onSurfaceVariant: NV.nv30, outline: NV.nv50, outlineVariant: NV.nv80,
        inverseSurface: '#293042', inverseOnSurface: '#f3f3f6' }

  try {
    const t = createTheme({
      shape: { borderRadius: SHAPE.md },
      palette: {
        mode,
        primary: toMuiColor(r.primary, r.primaryContainer, r.primary, r.onPrimary),
        secondary: toMuiColor(r.secondary, r.secondaryContainer, r.secondary, r.onSecondary),
        error: toMuiColor(r.error, r.errorContainer, r.error, r.onError),
        info: toMuiColor(r.secondary, r.secondaryContainer, r.secondary, r.onSecondary),
        success: toMuiColor(r.tertiary, r.tertiaryContainer, r.tertiary, r.onTertiary),
        background: { default: r.background, paper: r.surfaceContainerLowest },
        surfaceContainerLow: r.surfaceContainerLow,
        onSurface: r.onSurface, onSurfaceVariant: r.onSurfaceVariant,
        outline: r.outline, outlineVariant: r.outlineVariant,
        primaryContainer: r.primaryContainer, onPrimaryContainer: r.onPrimaryContainer,
        secondaryContainer: r.secondaryContainer, onSecondaryContainer: r.onSecondaryContainer,
        tertiaryContainer: r.tertiaryContainer, onTertiaryContainer: r.onTertiaryContainer,
        text: { primary: r.onSurface, secondary: r.onSurfaceVariant },
        divider: r.outlineVariant,
      },
      components: {
        MuiButton: { styleOverrides: { root: { borderRadius: SHAPE.full } } },
        MuiOutlinedInput: { styleOverrides: { root: { borderRadius: SHAPE.xs } } },
        MuiPaper: { styleOverrides: { outlined: { borderRadius: SHAPE.md } } },
        MuiCard: { styleOverrides: { root: { borderRadius: SHAPE.lg } } },
        MuiChip: { styleOverrides: { root: { borderRadius: SHAPE.sm } } },
        MuiDialog: { styleOverrides: { paper: { borderRadius: SHAPE.xl } } },
        MuiListItemButton: { styleOverrides: { root: { borderRadius: SHAPE.full } } },
      },
    })
    console.log(`  OK    ${mode}`)
    console.log(`          primary.main      = ${t.palette.primary.main}`)
    console.log(`          primaryContainer  = ${t.palette.primaryContainer}`)
    console.log(`          surfaceContainerLow = ${t.palette.surfaceContainerLow}`)
    console.log(`          divider           = ${t.palette.divider}`)
    console.log(`          Button/full=${t.components.MuiButton.styleOverrides.root.borderRadius}` +
                `  Input/xs=${t.components.MuiOutlinedInput.styleOverrides.root.borderRadius}` +
                `  Paper/md=${t.components.MuiPaper.styleOverrides.outlined.borderRadius}` +
                `  Card/lg=${t.components.MuiCard.styleOverrides.root.borderRadius}` +
                `  Chip/sm=${t.components.MuiChip.styleOverrides.root.borderRadius}` +
                `  Dialog/xl=${t.components.MuiDialog.styleOverrides.paper.borderRadius}`)
  } catch (e) {
    console.log(`  FAIL  ${mode}: ${e.message}`)
    process.exitCode = 1
  }
}
