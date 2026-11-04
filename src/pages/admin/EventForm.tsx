import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, validate, type FieldErrors } from '@/components/form'
import { RanksField } from '@/components/rank'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fromLocalInput, toLocalInput, type Court, type GEvent, type Template } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { errorMessage, pb, useUser, type Rank } from '@/lib/pb'

const schema = z
  .object({
    title: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(80),
    eventDate: z.string().min(1, 'Informe data e hora'),
    registrationOpensAt: z.string().min(1, 'Informe quando a lista abre'),
    court: z.string().min(1, 'Selecione a quadra'),
    maxParticipants: z.coerce.number().int('Número inteiro').min(1, 'Mínimo de 1 vaga').max(200),
  })
  .refine((d) => !d.eventDate || !d.registrationOpensAt || d.registrationOpensAt < d.eventDate, {
    message: 'A lista deve abrir antes do evento',
    path: ['registrationOpensAt'],
  })

type Form = {
  template: string; kind: string; teams: boolean; title: string; eventDate: string; registrationOpensAt: string; court: string
  maxParticipants: string; allowedRanks: Rank[]; repeatDays: string; times: string
}
const EMPTY: Form = {
  template: '', kind: '', teams: false, title: '', eventDate: '', registrationOpensAt: '', court: '', maxParticipants: '', allowedRanks: [],
  repeatDays: '0', times: '4',
}
const MAX_TIMES = 12

/** Valor de datetime-local + `days` dias, mesmo horário de relógio (Date local cuida do calendário). */
function shiftDays(local: string, days: number) {
  const d = new Date(local)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default function EventForm() {
  const { id } = useParams()
  const user = useUser()!
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(EMPTY)
  const [loaded, setLoaded] = useState(!id)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const { data: courts } = useLiveList<Court>('courts', { sort: 'name' })
  const { data: templates } = useLiveList<Template>('templates', { sort: 'name' })

  useEffect(() => {
    if (!id) return
    pb.collection('events').getOne<GEvent>(id).then((ev) => {
      setForm({
        template: '', kind: ev.kind, teams: ev.teams,
        title: ev.title,
        eventDate: toLocalInput(ev.eventDate),
        registrationOpensAt: toLocalInput(ev.registrationOpensAt),
        court: ev.court,
        maxParticipants: String(ev.maxParticipants),
        allowedRanks: ev.allowedRanks ?? [],
        repeatDays: '0', times: '',
      })
      setLoaded(true)
    }, () => toast.error('Evento não encontrado'))
  }, [id])

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))))
  }

  function changeTemplate(value: string) {
    const t = templates?.find((t) => t.id === value)
    set({
      template: value,
      kind: t?.name ?? '',
      teams: !!t?.teams,
      maxParticipants: t ? String(t.maxParticipants) : form.maxParticipants,
      allowedRanks: t ? t.allowedRanks : form.allowedRanks,
      // preenche o título padrão sem atropelar um título digitado
      title: !form.title || form.title === form.kind ? (t?.name ?? '') : form.title,
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { data, errors } = validate(schema, form)
    const repeatDays = id ? 0 : Number(form.repeatDays)
    const times = repeatDays ? Number(form.times) : 1
    const all = {
      ...errors,
      ...(!id && !form.template && { template: 'Selecione o template' }),
      ...(repeatDays > 0 && !(Number.isInteger(times) && times >= 2 && times <= MAX_TIMES) && { times: `De 2 a ${MAX_TIMES} vezes` }),
    }
    setErrors(all)
    if (!data || Object.keys(all).length) return

    const payload = {
      title: data.title,
      eventDate: fromLocalInput(data.eventDate),
      registrationOpensAt: fromLocalInput(data.registrationOpensAt),
      court: data.court,
      maxParticipants: data.maxParticipants,
      allowedRanks: form.allowedRanks,
    }
    setSaving(true)
    try {
      if (times > 1) {
        // série: cada ocorrência vira um evento independente, criadas num lote só (tudo ou nada)
        const batch = pb.createBatch()
        for (let i = 0; i < times; i++) {
          batch.collection('events').create({
            ...payload, kind: form.kind, teams: form.teams, createdBy: user.id,
            eventDate: shiftDays(data.eventDate, i * repeatDays),
            registrationOpensAt: shiftDays(data.registrationOpensAt, i * repeatDays),
          })
        }
        await batch.send()
        toast.success(`${times} eventos criados`)
        navigate('/', { replace: true })
        return
      }
      const saved = id
        ? await pb.collection('events').update(id, payload)
        : await pb.collection('events').create({ ...payload, kind: form.kind, teams: form.teams, createdBy: user.id })
      toast.success(id ? 'Evento atualizado' : 'Evento criado')
      navigate(`/evento/${saved.id}`, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar. Confira os dados do evento.'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="text-muted-foreground">Carregando…</p>

  return (
    <Card className="lg:max-w-3xl">
      <CardHeader><CardTitle>{id ? 'Editar evento' : 'Novo evento'}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          {id ? (
            // template e modo times não mudam depois de criado
            <Field label="Template" name="template" value={form.kind || 'Personalizado'} disabled readOnly />
          ) : (
            <Field label="Template" name="template" error={errors.template}>
              <Select value={form.template} onValueChange={changeTemplate}>
                <SelectTrigger id="template" className="w-full" aria-invalid={!!errors.template}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  <SelectItem value="none">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          {form.teams && <p className="-mt-3 text-sm text-muted-foreground">Com times: os confirmados são capitães e convidam jogadores.</p>}
          <Field label="Título" name="title" value={form.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Data e hora do evento" name="eventDate" type="datetime-local" value={form.eventDate}
              onChange={(e) => set({ eventDate: e.target.value })} error={errors.eventDate} />
            <Field label="Lista abre em" name="registrationOpensAt" type="datetime-local" value={form.registrationOpensAt}
              onChange={(e) => set({ registrationOpensAt: e.target.value })} error={errors.registrationOpensAt} />
          </div>
          <Field label="Quadra" name="court" error={errors.court}>
            <Select value={form.court} onValueChange={(v) => set({ court: v })}>
              <SelectTrigger id="court" className="w-full" aria-invalid={!!errors.court}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {courts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {courts?.length === 0 && (
            <p className="-mt-3 text-sm text-muted-foreground">
              Nenhuma quadra cadastrada. <Link to="/admin" className="text-primary hover:underline">Cadastrar quadra</Link>
            </p>
          )}
          <Field label="Vagas" name="maxParticipants" type="number" inputMode="numeric" min={1} value={form.maxParticipants}
            onChange={(e) => set({ maxParticipants: e.target.value })} error={errors.maxParticipants} />
          <RanksField value={form.allowedRanks} onChange={(allowedRanks) => set({ allowedRanks })} />
          {!id && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Repetir" name="repeatDays">
                <Select value={form.repeatDays} onValueChange={(v) => set({ repeatDays: v })}>
                  <SelectTrigger id="repeatDays" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não repete</SelectItem>
                    <SelectItem value="7">Toda semana</SelectItem>
                    <SelectItem value="14">A cada 2 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.repeatDays !== '0' && (
                <Field label="Quantas vezes" name="times" type="number" inputMode="numeric" min={2} max={MAX_TIMES} value={form.times}
                  onChange={(e) => set({ times: e.target.value })} error={errors.times} />
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
