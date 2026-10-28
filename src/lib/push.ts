import { pb } from './pb'

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches

async function registration() {
  return navigator.serviceWorker?.getRegistration()
}

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !standalone() ? 'ios-install' : 'unsupported' // iPhone só tem push com o app instalado
  }
  if (Notification.permission === 'denied') return 'denied'
  const sub = await (await registration())?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export async function enablePush() {
  if (await Notification.requestPermission() !== 'granted') return pushState()
  const { key } = await pb.send<{ key: string }>('/api/g/push/key', {})
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(key) })
  await pb.send('/api/g/push/subscribe', { method: 'POST', body: sub.toJSON() })
  return pushState()
}

/** Desliga neste aparelho. Também usado ao sair da conta, para o próximo usuário não herdar os avisos. */
export async function disablePush() {
  const sub = await (await registration())?.pushManager.getSubscription()
  if (!sub) return
  await pb.send('/api/g/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {})
  await sub.unsubscribe()
}

/** Sai da conta limpando a inscrição de push deste aparelho. */
export async function signOut() {
  await disablePush().catch(() => {})
  pb.authStore.clear()
}
