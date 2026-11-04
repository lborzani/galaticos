import { useState } from 'react'
import { toast } from 'sonner'
import { RankBadge } from '@/components/rank'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { avatarUrl, initials, pb, RANK_LABELS, serverMessage, useUser, type Rank, type User } from '@/lib/pb'
import { formatPhone } from '@/lib/phone'

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
  const list = users?.filter((u) => !!u.bannedAt === banned && u.name.toLowerCase().includes(q))

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Usuários</h1>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input type="search" placeholder="Buscar por nome" aria-label="Buscar usuário" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-2" role="group" aria-label="Filtro">
          <Button variant={banned ? 'outline' : 'default'} aria-pressed={!banned} onClick={() => setBanned(false)}>Ativos</Button>
          <Button variant={banned ? 'default' : 'outline'} aria-pressed={banned} onClick={() => setBanned(true)}>Banidos</Button>
        </div>
      </div>
      {error && <p className="text-destructive" role="alert">Não foi possível carregar os usuários.</p>}
      {!list ? <p className="text-muted-foreground">Carregando…</p>
        : list.length === 0 ? <p className="text-muted-foreground">Ninguém aqui.</p>
        : list.map((u) => <UserCard key={u.id} user={u} self={u.id === me} />)}
    </div>
  )
}

function UserCard({ user, self }: { user: User; self: boolean }) {
  return (
    <Card role="group" aria-label={user.name}>
      <CardContent className="grid gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar><AvatarImage src={avatarUrl(user)} alt="" /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
          <div className="grid min-w-0">
            <p className="flex min-w-0 items-center gap-2 font-medium">
              <span className="truncate">{user.name}{self && <span className="text-muted-foreground"> (você)</span>}</span>
              <RankBadge rank={user.rank} />
              {user.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
            </p>
            <p className="text-sm text-muted-foreground">{user.phone ? formatPhone(user.phone) : 'Sem telefone'}</p>
          </div>
        </div>

        {user.bannedAt ? (
          <div className="grid gap-3">
            <p className="text-sm"><span className="text-muted-foreground">Banido em {formatDateTime(user.bannedAt)}:</span> {user.banReason}</p>
            <Button variant="outline" onClick={() => adminCall(`${user.id}/unban`, undefined, `${user.name} desbanido`)}>Desbanir</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
                onValueChange={(role) => adminCall(user.id, { role }, role === 'admin' ? `${user.name} agora é admin` : `${user.name} agora é membro`)}>
                <SelectTrigger id={`role-${user.id}`} className="w-full" aria-label={`Papel de ${user.name}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!self && <BanButton user={user} />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BanButton({ user }: { user: User }) {
  const [reason, setReason] = useState('')
  return (
    <AlertDialog onOpenChange={(open) => open && setReason('')}>
      <AlertDialogTrigger asChild><Button variant="destructive">Banir</Button></AlertDialogTrigger>
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
