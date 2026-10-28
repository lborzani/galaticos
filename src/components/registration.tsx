import { CircleCheck, Hourglass } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, type EventStatus, type GEvent, type Registration } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { PrimeTeams } from './prime'
import { avatarUrl, initials, pb, POSITION_LABELS, serverMessage, useUser } from '@/lib/pb'

/** Ação do usuário (entrar/sair) + listas de confirmados e espera, ao vivo. */
export function RegistrationPanel({ event, status }: { event: GEvent; status: EventStatus }) {
  const user = useUser()!
  const { data: regs, error } = useLiveList<Registration>('registrations', {
    filter: pb.filter('event = {:id} && status != "cancelled"', { id: event.id }),
    sort: 'position',
    expand: 'user',
  })

  if (error) return <p className="text-destructive" role="alert">Não foi possível carregar a lista.</p>
  if (!regs) return <p className="text-muted-foreground">Carregando lista…</p>

  const confirmed = regs.filter((r) => r.status === 'confirmed' || r.status === 'attended')
  const waitlist = regs.filter((r) => r.status === 'waitlist')
  const mine = regs.find((r) => r.user === user.id)

  return (
    <div className="grid gap-6">
      <MyRegistration event={event} status={status} mine={mine} waitRank={mine ? waitlist.indexOf(mine) + 1 : 0} />
      <PlayerList title={`${event.type === 'prime' ? 'Capitães' : 'Confirmados'} (${confirmed.length}/${event.maxParticipants})`} regs={confirmed} empty="Ninguém confirmado ainda." />
      {waitlist.length > 0 && <PlayerList title={`Lista de espera (${waitlist.length})`} regs={waitlist} numbered />}
      {event.type === 'prime' && <PrimeTeams event={event} captains={confirmed} canInvite={status === 'open' || status === 'full' || status === 'upcoming'} />}
    </div>
  )
}

function MyRegistration({ event, status, mine, waitRank }: { event: GEvent; status: EventStatus; mine?: Registration; waitRank: number }) {
  const [busy, setBusy] = useState(false)

  async function call(action: 'register' | 'cancel') {
    setBusy(true)
    try {
      const reg = await pb.send<Registration>(`/api/g/events/${event.id}/${action}`, { method: 'POST' })
      if (action === 'cancel') toast.success('Você saiu da lista')
      else toast.success(reg.status === 'confirmed' ? 'Presença confirmada!' : 'Você entrou na lista de espera')
    } catch (err) {
      toast.error(serverMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'upcoming') return <Notice>A lista abre {formatDateTime(event.registrationOpensAt)}.</Notice>
  if (mine?.status === 'attended') return <Notice icon={CircleCheck}>Presença registrada. Bom jogo!</Notice>
  if (status !== 'open' && status !== 'full') return null

  if (!mine) {
    return (
      <Button size="lg" disabled={busy} onClick={() => call('register')}>
        {status === 'full' ? 'Entrar na lista de espera' : 'Entrar na lista'}
      </Button>
    )
  }

  const waiting = mine.status === 'waitlist'
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium">
          {waiting
            ? <><Hourglass className="size-5 text-amber-500" /> Você é o {waitRank}º da lista de espera</>
            : <><CircleCheck className="size-5 text-emerald-500" /> Você está confirmado</>}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={busy}>{waiting ? 'Sair da espera' : 'Cancelar inscrição'}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{waiting ? 'Sair da lista de espera?' : 'Cancelar sua inscrição?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {waiting ? 'Se voltar depois, entra no fim da fila.' : 'Sua vaga vai para o primeiro da lista de espera.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => call('cancel')}>{waiting ? 'Sair' : 'Cancelar inscrição'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

function Notice({ icon: Icon, children }: { icon?: typeof CircleCheck; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 text-sm">{Icon && <Icon className="size-5 text-emerald-500" />} {children}</CardContent>
    </Card>
  )
}

function PlayerList({ title, regs, empty, numbered }: { title: string; regs: Registration[]; empty?: string; numbered?: boolean }) {
  const me = useUser()!.id
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {regs.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
          <ol className="grid gap-3" aria-label={title}>
            {regs.map((r, i) => {
              const u = r.expand?.user
              return (
                <li key={r.id} className="flex items-center gap-3">
                  {numbered && <span className="w-5 text-right text-sm tabular-nums text-muted-foreground">{i + 1}</span>}
                  <Avatar size="sm"><AvatarImage src={avatarUrl(u ?? null)} alt="" /><AvatarFallback>{initials(u?.name ?? '?')}</AvatarFallback></Avatar>
                  <span className="truncate text-sm">{u?.name ?? 'Jogador'}{r.user === me && <span className="text-muted-foreground"> (você)</span>}</span>
                  {r.status === 'attended' && <CircleCheck className="size-4 shrink-0 text-emerald-500" aria-label="presente" />}
                  {u?.position && <span className="ml-auto text-xs text-muted-foreground">{POSITION_LABELS[u.position]}</span>}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
