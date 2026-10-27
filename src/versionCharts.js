// 固定的版本谱面目录。旧版本曲目不会变化，因此随前端保存，
// 不在每次批量上传前手工选择。DX 谱的 musicId 已是 baseId + 10000。
import catalog from './data/version-charts.json'

export const VERSIONS = catalog.versions
export const VERSION_CHARTS = catalog.charts
export const CHART_LEVELS = [
  { id: 0, label: 'Basic' },
  { id: 1, label: 'Advanced' },
  { id: 2, label: 'Expert' },
  { id: 3, label: 'Master' },
  { id: 4, label: 'Re:Master' },
]

const LOGOS = import.meta.glob('./assets/version-logos/*.png', { eager: true, import: 'default' })

export function versionLogo(versionId) {
  return LOGOS[`./assets/version-logos/${versionId}.png`] || ''
}

export function chartsForVersion(versionId, { type = 'all', levels = [0, 1, 2, 3, 4] } = {}) {
  const version = Number(versionId)
  const allowed = new Set(levels.map(Number))
  return VERSION_CHARTS.filter((chart) => (
    chart.version === version
    && (type === 'all' || chart.type === type)
    && allowed.has(chart.level)
  ))
}
