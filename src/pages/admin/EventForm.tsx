import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, validate, type FieldErrors } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FIXED_MAX, fromLocalInput, toLocalInput, TYPE_LABELS, type EventType, type GEvent } from '@/lib/events'
import { errorMessage, pb, useUser } from '@/lib/pb'

const schema = z
  .object({
    type: z.enum(['wednesday', 'sunday', 'custom', 'prime'], { message: 'Selecione o tipo' }),
    title: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(80),
    eventDate: z.string().min(1, 'Informe data e hora'),
    registrationOpensAt: z.string().min(1, 'Informe quando a lista abre'),
    location: z.string().trim().min(2, 'Informe o local').max(120),
    maxParticipants: z.coerce.number().int('Número inteiro').min(1, 'Mínimo de 1 vaga').max(200),
  })
  .refine((d) => !d.eventDate || !d.registrationOpensAt || d.registrationOpensAt < d.eventDate, {
    message: 'A lista deve abrir antes do evento',
    path: ['registrationOpensAt'],
  })

type Form = { type: EventType | ''; title: string; eventDate: string; registrationOpensAt: string; location: string; maxParticipants: string }
const EMPTY: Form = { type: '', title: '', eventDate: '', registrationOpensAt: '', location: '', maxParticipants: '' }

export default function EventForm() {
  const { id } = useParams()
  const user = useUser()!
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(EMPTY)
  const [loaded, setLoaded] = useState(!id)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    pb.collection('events').getOne<GEvent>(id).then((ev) => {
      setForm({
        type: ev.type,
        title: ev.title,
        eventDate: toLocalInput(ev.eventDate),
        registrationOpensAt: toLocalInput(ev.registrationOpensAt),
        location: ev.location,
        maxParticipants: String(ev.maxParticipants),
      })
      setLoaded(true)
    }, () => toast.error('Evento não encontrado'))
  }, [id])

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))))
  }

  function changeType(type: EventType) {
    const prevDefault = form.type && form.type !== 'custom' ? TYPE_LABELS[form.type] : ''
    set({
      type,
      maxParticipants: FIXED_MAX[type] ? String(FIXED_MAX[type]) : form.maxParticipants,
      // preenche o título padrão sem atropelar um título digitado
      title: !form.title || form.title === prevDefault ? (type === 'custom' ? '' : TYPE_LABELS[type]) : form.title,
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { data, errors } = validate(schema, form)
    setErrors(errors ?? {})
    if (!data) return
    const fixed = FIXED_MAX[data.type]
    if (fixed && data.maxParticipants !== fixed) return setErrors({ maxParticipants: `Esse tipo tem ${fixed} vagas` })

    const payload = {
      title: data.title,
      eventDate: fromLocalInput(data.eventDate),
      registrationOpensAt: fromLocalInput(data.registrationOpensAt),
      location: data.location,
      maxParticipants: data.maxParticipants,
    }
    setSaving(true)
    try {
      const saved = id
        ? await pb.collection('events').update(id, payload)
        : await pb.collection('events').create({ ...payload, type: data.type, createdBy: user.id })
      toast.success(id ? 'Evento atualizado' : 'Evento criado')
      navigate(`/evento/${saved.id}`, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar. Confira os dados do evento.'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="text-muted-foreground">Carregando…</p>
  const fixed = form.type ? FIXED_MAX[form.type] : undefined

  return (
    <Card>
      <CardHeader><CardTitle>{id ? 'Editar evento' : 'Novo evento'}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          <Field label="Tipo" name="type" error={errors.type}>
            <Select value={form.type} onValueChange={(v) => changeType(v as EventType)} disabled={!!id}>
              <SelectTrigger id="type" className="w-full" aria-invalid={!!errors.type}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Título" name="title" value={form.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Data e hora do evento" name="eventDate" type="datetime-local" value={form.eventDate}
              onChange={(e) => set({ eventDate: e.target.value })} error={errors.eventDate} />
            <Field label="Lista abre em" name="registrationOpensAt" type="datetime-local" value={form.registrationOpensAt}
              onChange={(e) => set({ registrationOpensAt: e.target.value })} error={errors.registrationOpensAt} />
          </div>
          <Field label="Local" name="location" value={form.location} onChange={(e) => set({ location: e.target.value })} error={errors.location} />
          <Field label="Vagas" name="maxParticipants" type="number" inputMode="numeric" min={1} value={form.maxParticipants}
            onChange={(e) => set({ maxParticipants: e.target.value })} disabled={!!fixed} error={errors.maxParticipants} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
