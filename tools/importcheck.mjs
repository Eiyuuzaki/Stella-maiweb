// 静态核对：每个 src 文件 import 的命名，在目标模块里是否真的存在。
// 白屏最常见的原因就是 import 了一个不存在的命名（浏览器里表现为
// "The requested module does not provide an export named 'X'"，然后整个树挂掉）。
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.join(process.cwd(), 'src')
const files = fs.readdirSync(SRC).filter((f) => /\.(jsx?|mjs)$/.test(f))

// 已知的全局/外部模块
const BUILTINS = new Set(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'])

// 收集每个本地模块导出的命名
function exportsOf(file) {
  const text = fs.readFileSync(file, 'utf8')
  const names = new Set()
  // export function X / export const X / export class X
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1])
  for (const m of text.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1])
  // export { a, b as c }
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const as = part.split(/\bas\b/)
      names.add((as[1] || as[0]).trim())
    }
  }
  // export default
  if (/^export\s+default/m.test(text)) names.add('default')
  // re-export
  for (const m of text.matchAll(/^export\s+\*\s+from\s+['"]([^'"]+)['"]/gm)) names.add('*')
  return names
}

const cache = new Map()
function getExports(rel) {
  if (cache.has(rel)) return cache.get(rel)
  let names = new Set()
  const abs = path.join(SRC, rel)
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    names = exportsOf(abs)
  } else {
    // 可能是 node_modules 包或 @mui —— 跳过（我们只核对项目内相对导入）
    names = null
  }
  cache.set(rel, names)
  return names
}

let problems = 0
for (const f of files) {
  const text = fs.readFileSync(path.join(SRC, f), 'utf8')
  const importRe = /import\s+(?:([A-Za-z_$][\w$]*)\s*,\s*)?(?:\{([^}]*)\}|\*\s+as\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))?\s*from\s*['"]([^'"]+)['"]/g
  for (const m of text.matchAll(importRe)) {
    const named = m[2]
    const star = m[3]
    const dflt = m[4] || m[1]
    const src = m[5]
    if (!src.startsWith('.')) continue          // 只核对相对导入
    const rel = src.replace(/^\.\//, '')
    const ex = getExports(rel)
    if (ex === null) { console.log(`  ?? ${f}: 找不到本地模块 ${src}`); continue }
    if (ex.has('*')) continue

    if (named) {
      for (const part of named.split(',')) {
        const raw = part.split(/\bas\b/)[0].trim()
        if (!raw) continue
        if (!ex.has(raw)) {
          problems++
          console.log(`  ✗ ${f}  import { ${raw} } from '${src}'  —— ${rel} 没有导出它`)
          console.log(`      ${rel} 实际导出: ${[...ex].join(', ') || '(无)'}`)
        }
      }
    }
    if (dflt && !named && !star && !ex.has('default') && !ex.has(dflt)) {
      problems++
      console.log(`  ✗ ${f}  import ${dflt} from '${src}'  —— ${rel} 没有 default 导出`)
    }
  }
}
console.log(problems === 0 ? '=== 相对导入全部对得上 ===' : `=== ${problems} 处导入不匹配 ===`)
