import { ChevronRight, Plus, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, parseDate, scheduleLabel, type Training, type TrainingClass } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { isAdmin, pb, useUser } from '@/lib/pb'

/** Agenda e turmas do professor (admin vê todas). */
export default function Trainings() {
  const user = useUser()!
  const admin = isAdmin(user)
  const [now] = useState(() => new Date())
  const { data: classes, error } = useLiveList<TrainingClass>('classes', {
    filter: admin ? '' : pb.filter('teacher = {:u}', { u: user.id }),
    sort: 'name',
    expand: 'court,teacher',
  })
  // a agenda já vem só com as próximas duas semanas (o servidor gera sessões para 14 dias)
  const { data: sessions } = useLiveList<Training>('trainings', {
    filter: pb.filter(admin ? 'endsAt >= {:now}' : 'endsAt >= {:now} && class.teacher = {:u}', { now, u: user.id }),
    sort: 'startsAt',
    expand: 'class',
  })

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Treinos</h1>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild><Link to="/treinos/turmas/nova"><Plus /> Nova turma</Link></Button>
        <Button variant="outline" className="lg:hidden" asChild><Link to="/treinos/validar"><ScanLine /> Validar passaportes</Link></Button>
      </div>
      {error && <p className="text-destructive" role="alert">Não foi possível carregar os treinos.</p>}

      <Card>
        <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {sessions?.length === 0 && <p className="text-muted-foreground">Nenhum treino nas próximas duas semanas.</p>}
          {sessions?.map((t) => (
            <Link key={t.id} to={`/treinos/sessao/${t.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border p-3 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.expand?.class?.name}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(t.startsAt)}</p>
              </div>
              {t.cancelledAt ? <Badge variant="destructive">Cancelado</Badge>
                : parseDate(t.startsAt) <= now && <Badge>Agora</Badge>}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Turmas</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {classes?.length === 0 && <p className="text-muted-foreground">Nenhuma turma ainda.</p>}
          {classes?.map((c) => (
            <Link key={c.id} to={`/treinos/turmas/${c.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border p-3 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{scheduleLabel(c)}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.expand?.court?.name}{admin && c.expand?.teacher && ` · ${c.expand.teacher.name}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
