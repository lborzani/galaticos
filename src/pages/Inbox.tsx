import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PlayerAvatar } from '@/components/prime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime, type Invite } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { pb, serverMessage, useUser } from '@/lib/pb'

const STATUS_LABEL = { accepted: 'Aceito', declined: 'Recusado', cancelled: 'Cancelado' } as const

/** Convites do Prime recebidos pelo usuário. */
export default function Inbox() {
  const user = useUser()!
  const { data, error } = useLiveList<Invite>('invites', {
    filter: pb.filter('player = {:u}', { u: user.id }),
    sort: '-created',
    expand: 'event,captain',
  })
  const pending = data?.filter((i) => i.status === 'pending')
  const answered = data?.filter((i) => i.status !== 'pending')

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Convites</h1>
      {error && <p className="text-destructive" role="alert">Não foi possível carregar seus convites.</p>}
      {!data ? <p className="text-muted-foreground">Carregando…</p> : data.length === 0 ? (
        <p className="text-muted-foreground">Nenhum convite ainda. Marque "Disponível para times Prime" no perfil para receber.</p>
      ) : (
        <>
          {pending!.map((inv) => <InviteCard key={inv.id} invite={inv} />)}
          {answered!.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Anteriores</h2>
              {answered!.map((inv) => <InviteCard key={inv.id} invite={inv} />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function InviteCard({ invite }: { invite: Invite }) {
  const [busy, setBusy] = useState(false)
  const ev = invite.expand?.event
  const cap = invite.expand?.captain

  async function respond(action: 'accept' | 'decline') {
    setBusy(true)
    try {
      await pb.send(`/api/g/invites/${invite.id}/${action}`, { method: 'POST' })
      toast.success(action === 'accept' ? `Você entrou no time de ${cap?.name}` : 'Convite recusado')
    } catch (err) {
      toast.error(serverMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card role="region" aria-label={`Convite de ${cap?.name ?? 'capitão'}`}>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar user={cap} />
          <div className="min-w-0">
            <p className="text-sm"><strong>{cap?.name ?? 'Um capitão'}</strong> te convidou para o time</p>
            {ev && (
              <Link to={`/evento/${ev.id}`} className="text-sm text-muted-foreground hover:underline">
                {ev.title} · {formatDateTime(ev.eventDate)}
              </Link>
            )}
          </div>
          {invite.status !== 'pending' && <Badge variant="secondary" className="ml-auto">{STATUS_LABEL[invite.status]}</Badge>}
        </div>
        {invite.status === 'pending' && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => respond('decline')}>Recusar</Button>
            <Button className="flex-1" disabled={busy} onClick={() => respond('accept')}>Aceitar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
