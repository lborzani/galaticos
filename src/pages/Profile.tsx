import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { phoneSchema } from '@/lib/phone'
import { disablePush, enablePush, pushState, signOut, type PushState } from '@/lib/push'

const NO_POSITION = 'none'

const schema = z.object({ name: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(50, 'Máximo de 50 caracteres'), phone: phoneSchema })

export default function Profile() {
  // remonta quando o registro muda (authRefresh, edição em outro aparelho): o formulário nunca salva dados velhos
  return <ProfileForm key={useUser()!.updated} />
}

function ProfileForm() {
  const user = useUser()!
  const { resolvedTheme, setTheme } = useTheme()
  const [position, setPosition] = useState<string>(user.position || NO_POSITION)
  const [available, setAvailable] = useState(user.availableForTeam)
  const [avatar, setAvatar] = useState<File>()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { data, errors } = validate(schema, { name: form.get('name'), phone: form.get('phone') })
    setErrors(errors ?? {})
    if (!data) return
    setSaving(true)
    try {
      // update do próprio registro também atualiza pb.authStore
      await pb.collection('users').update<User>(user.id, {
        name: data.name,
        phone: data.phone,
        position: position === NO_POSITION ? '' : position,
        availableForTeam: available,
        ...(avatar && { avatar }),
      })
      setAvatar(undefined)
      toast.success('Perfil atualizado')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar. A foto deve ser JPG, PNG ou WebP de até 5 MB.'))
    } finally {
      setSaving(false)
    }
  }

  const localPreview = useMemo(() => avatar && URL.createObjectURL(avatar), [avatar])
  const preview = localPreview ?? avatarUrl(user, '400x400')

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>Meu perfil</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5" noValidate>
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={preview} alt="" className="object-cover" />
                <AvatarFallback className="text-xl">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <Button type="button" variant="outline" asChild>
                  <label htmlFor="avatar">Trocar foto</label>
                </Button>
                <input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  onChange={(e) => setAvatar(e.target.files?.[0])} />
                <span className="text-xs text-muted-foreground">JPG, PNG ou WebP até 5 MB</span>
              </div>
            </div>

            <Field label="Nome" name="name" defaultValue={user.name} autoComplete="name" error={errors.name} />
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

            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="availableForTeam">Disponível para times Prime</Label>
                <span className="text-xs text-muted-foreground">Capitães podem te convidar para o time</span>
              </div>
              <Switch id="availableForTeam" checked={available} onCheckedChange={setAvailable} />
            </div>

            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Tema escuro</Label>
            <Switch id="theme" checked={resolvedTheme === 'dark'} onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')} />
          </div>
          <Notifications />
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </CardContent>
      </Card>
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
