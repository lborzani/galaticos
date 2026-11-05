import { UserName, userSearchText } from '@/components/user-name'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { emailSchema, Field, nameSchema, PhoneField, validate, type FieldErrors } from '@/components/form'
import { RankBadge } from '@/components/rank'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { avatarUrl, initials, pb, POSITION_LABELS, RANK_LABELS, serverMessage, useUser, type Rank, type User } from '@/lib/pb'
import { formatPhone, phoneSchema } from '@/lib/phone'

const ROLE_LABELS = { member: 'Membro', professor: 'Professor', admin: 'Admin' }

/** Ações de admin sobre um usuário (pb_hooks/admin_users.pb.js). */
async function adminCall(path: string, body: object | undefined, ok: string) {
  try {
    await pb.send(`/api/g/admin/users/${path}`, { method: 'POST', body })
    toast.success(ok)
  } catch (err) {
    toast.error(serverMessage(err))
  }
}

export default function Users() {
  const me = useUser()!.id
  // admin recebe todos, inclusive banidos (listRule) — o filtro por banimento é aqui, campo oculto não filtra na API
  const { data: users, error } = useLiveList<User>('users', { sort: 'name' })
  const [query, setQuery] = useState('')
  const [banned, setBanned] = useState(false)
  const q = query.trim().toLowerCase()
  const list = users?.filter((u) => !!u.bannedAt === banned && userSearchText(u).includes(q))
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = users?.find((u) => u.id === openId)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <NewUserButton />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input type="search" placeholder="Buscar por nome ou apelido" aria-label="Buscar usuário" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-2" role="group" aria-label="Filtro">
          <Button variant={banned ? 'outline' : 'default'} aria-pressed={!banned} onClick={() => setBanned(false)}>Ativos</Button>
          <Button variant={banned ? 'default' : 'outline'} aria-pressed={banned} onClick={() => setBanned(true)}>Banidos</Button>
        </div>
      </div>
      {error && <p className="text-destructive" role="alert">Não foi possível carregar os usuários.</p>}
      {!list ? <p className="text-muted-foreground">Carregando…</p>
        : list.length === 0 ? <p className="text-muted-foreground">Ninguém aqui.</p>
        : <div className="grid gap-2">{list.map((u) => <UserRow key={u.id} user={u} self={u.id === me} onOpen={() => setOpenId(u.id)} />)}</div>}

      {/* busca no `users` (não no `list`): o modal continua aberto e atualizado mesmo se o usuário mudar de filtro (ex.: banido) */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setOpenId(null)}>
        {selected && <UserDialog user={selected} self={selected.id === me} />}
      </Dialog>
    </div>
  )
}

function UserBadges({ user }: { user: User }) {
  return (
    <>
      <RankBadge rank={user.rank} />
      {(user.role === 'admin' || user.role === 'professor') && <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>}
    </>
  )
}

const You = () => <span className="text-muted-foreground"> (você)</span>

function UserHeading({ user, self }: { user: User; self: boolean }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
      <span className="truncate"><UserName user={user} />{self && <You />}</span>
      <UserBadges user={user} />
    </span>
  )
}

function UserRow({ user, self, onOpen }: { user: User; self: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="flex min-w-0 items-center gap-3 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Avatar><AvatarImage src={avatarUrl(user)} alt="" /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
      <span className="grid min-w-0">
        <UserHeading user={user} self={self} />
        <span className="truncate text-sm text-muted-foreground">
          {user.bannedAt ? `Banido: ${user.banReason}` : user.phone ? formatPhone(user.phone) : 'Sem telefone'}
          {!user.verified && <span className="text-amber-500"> · e-mail não confirmado</span>}
        </span>
      </span>
    </button>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function UserDialog({ user, self }: { user: User; self: boolean }) {
  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <div className="flex min-w-0 items-center gap-3 pr-8">
          <Avatar className="size-14"><AvatarImage src={avatarUrl(user)} alt="" /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
          <DialogTitle className="grid min-w-0 gap-1">
            <span className="break-words">{user.name}{self && <You />}</span>
            {user.nickname && <span className="text-sm font-normal break-words text-muted-foreground">“{user.nickname}”</span>}
            <span className="flex flex-wrap gap-2"><UserBadges user={user} /></span>
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">Dados e ações de admin sobre {user.name}</DialogDescription>
      </DialogHeader>

      <dl className="grid gap-2">
        {user.email && <Info label="E-mail">{user.email}</Info>}
        <Info label="Telefone">{user.phone ? formatPhone(user.phone) : 'Sem telefone'}</Info>
        <Info label="Posição">{user.position ? POSITION_LABELS[user.position] : '—'}</Info>
        <Info label="Disponível p/ time">{user.availableForTeam ? 'Sim' : 'Não'}</Info>
        <Info label="Cadastro">{formatDateTime(user.created)}</Info>
      </dl>

      {!user.verified && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 p-3">
          <p className="text-sm text-amber-500">E-mail não confirmado: ainda não consegue entrar.</p>
          <Button size="sm" variant="outline" onClick={() => adminCall(user.id, { verified: true }, `Conta de ${user.name} liberada`)}>Liberar conta</Button>
        </div>
      )}

      {user.bannedAt ? (
        <div className="grid gap-3">
          <p className="text-sm"><span className="text-muted-foreground">Banido em {formatDateTime(user.bannedAt)}:</span> {user.banReason}</p>
          <Button variant="outline" onClick={() => adminCall(`${user.id}/unban`, undefined, `${user.name} desbanido`)}>Desbanir</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`rank-${user.id}`}>Rank</Label>
            <Select value={user.rank || 'regular'} onValueChange={(rank) => adminCall(user.id, { rank }, `Rank de ${user.name}: ${RANK_LABELS[rank as Rank]}`)}>
              <SelectTrigger id={`rank-${user.id}`} className="w-full" aria-label={`Rank de ${user.name}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(RANK_LABELS)).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`role-${user.id}`}>Papel</Label>
            <Select value={user.role || 'member'} disabled={self}
              onValueChange={(role) => adminCall(user.id, { role }, `${user.name} agora é ${ROLE_LABELS[role as keyof typeof ROLE_LABELS].toLowerCase()}`)}>
              <SelectTrigger id={`role-${user.id}`} className="w-full" aria-label={`Papel de ${user.name}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!self && <div className="sm:col-span-2"><BanButton user={user} /></div>}
        </div>
      )}
    </DialogContent>
  )
}

function BanButton({ user }: { user: User }) {
  const [reason, setReason] = useState('')
  return (
    <AlertDialog onOpenChange={(open) => open && setReason('')}>
      <AlertDialogTrigger asChild><Button variant="destructive" className="w-full">Banir</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Banir {user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            A conta é desconectada e não entra mais. Sai das listas e convites de eventos futuros (a fila anda). Dá para desbanir depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="banReason">Motivo</Label>
          <Textarea id="banReason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={!reason.trim()}
            onClick={() => adminCall(`${user.id}/ban`, { reason }, `${user.name} banido`)}>Banir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Cadastro pelo admin: a conta nasce verificada e a pessoa recebe o link para criar a senha. */
function NewUserButton() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Cadastrar</Button></DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar usuário</DialogTitle>
          <DialogDescription>A pessoa recebe um e-mail para criar a senha. A conta já entra confirmada.</DialogDescription>
        </DialogHeader>
        <NewUserForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

const newUserSchema = z.object({ name: nameSchema, email: emailSchema, phone: phoneSchema, rank: z.string(), role: z.string() })

function NewUserForm({ onDone }: { onDone: () => void }) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { data, errors } = validate(newUserSchema, Object.fromEntries(new FormData(e.currentTarget)))
    setErrors(errors ?? {})
    if (!data) return
    setLoading(true)
    try {
      await pb.send('/api/g/admin/users', { method: 'POST', body: data })
      toast.success(`${data.name} cadastrado. Convite enviado para ${data.email}`)
      onDone()
    } catch (err) {
      setErrors({ form: serverMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Nome" name="name" autoComplete="off" error={errors.name} />
      <Field label="E-mail" name="email" type="email" autoComplete="off" error={errors.email} />
      <PhoneField error={errors.phone} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="new-rank">Rank</Label>
          <Select name="rank" defaultValue="regular">
            <SelectTrigger id="new-rank" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(RANK_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-role">Papel</Label>
          <Select name="role" defaultValue="member">
            <SelectTrigger id="new-role" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {errors.form && <p className="text-sm text-destructive" role="alert">{errors.form}</p>}
      <Button type="submit" disabled={loading}>{loading ? 'Cadastrando…' : 'Cadastrar e enviar convite'}</Button>
    </form>
  )
}
