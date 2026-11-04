import { BellRing, Download, Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { install, useCanInstall } from '@/lib/install'
import { errorMessage } from '@/lib/pb'
import { enablePush, isIOS, pushState, standalone, type PushState } from '@/lib/push'

export const SNOOZE_KEY = 'galaticos:convite-app'
const SNOOZE_MS = 7 * 24 * 3600_000
const snoozed = () => Date.now() - Number(localStorage.getItem(SNOOZE_KEY)) < SNOOZE_MS

/** Convida a instalar o app e ativar as notificações; "Agora não" esconde por uma semana. */
export function InstallInvite() {
  const canInstall = useCanInstall()
  const [push, setPush] = useState<PushState>()
  const [hidden, setHidden] = useState(snoozed)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setPush) }, [])

  const iosInstall = isIOS() && !standalone() // iPhone não tem botão de instalar: só pelo Compartilhar
  if (hidden || (!canInstall && !iosInstall && push !== 'off')) return null

  function dismiss() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    setHidden(true)
  }

  async function activate() {
    setBusy(true)
    try {
      const state = await enablePush()
      setPush(state)
      if (state === 'denied') toast.error('Notificações bloqueadas. Libere nas configurações do navegador para este site.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível ativar as notificações.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-6 border-primary/40">
      <CardHeader>
        <CardTitle>Galáticos no seu celular</CardTitle>
        <CardDescription>Abra direto da tela inicial e receba lembretes dos jogos, vaga liberada na fila e cancelamentos.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" aria-label="Agora não" onClick={dismiss}><X /></Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {canInstall && <Button onClick={install}><Download /> Instalar app</Button>}
        {iosInstall && (
          <p className="text-sm text-muted-foreground">
            Toque em <Share className="inline size-4 align-text-bottom" /> Compartilhar → <b>Adicionar à Tela de Início</b> e ative as notificações pelo app.
          </p>
        )}
        {push === 'off' && <Button variant={canInstall ? 'outline' : 'default'} disabled={busy} onClick={activate}><BellRing /> Ativar notificações</Button>}
      </CardContent>
    </Card>
  )
}
