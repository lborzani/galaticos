import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, PhoneField, validate, type FieldErrors } from '@/components/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { avatarUrl, errorMessage, initials, pb, POSITION_LABELS, RANK_LABELS, useUser, type User } from '@/lib/pb'
import { shrinkImage } from '@/lib/image'
import { phoneSchema } from '@/lib/phone'
import { disablePush, enablePush, pushState, signOut, type PushState } from '@/lib/push'

const NO_POSITION = 'none'

const schema = z.object({
  name: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(50, 'Máximo de 50 caracteres'),
  nickname: z.string().trim().max(30, 'Máximo de 30 caracteres'),
  phone: phoneSchema,
})

export default function Profile() {
  const u = useUser()!
  // remonta quando um campo do formulário muda no servidor (edição em outro aparelho): nunca salva dados velhos.
  // Fora da chave o que se salva sozinho (disponibilidade), senão apagaria o que está sendo digitado.
  return <ProfileForm key={[u.name, u.nickname, u.phone, u.position, u.avatar].join('|')} />
}

// campos de texto como estão no formulário (telefone só dígitos, a máscara muda durante a digitação)
const textSnapshot = (form: HTMLFormElement) => {
  const f = new FormData(form)
  return [f.get('name'), f.get('nickname'), String(f.get('phone')).replace(/\D/g, '')].join('\n')
}

function ProfileForm() {
  const user = useUser()!
  const { resolvedTheme, setTheme } = useTheme()
  const [position, setPosition] = useState<string>(user.position || NO_POSITION)
  const [avatar, setAvatar] = useState<File>()
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const initialText = useRef('')
  const [textDirty, setTextDirty] = useState(false)
  useEffect(() => { initialText.current = textSnapshot(formRef.current!) }, [])
  const dirty = textDirty || !!avatar || position !== (user.position || NO_POSITION)

  async function pickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // escolher a mesma foto de novo dispara onChange
    if (!file) return
    setProcessing(true)
    try {
      setAvatar(await shrinkImage(file, 'avatar'))
    } catch {
      toast.error('Não foi possível ler essa imagem. Use JPG, PNG ou WebP.')
    } finally {
      setProcessing(false)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { data, errors } = validate(schema, { name: form.get('name'), nickname: form.get('nickname'), phone: form.get('phone') })
    setErrors(errors ?? {})
    if (!data) return
    setSaving(true)
    try {
      // update do próprio registro também atualiza pb.authStore
      await pb.collection('users').update<User>(user.id, {
        name: data.name,
        nickname: data.nickname,
        phone: data.phone,
        position: position === NO_POSITION ? '' : position,
        ...(avatar && { avatar }),
      })
      setAvatar(undefined)
      toast.success('Perfil atualizado')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar.'))
    } finally {
      setSaving(false)
    }
  }

  const localPreview = useMemo(() => avatar && URL.createObjectURL(avatar), [avatar])
  const preview = localPreview ?? avatarUrl(user, '400x400')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Card>
        <CardHeader><CardTitle>Meu perfil</CardTitle></CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={onSubmit} onChange={(e) => setTextDirty(textSnapshot(e.currentTarget) !== initialText.current)}
            className="grid gap-5" noValidate>
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={preview} alt="" className="object-cover" />
                <AvatarFallback className="text-xl">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <Button type="button" variant="outline" asChild>
                  <label htmlFor="avatar">{processing ? 'Preparando…' : 'Trocar foto'}</label>
                </Button>
                <input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  disabled={processing} onChange={pickAvatar} />
                <span className="text-xs text-muted-foreground">JPG, PNG ou WebP</span>
              </div>
            </div>

            <Field label="Nome" name="name" defaultValue={user.name} autoComplete="name" error={errors.name} />
            <Field label="Apelido" name="nickname" defaultValue={user.nickname ?? ''} autoComplete="nickname" error={errors.nickname} />
            <Field label="E-mail" name="email" value={user.email ?? ''} disabled readOnly />
            <Field label="Rank" name="rank" value={RANK_LABELS[user.rank] ?? 'Regular'} disabled readOnly />
            <div className="grid gap-1">
              <PhoneField defaultValue={user.phone} error={errors.phone} />
              <span className="text-xs text-muted-foreground">Só você e os admins veem.</span>
            </div>

            <Field label="Posição" name="position">
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger id="position" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_POSITION}>Não informar</SelectItem>
                  {Object.entries(POSITION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Button type="submit" disabled={saving || processing || !dirty}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-8">
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Tema escuro</Label>
            <Switch id="theme" checked={resolvedTheme === 'dark'} onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')} />
          </div>
          <TeamAvailability />
          <Notifications />
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </CardContent>
      </Card>
    </div>
  )
}

/** Salva na hora, como os outros interruptores desta coluna. */
function TeamAvailability() {
  const user = useUser()!
  const [busy, setBusy] = useState(false)

  async function toggle(on: boolean) {
    setBusy(true)
    try {
      await pb.collection('users').update<User>(user.id, { availableForTeam: on })
      toast.success(on ? 'Você está disponível para times Prime' : 'Você saiu da lista de disponíveis')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="availableForTeam">Disponível para times Prime</Label>
        <Switch id="availableForTeam" checked={user.availableForTeam} disabled={busy} onCheckedChange={toggle} />
      </div>
      <span className="text-xs text-muted-foreground">Capitães podem te convidar para o time</span>
    </div>
  )
}

const PUSH_HINT: Partial<Record<PushState, string>> = {
  'ios-install': 'No iPhone, instale o app (Compartilhar → Adicionar à Tela de Início) e ative por lá.',
  unsupported: 'Este navegador não suporta notificações.',
  denied: 'Notificações bloqueadas. Libere nas configurações do navegador para este site.',
}

function Notifications() {
  const [state, setState] = useState<PushState>()
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setState) }, [])

  async function toggle(on: boolean) {
    setBusy(true)
    try {
      if (on) setState(await enablePush())
      else { await disablePush(); setState(await pushState()) }
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível ativar as notificações.'))
    } finally {
      setBusy(false)
    }
  }

  const hint = state && PUSH_HINT[state]
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="push">Notificações</Label>
        <Switch id="push" checked={state === 'on'} disabled={busy || !state || !!hint} onCheckedChange={toggle} />
      </div>
      <span className="text-xs text-muted-foreground">{hint ?? 'Lembretes 1 h e 5 min antes, vaga liberada na fila e cancelamentos.'}</span>
    </div>
  )
}
