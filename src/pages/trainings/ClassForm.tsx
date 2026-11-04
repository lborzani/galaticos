import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, validate, type FieldErrors } from '@/components/form'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WEEKDAY_LABELS, type Court, type Enrollment, type TrainingClass, type Weekday } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { avatarUrl, errorMessage, initials, isAdmin, pb, useUser, type User } from '@/lib/pb'

const schema = z.object({
  name: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(80),
  court: z.string().min(1, 'Selecione a quadra'),
  teacher: z.string().min(1, 'Selecione o professor'),
  weekdays: z.array(z.string()).min(1, 'Escolha pelo menos um dia'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe a hora'),
  durationMin: z.coerce.number().int('Número inteiro').min(15, 'Mínimo de 15 min').max(480, 'Máximo de 480 min'),
})

type Form = { name: string; court: string; teacher: string; weekdays: Weekday[]; startTime: string; durationMin: string }

/** Cria ou edita turma; na edição também matricula alunos e apaga a turma. */
export default function ClassForm() {
  const { id } = useParams()
  const user = useUser()!
  const admin = isAdmin(user)
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({ name: '', court: '', teacher: admin ? '' : user.id, weekdays: [], startTime: '', durationMin: '60' })
  const [loaded, setLoaded] = useState(!id)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const { data: courts } = useLiveList<Court>('courts', { sort: 'name' })
  const { data: teachers } = useLiveList<User>('users', { filter: admin ? 'role = "professor" || role = "admin"' : pb.filter('id = {:u}', { u: user.id }), sort: 'name' })

  useEffect(() => {
    if (!id) return
    pb.collection('classes').getOne<TrainingClass>(id).then((c) => {
      setForm({ name: c.name, court: c.court, teacher: c.teacher, weekdays: c.weekdays, startTime: c.startTime, durationMin: String(c.durationMin) })
      setLoaded(true)
    }, () => toast.error('Turma não encontrada'))
  }, [id])

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { data, errors } = validate(schema, form)
    setErrors(errors ?? {})
    if (!data) return
    setSaving(true)
    try {
      if (id) {
        await pb.collection('classes').update(id, data)
        toast.success('Turma atualizada')
        navigate('/treinos')
      } else {
        const saved = await pb.collection('classes').create(data)
        toast.success('Turma criada. Agora matricule os alunos.')
        navigate(`/treinos/turmas/${saved.id}`, { replace: true })
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar. Confira os dados da turma.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    try {
      await pb.collection('classes').delete(id!)
      toast.success('Turma apagada')
      navigate('/treinos', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível apagar.'))
    }
  }

  if (!loaded) return <p className="text-muted-foreground">Carregando…</p>

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>{id ? 'Editar turma' : 'Nova turma'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5" noValidate>
            <Field label="Nome" name="name" value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
            <Field label="Quadra" name="court" error={errors.court}>
              <Select value={form.court} onValueChange={(court) => set({ court })}>
                <SelectTrigger id="court" className="w-full" aria-invalid={!!errors.court}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{courts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {admin && (
              <Field label="Professor" name="teacher" error={errors.teacher}>
                <Select value={form.teacher} onValueChange={(teacher) => set({ teacher })}>
                  <SelectTrigger id="teacher" className="w-full" aria-invalid={!!errors.teacher}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{teachers?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Dias da semana</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {(Object.keys(WEEKDAY_LABELS) as Weekday[]).map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-primary" checked={form.weekdays.includes(d)}
                      onChange={(e) => set({ weekdays: e.target.checked ? [...form.weekdays, d] : form.weekdays.filter((x) => x !== d) })} />
                    {WEEKDAY_LABELS[d]}
                  </label>
                ))}
              </div>
              {errors.weekdays && <p className="text-sm text-destructive">{errors.weekdays}</p>}
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Hora (Brasília)" name="startTime" type="time" value={form.startTime}
                onChange={(e) => set({ startTime: e.target.value })} error={errors.startTime} />
              <Field label="Duração (min)" name="durationMin" type="number" inputMode="numeric" min={15} value={form.durationMin}
                onChange={(e) => set({ durationMin: e.target.value })} error={errors.durationMin} />
            </div>
            {id && <p className="-mt-2 text-sm text-muted-foreground">Mudar dias ou hora refaz os próximos treinos (os que já têm presença ficam).</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Salvando…' : 'Salvar turma'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {id && <Students classId={id} />}

      {id && (
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive">Apagar turma</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar "{form.name}"?</AlertDialogTitle>
              <AlertDialogDescription>Some a turma, a agenda, as matrículas e o histórico de presença. Não dá para desfazer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={remove}>Apagar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function Students({ classId }: { classId: string }) {
  const { data: enrolled } = useLiveList<Enrollment>('enrollments', {
    filter: pb.filter('class = {:c}', { c: classId }), sort: 'student.name', expand: 'student',
  })
  const { data: users } = useLiveList<User>('users', { sort: 'name' })
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const taken = new Set(enrolled?.map((e) => e.student))
  const matches = q ? (users ?? []).filter((u) => !taken.has(u.id) && u.name.toLowerCase().includes(q)).slice(0, 5) : []

  async function add(u: User) {
    try {
      await pb.collection('enrollments').create({ class: classId, student: u.id })
      toast.success(`${u.name} matriculado`)
      setQuery('')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível matricular.'))
    }
  }

  async function remove(e: Enrollment) {
    try {
      await pb.collection('enrollments').delete(e.id)
      toast.success(`${e.expand?.student?.name} saiu da turma`)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível tirar da turma.'))
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Alunos{enrolled && ` (${enrolled.length})`}</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <Input type="search" placeholder="Buscar pelo nome para matricular" aria-label="Buscar aluno" value={query} onChange={(e) => setQuery(e.target.value)} />
        {matches.map((u) => (
          <button key={u.id} type="button" onClick={() => add(u)} aria-label={`Matricular ${u.name}`}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-dashed p-2 text-left hover:bg-muted">
            <Avatar className="size-8"><AvatarImage src={avatarUrl(u)} alt="" /><AvatarFallback>{initials(u.name)}</AvatarFallback></Avatar>
            <span className="truncate text-sm">{u.name}</span>
            <span className="ml-auto text-sm text-primary">Matricular</span>
          </button>
        ))}
        {q && matches.length === 0 && <p className="text-sm text-muted-foreground">Ninguém com esse nome fora da turma.</p>}
        {enrolled?.length === 0 && !q && <p className="text-muted-foreground">Nenhum aluno matriculado.</p>}
        {enrolled?.map((e) => (
          <div key={e.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-2">
            <Avatar className="size-8"><AvatarImage src={avatarUrl(e.expand?.student ?? null)} alt="" /><AvatarFallback>{initials(e.expand?.student?.name ?? '')}</AvatarFallback></Avatar>
            <span className="truncate text-sm">{e.expand?.student?.name}</span>
            <Button variant="ghost" size="icon" className="ml-auto" aria-label={`Tirar ${e.expand?.student?.name} da turma`} onClick={() => remove(e)}><X /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
