/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// App shell em cache: abre offline. API e painel do PocketBase sempre vão à rede.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//, /^\/_\//] }))

// Nova versão só assume quando o usuário pede (aviso "Atualizar" no app).
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

type PushPayload = { title: string; body: string; url?: string; tag?: string }

self.addEventListener('push', (e) => {
  const data: PushPayload = e.data?.json() ?? { title: 'Galáticos', body: '' }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/pwa-192.png',
    tag: data.tag,
    data: { url: data.url ?? '/' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url ?? '/', self.location.origin).href
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const tab = tabs.find((t) => t.url.startsWith(self.location.origin))
    if (tab) {
      await tab.focus()
      return void (await (tab as WindowClient).navigate(url))
    }
    await self.clients.openWindow(url)
  })())
})
