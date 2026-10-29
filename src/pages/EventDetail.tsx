import { CalendarDays, Clock, MapPin, Pencil, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/events'
import { RegistrationPanel } from '@/components/registration'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { courtName, deriveStatus, formatDateTime, isPast, kindLabel, mapsUrl, type GEvent } from '@/lib/events'
import { useLiveRecord, useNow } from '@/lib/live'
import { errorMessage, isAdmin, pb, ranksLabel, useUser } from '@/lib/pb'

export default function EventDetail() {
  const { id } = useParams()
  const user = useUser()!
  const { data: event, error } = useLiveRecord<GEvent>('events', id!, 'court')
  const now = useNow(1000) // botão aparece no segundo em que a lista abre

  if (error) return <p className="text-destructive" role="alert">Não foi possível carregar o evento.</p>
  if (event === undefined) return <p className="text-muted-foreground">Carregando…</p>
  if (event === null) return <p>Evento não encontrado. <Link to="/" className="text-primary hover:underline">Voltar</Link></p>

  const status = deriveStatus(event, now)

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{kindLabel(event)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <StatusBadge status={status} />
        </div>
      </div>

      {event.cancelledAt && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="text-sm"><strong>Evento cancelado.</strong> {event.cancellationReason}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-3 text-sm">
          <Info icon={CalendarDays}>{formatDateTime(event.eventDate)}</Info>
          <Info icon={MapPin}>
            {courtName(event)}
            {event.expand?.court?.address && (
              <a href={mapsUrl(event.expand.court.address)} target="_blank" rel="noreferrer" className="block text-muted-foreground hover:underline">
                {event.expand.court.address}
              </a>
            )}
          </Info>
          <Info icon={Clock}>Lista abre {formatDateTime(event.registrationOpensAt)}</Info>
          <Info icon={Users}>{event.maxParticipants} vagas</Info>
          {event.allowedRanks?.length > 0 && <Info icon={ShieldCheck}>Só para {ranksLabel(event.allowedRanks)}</Info>}
        </CardContent>
      </Card>

      {!event.cancelledAt && <RegistrationPanel event={event} status={status} />}

      {isAdmin(user) && !isPast(status) && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to={`/admin/eventos/${event.id}/editar`}><Pencil /> Editar</Link></Button>
          <CancelEvent event={event} />
        </div>
      )}
    </div>
  )
}

function Info({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return <div className="flex items-center gap-3"><Icon className="size-4 shrink-0 text-muted-foreground" /> <div>{children}</div></div>
}

function CancelEvent({ event }: { event: GEvent }) {
  const user = useUser()!
  const [reason, setReason] = useState('')

  async function cancel() {
    try {
      await pb.collection('events').update(event.id, {
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.id,
        cancellationReason: reason.trim(),
      })
      toast.success('Evento cancelado')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível cancelar o evento.'))
    }
  }

  return (
    <AlertDialog onOpenChange={(open) => open || setReason('')}>
      <AlertDialogTrigger asChild><Button variant="destructive">Cancelar evento</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar "{event.title}"?</AlertDialogTitle>
          <AlertDialogDescription>Os inscritos verão o motivo. Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={!reason.trim()} onClick={cancel}>Cancelar evento</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
