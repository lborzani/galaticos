import { CircleCheck, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, parseDate, type Attendance, type Enrollment, type Training } from '@/lib/events'
import { useLiveList, useLiveRecord, useNow } from '@/lib/live'
import { avatarUrl, errorMessage, initials, pb } from '@/lib/pb'

/** Uma sessão de treino: matriculados e quem já está presente, ao vivo. */
export default function Session() {
  const { id } = useParams()
  const now = useNow(60_000)
  const { data: t } = useLiveRecord<Training>('trainings', id!, 'class,class.court')
  const { data: enrolled } = useLiveList<Enrollment>('enrollments', {
    filter: pb.filter('class = {:c}', { c: t?.class ?? '' }), sort: 'student.name', expand: 'student',
  })
  const { data: present } = useLiveList<Attendance>('attendances', { filter: pb.filter('training = {:t}', { t: id }) })

  if (t === undefined) return <p className="text-muted-foreground">Carregando…</p>
  if (t === null) return <p className="text-muted-foreground">Treino não encontrado.</p>

  const cls = t.expand?.class
  const here = new Set(present?.map((a) => a.student))
  const open = !t.cancelledAt && parseDate(t.endsAt) > now

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">{cls?.name}</h1>
        <p className="text-muted-foreground">{formatDateTime(t.startsAt)} · {cls?.expand?.court?.name}</p>
      </div>
      {t.cancelledAt && <p className="rounded-lg border border-destructive/40 p-3 text-destructive" role="alert">Cancelado: {t.cancellationReason}</p>}
      {open && <Button className="lg:hidden" asChild><Link to="/treinos/validar"><ScanLine /> Validar passaportes</Link></Button>}

      <Card>
        <CardHeader><CardTitle>Presença{enrolled && ` (${here.size} de ${enrolled.length})`}</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {enrolled?.length === 0 && <p className="text-muted-foreground">Nenhum aluno matriculado.</p>}
          {enrolled?.map((e) => (
            <div key={e.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-2" role="group" aria-label={e.expand?.student?.name}>
              <Avatar className="size-8"><AvatarImage src={avatarUrl(e.expand?.student ?? null)} alt="" /><AvatarFallback>{initials(e.expand?.student?.name ?? '')}</AvatarFallback></Avatar>
              <span className="truncate text-sm">{e.expand?.student?.name}</span>
              {here.has(e.student)
                ? <span className="ml-auto flex items-center gap-1 text-sm text-emerald-500"><CircleCheck className="size-4" /> Presente</span>
                : <span className="ml-auto text-sm text-muted-foreground">—</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      {open && <CancelButton training={t} />}
    </div>
  )
}

function CancelButton({ training }: { training: Training }) {
  const [reason, setReason] = useState('')

  async function cancel() {
    try {
      await pb.collection('trainings').update(training.id, { cancelledAt: new Date().toISOString(), cancellationReason: reason.trim() })
      toast.success('Treino cancelado')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível cancelar.'))
    }
  }

  return (
    <AlertDialog onOpenChange={(open) => open && setReason('')}>
      <AlertDialogTrigger asChild><Button variant="destructive">Cancelar treino</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar este treino?</AlertDialogTitle>
          <AlertDialogDescription>Só esta data. Os próximos treinos da turma continuam.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="cancelReason">Motivo</Label>
          <Textarea id="cancelReason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={!reason.trim()} onClick={cancel}>Cancelar treino</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
