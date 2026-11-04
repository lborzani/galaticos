import { CircleCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import {
  courtName, deriveStatus, formatDateTime, isPast, scheduleLabel,
  type Attendance, type Enrollment, type GEvent, type Registration, type Training,
} from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { pb, useUser } from '@/lib/pb'

type WithPassport = Registration & { expand?: { event?: GEvent; passports_via_registration?: { token: string } } } // índice único → objeto, não lista

/** QR de entrada para cada evento futuro em que o usuário está confirmado, e um por turma de treino. */
export default function Passport() {
  const user = useUser()!
  const { data, error } = useLiveList<WithPassport>('registrations', {
    filter: pb.filter('user = {:u} && (status = "confirmed" || status = "attended")', { u: user.id }),
    sort: 'event.eventDate',
    expand: 'event,event.court,passports_via_registration',
  })

  const active = data?.filter((r) => r.expand?.event && !isPast(deriveStatus(r.expand.event)))

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Passaporte</h1>
      <TrainingPassports userId={user.id} />
      {error && <p className="text-destructive" role="alert">Não foi possível carregar seus passaportes.</p>}
      {!active ? <p className="text-muted-foreground">Carregando…</p> : active.length === 0 ? (
        <p className="text-muted-foreground">
          Você não está confirmado em nenhum evento. <Link to="/" className="text-primary hover:underline">Ver eventos</Link>
        </p>
      ) : active.map((r) => {
        const ev = r.expand!.event!
        const token = r.expand?.passports_via_registration?.token
        return (
          <Card key={r.id} role="region" aria-label={`Passaporte ${ev.title}`}>
            <CardContent className="grid justify-items-center gap-4 text-center">
              <div>
                <Link to={`/evento/${ev.id}`} className="font-semibold hover:underline">{ev.title}</Link>
                <p className="text-sm text-muted-foreground">{formatDateTime(ev.eventDate)} · {courtName(ev)}</p>
              </div>
              {r.status === 'attended' ? (
                <p className="flex items-center gap-2 py-8 font-medium text-emerald-500"><CircleCheck className="size-6" /> Presença confirmada</p>
              ) : token ? (
                <>
                  {/* fundo branco e margem: leitura confiável mesmo no tema escuro */}
                  <div className="rounded-xl bg-white p-4"><QRCodeSVG value={token} size={220} level="M" title="QR Code do passaporte" /></div>
                  <p className="text-sm text-muted-foreground">Mostre este código na entrada.</p>
                </>
              ) : <p className="text-sm text-muted-foreground">Gerando passaporte…</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function TrainingPassports({ userId }: { userId: string }) {
  const { data } = useLiveList<Enrollment>('enrollments', {
    filter: pb.filter('student = {:u}', { u: userId }), sort: 'class.name', expand: 'class,class.court',
  })
  return data?.map((e) => <TrainingPassport key={e.id} enrollment={e} />)
}

/** O token da matrícula vale para todas as sessões da turma; presença mostrada é a do próximo treino. */
function TrainingPassport({ enrollment }: { enrollment: Enrollment }) {
  const cls = enrollment.expand?.class
  const [now] = useState(() => new Date())
  const { data: sessions } = useLiveList<Training>('trainings', {
    filter: pb.filter('class = {:c} && endsAt >= {:now}', { c: enrollment.class, now }), sort: 'startsAt',
  })
  const next = sessions?.find((t) => !t.cancelledAt)
  const cancelled = sessions?.[0]?.cancelledAt ? sessions[0] : undefined
  const { data: present } = useLiveList<Attendance>('attendances', { filter: pb.filter('training = {:t}', { t: next?.id ?? '' }) })

  if (!cls) return null
  return (
    <Card role="region" aria-label={`Passaporte ${cls.name}`}>
      <CardContent className="grid justify-items-center gap-4 text-center">
        <div>
          <p className="font-semibold">Treino {cls.name}</p>
          <p className="text-sm text-muted-foreground">{scheduleLabel(cls)} · {cls.expand?.court?.name}</p>
          {cancelled && <p className="text-sm text-destructive">{formatDateTime(cancelled.startsAt)} cancelado: {cancelled.cancellationReason}</p>}
          {next && <p className="text-sm">Próximo treino: {formatDateTime(next.startsAt)}</p>}
        </div>
        {present?.length ? (
          <p className="flex items-center gap-2 py-8 font-medium text-emerald-500"><CircleCheck className="size-6" /> Presença confirmada</p>
        ) : (
          <>
            <div className="rounded-xl bg-white p-4"><QRCodeSVG value={enrollment.token} size={220} level="M" title="QR Code do passaporte" /></div>
            <p className="text-sm text-muted-foreground">Mostre este código ao professor.</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
