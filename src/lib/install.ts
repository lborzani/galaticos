import { useSyncExternalStore } from 'react'

/** Evento do Chrome/Edge/Android que permite abrir o "Instalar app" quando quisermos. Safari/Firefox não têm. */
type InstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// no carregamento do módulo: o evento sai cedo, às vezes antes do React montar
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; emit() })
window.addEventListener('appinstalled', () => { deferred = null; emit() })

/** true quando o navegador deixa instalar por botão (e o app ainda não está instalado). */
export function useCanInstall() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => !!deferred)
}

export async function install() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null // o evento só pode ser usado uma vez
  emit()
}
