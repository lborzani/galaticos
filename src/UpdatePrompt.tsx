import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Registra o service worker e oferece atualizar quando sai versão nova. */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  useEffect(() => {
    if (!needRefresh) return
    toast('Nova versão do Galáticos disponível', {
      duration: Infinity,
      action: { label: 'Atualizar', onClick: () => updateServiceWorker(true) },
    })
  }, [needRefresh, updateServiceWorker])
  return null
}
