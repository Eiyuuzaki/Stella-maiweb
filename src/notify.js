// Windows/安卓系统通知：任务完成时推送（浏览器 Notification API）。
// 页面在前台时不打扰（用户正看着），只在切到后台时弹。
export function notifySupported() {
  return typeof Notification !== 'undefined'
}

export function notifyPermission() {
  if (!notifySupported()) return 'unsupported'
  return Notification.permission
}

export async function ensureNotifyPermission() {
  if (!notifySupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const p = await Notification.requestPermission()
  return p === 'granted'
}

export function pushNotify(title, body) {
  if (!notifySupported() || Notification.permission !== 'granted') return
  if (!document.hidden) return
  try {
    new Notification(title, { body, tag: 'stella-queue' })
  } catch { /* 通知失败不影响任务 */ }
}
