// DX 星级按 DX 分 / (3×物量) 分档。每一档都取闭区间，
// 上限停在下一档之前，避免四星被写成五星理论值。
const LOWER = { 5: 0.97, 4: 0.94, 3: 0.88, 2: 0.80, 1: 0.50, 0: 0 }

export function starBounds(star, totalNotes) {
  const theory = Math.max(0, Number(totalNotes) || 0) * 3
  const level = Number(star)
  const lowerRatio = LOWER[level] ?? 0.97
  const upperRatio = { 4: 0.97, 3: 0.94, 2: 0.88, 1: 0.80, 0: 0.50 }[level]
  const min = Math.ceil(theory * lowerRatio)
  const max = upperRatio == null ? Math.max(min, theory - 1) : Math.max(min, Math.ceil(theory * upperRatio) - 1)
  return { min, max, theory }
}

export function dxForStar(star, totalNotes) {
  return starBounds(star, totalNotes).min
}

export function randomDxForStar(star, totalNotes) {
  const { min, max } = starBounds(star, totalNotes)
  return min + Math.floor(Math.random() * (max - min + 1))
}

// 101% 要求全部 Break 保持 Critical Perfect。非 Break 的 Critical Perfect
// 与 Perfect 基础分相同，所以只把非 Break 降成 Perfect 来落到目标 DX 分。
export function judgesForDx(notes, targetDx, type) {
  const names = ['tap', 'hold', 'slide', 'touch', 'break']
  const counts = Object.fromEntries(names.map((name) => [
    name, name === 'touch' && type !== 'dx' ? 0 : Number(notes?.[name]) || 0,
  ]))
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const theory = total * 3
  const dx = Math.min(theory, Math.max(0, Number(targetDx) || 0))
  let perfects = theory - dx
  const judges = {}
  for (const name of names) {
    const count = counts[name]
    const perfect = name === 'break' ? 0 : Math.min(count, perfects)
    perfects -= perfect
    judges[name] = {
      CriticalPerfect: count - perfect,
      Perfect: perfect,
      Great: 0,
      Good: 0,
      Miss: 0,
    }
  }
  return judges
}
