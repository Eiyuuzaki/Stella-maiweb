// 屏幕取景扫码。
//
// 之前依赖浏览器原生 BarcodeDetector，Chrome 155 这类内核没有它，
// 按钮直接被藏掉。现在用 jsQR 解码，只要浏览器能分享屏幕就显示按钮。
import jsQR from 'jsqr'

export function isScreenCaptureSupported() {
  return typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getDisplayMedia
}

/**
 * 弹出浏览器的「选择要共享的屏幕/窗口」，在该画面里持续找二维码。
 * 命中后返回二维码内容字符串，并停止共享。
 */
export async function scanScreen(signal) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 10 },
    audio: false,
  })

  const cleanup = () => stream.getTracks().forEach((t) => t.stop())
  signal?.addEventListener('abort', () => { cleanup() }, { once: true })
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    signal?.abort()
  }, { once: true })

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  await video.play()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(timer)
        cleanup()
        reject(new DOMException('\u5df2\u53d6\u6d88', 'AbortError'))
        return
      }
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) return
      canvas.width = w
      canvas.height = h
      ctx.drawImage(video, 0, 0, w, h)
      const image = ctx.getImageData(0, 0, w, h)
      const code = jsQR(image.data, w, h, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        clearInterval(timer)
        cleanup()
        resolve(code.data)
      }
    }, 250)
  })
}
