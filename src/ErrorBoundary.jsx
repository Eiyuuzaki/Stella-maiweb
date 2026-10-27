// 在浏览器侧加一个「顶层错误边界 + 全局错误捕获」，把白屏变成可见的错误信息。
// 这是修复白屏的第一步：先让错误现身。
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    // 同时打到控制台，方便复制
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      const e = this.state.error
      return (
        <div style={{
          padding: 24, fontFamily: 'Consolas, monospace', fontSize: 13,
          color: '#ffb4ab', background: '#410002', minHeight: '100vh',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            ⚠ 前端崩溃了（错误边界已捕获）
          </div>
          <div style={{ marginBottom: 12 }}>
            <b>{e.name}: </b>{e.message}
          </div>
          {e.stack && (
            <div style={{ opacity: 0.85, fontSize: 11.5 }}>
              {e.stack.split('\n').slice(0, 12).join('\n')}
            </div>
          )}
          {this.state.info?.componentStack && (
            <div style={{ opacity: 0.7, fontSize: 11.5, marginTop: 12 }}>
              组件栈:{'\n'}{this.state.info.componentStack.split('\n').slice(0, 10).join('\n')}
            </div>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
