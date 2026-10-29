import { ClientResponseError, type RecordModel } from 'pocketbase'
import { Pencil, Plus, ScanLine, Trash2, Users as UsersIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, validate, type FieldErrors } from '@/components/form'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RanksField } from '@/components/rank'
import type { Court, Template } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { errorMessage, pb, ranksLabel, type Rank } from '@/lib/pb'

export default function Panel() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Painel admin</h1>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button asChild><Link to="/admin/eventos/novo"><Plus /> Novo evento</Link></Button>
        <Button variant="outline" asChild><Link to="/admin/validar"><ScanLine /> Validar passaportes</Link></Button>
        <Button variant="outline" asChild><Link to="/admin/usuarios"><UsersIcon /> Usuários</Link></Button>
      </div>
      <ConfigList<Court> collection="courts" title="Quadras" newLabel="Nova quadra"
        deleteNote="Só dá para apagar quadra sem eventos."
        // relação obrigatória: o PocketBase recusa apagar quadra que algum evento usa
        deleteBlocked="Essa quadra tem eventos; não dá para apagar."
        summary={(c) => c.address && <p className="truncate text-sm text-muted-foreground">{c.address}</p>}
        form={(c, onDone) => <CourtForm court={c} onDone={onDone} />} />
      <ConfigList<Template> collection="templates" title="Templates de evento" newLabel="Novo template"
        deleteNote="Eventos já criados com ele não mudam."
        summary={(t) => (
          <p className="text-sm text-muted-foreground">
            {t.maxParticipants} vagas{t.teams && ' · com times'}{t.allowedRanks?.length > 0 && ` · só ${ranksLabel(t.allowedRanks)}`}
          </p>
        )}
        form={(t, onDone) => <TemplateForm template={t} onDone={onDone} />} />
    </div>
  )
}

type Named = RecordModel & { name: string }

/** Lista editável de uma collection simples: criar, editar inline e apagar com confirmação. */
function ConfigList<T extends Named>({ collection, title, newLabel, deleteNote, deleteBlocked, summary, form }: {
  collection: string
  title: string
  newLabel: string
  deleteNote: string
  deleteBlocked?: string
  summary: (item: T) => ReactNode
  form: (item: T | undefined, onDone: () => void) => ReactNode
}) {
  const { data, error } = useLiveList<T>(collection, { sort: 'name' })
  const [editing, setEditing] = useState<string | null>(null) // id, 'new' ou null
  const done = () => setEditing(null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        {editing !== 'new' && <Button size="sm" onClick={() => setEditing('new')}><Plus /> {newLabel}</Button>}
      </CardHeader>
      <CardContent className="grid gap-3">
        {editing === 'new' && form(undefined, done)}
        {error && <p className="text-destructive" role="alert">Não foi possível carregar.</p>}
        {data?.length === 0 && editing !== 'new' && <p className="text-muted-foreground">Nada cadastrado.</p>}
        {data?.map((item) => editing === item.id ? <div key={item.id}>{form(item, done)}</div> : (
          <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3" role="group" aria-label={item.name}>
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              {summary(item)}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing(item.id)}><Pencil /></Button>
              <DeleteButton collection={collection} item={item} note={deleteNote} blocked={deleteBlocked} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function DeleteButton({ collection, item, note, blocked }: { collection: string; item: Named; note: string; blocked?: string }) {
  async function remove() {
    try {
      await pb.collection(collection).delete(item.id)
      toast.success(`Apagado: ${item.name}`)
    } catch (err) {
      toast.error(blocked && err instanceof ClientResponseError && err.status === 400 ? blocked : errorMessage(err, 'Não foi possível apagar.'))
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Apagar"><Trash2 /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar "{item.name}"?</AlertDialogTitle>
          <AlertDialogDescription>{note}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>Apagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Salva (cria ou atualiza) e traduz o erro de nome repetido. */
async function save(collection: string, id: string | undefined, data: object, setErrors: (e: FieldErrors) => void, dupe: string) {
  try {
    if (id) await pb.collection(collection).update(id, data)
    else await pb.collection(collection).create(data)
    toast.success('Salvo')
    return true
  } catch (err) {
    if (err instanceof ClientResponseError && err.response?.data?.name?.code === 'validation_not_unique') setErrors({ name: dupe })
    else toast.error(errorMessage(err, 'Não foi possível salvar.'))
    return false
  }
}

function FormShell({ onSubmit, onDone, saving, submitLabel, children }: {
  onSubmit: (e: FormEvent) => void; onDone: () => void; saving: boolean; submitLabel: string; children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-3" noValidate>
      {children}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Salvando…' : submitLabel}</Button>
      </div>
    </form>
  )
}

const courtSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(120),
  address: z.string().trim().max(200),
})

function CourtForm({ court, onDone }: { court?: Court; onDone: () => void }) {
  const [form, setForm] = useState({ name: court?.name ?? '', address: court?.address ?? '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { data, errors } = validate(courtSchema, form)
    setErrors(errors ?? {})
    if (!data) return
    setSaving(true)
    if (await save('courts', court?.id, data, setErrors, 'Já existe uma quadra com esse nome')) onDone()
    setSaving(false)
  }

  return (
    <FormShell onSubmit={onSubmit} onDone={onDone} saving={saving} submitLabel="Salvar quadra">
      <Field label="Nome" name="courtName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
      <Field label="Endereço (opcional)" name="courtAddress" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
        error={errors.address} />
    </FormShell>
  )
}

const templateSchema = z.object({
  name: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(80),
  maxParticipants: z.coerce.number().int('Número inteiro').min(1, 'Mínimo de 1 vaga').max(200),
  teams: z.boolean(),
  allowedRanks: z.array(z.enum(['regular', 'mitico', 'lendario'])),
})

function TemplateForm({ template, onDone }: { template?: Template; onDone: () => void }) {
  const [form, setForm] = useState({
    name: template?.name ?? '',
    maxParticipants: template ? String(template.maxParticipants) : '',
    teams: template?.teams ?? false,
    allowedRanks: template?.allowedRanks ?? ([] as Rank[]),
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { data, errors } = validate(templateSchema, form)
    setErrors(errors ?? {})
    if (!data) return
    setSaving(true)
    if (await save('templates', template?.id, data, setErrors, 'Já existe um template com esse nome')) onDone()
    setSaving(false)
  }

  return (
    <FormShell onSubmit={onSubmit} onDone={onDone} saving={saving} submitLabel="Salvar template">
      <Field label="Nome" name="templateName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
      <Field label="Vagas" name="templateMax" type="number" inputMode="numeric" min={1} value={form.maxParticipants}
        onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} error={errors.maxParticipants} />
      <div className="flex items-center gap-3">
        <Switch id="templateTeams" checked={form.teams} onCheckedChange={(teams) => setForm({ ...form, teams })} />
        <Label htmlFor="templateTeams">Com times (capitães e convites, como o Prime)</Label>
      </div>
      <RanksField value={form.allowedRanks} onChange={(allowedRanks) => setForm({ ...form, allowedRanks })} />
    </FormShell>
  )
}
