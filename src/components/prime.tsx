import { Crown, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { GEvent, Invite, Registration } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { avatarUrl, initials, pb, POSITION_LABELS, rankAllowed, serverMessage, useUser, type User } from '@/lib/pb'
import { RankBadge } from './rank'

const TEAM_COLORS = ['border-l-violet-500', 'border-l-sky-500', 'border-l-amber-500']

/** Times do Prime: cada capitão confirmado + seus convites aceitos/pendentes, ao vivo. */
export function PrimeTeams({ event, captains, canInvite }: { event: GEvent; captains: Registration[]; canInvite: boolean }) {
  const me = useUser()!.id
  const { data: invites } = useLiveList<Invite>('invites', {
    filter: pb.filter('event = {:e} && (status = "pending" || status = "accepted")', { e: event.id }),
    sort: 'created',
    expand: 'player',
  })

  if (captains.length === 0) {
    return <p className="text-sm text-muted-foreground">Os times aparecem aqui conforme os capitães confirmam presença.</p>
  }

  const isCaptain = captains.some((c) => c.user === me)
  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Times</h2>
      {captains.map((cap, i) => (
        <TeamCard key={cap.id} captain={cap} color={TEAM_COLORS[i % TEAM_COLORS.length]} mine={cap.user === me}
          members={invites?.filter((inv) => inv.captain === cap.user) ?? []} />
      ))}
      {isCaptain && canInvite && invites && <InvitePlayers event={event} captains={captains} invites={invites} />}
    </div>
  )
}

function TeamCard({ captain, members, color, mine }: { captain: Registration; members: Invite[]; color: string; mine: boolean }) {
  const cap = captain.expand?.user
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="size-4 text-amber-500" aria-hidden /> Time de {cap?.name ?? 'Capitão'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3" aria-label={`Time de ${cap?.name ?? 'Capitão'}`}>
          {members.length === 0 && <li className="text-sm text-muted-foreground">Ainda sem jogadores.</li>}
          {members.map((inv) => <Member key={inv.id} invite={inv} canCancel={mine && inv.status === 'pending'} />)}
        </ul>
      </CardContent>
    </Card>
  )
}

function Member({ invite, canCancel }: { invite: Invite; canCancel: boolean }) {
  const p = invite.expand?.player
  async function cancel() {
    try {
      await pb.send(`/api/g/invites/${invite.id}/cancel`, { method: 'POST' })
    } catch (err) {
      toast.error(serverMessage(err))
    }
  }
  return (
    <li className="flex items-center gap-3">
      <PlayerAvatar user={p} />
      <span className="truncate text-sm">{p?.name ?? 'Jogador'}</span>
      <RankBadge rank={p?.rank} />
      {invite.status === 'pending' && <Badge variant="outline">aguardando</Badge>}
      {canCancel && (
        <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={cancel} aria-label={`Cancelar convite de ${p?.name}`}>
          <X />
        </Button>
      )}
    </li>
  )
}

function InvitePlayers({ event, captains, invites }: { event: GEvent; captains: Registration[]; invites: Invite[] }) {
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState<string>()
  const { data: users } = useLiveList<User>('users', { filter: 'availableForTeam = true', sort: 'name' })

  const taken = new Set([...captains.map((c) => c.user), ...invites.map((i) => i.player)])
  const q = query.trim().toLowerCase()
  const available = users?.filter((u) => !taken.has(u.id) && rankAllowed(event.allowedRanks, u.rank) && u.name.toLowerCase().includes(q))

  async function invite(player: User) {
    setSending(player.id)
    try {
      await pb.send(`/api/g/events/${event.id}/invites`, { method: 'POST', body: { player: player.id } })
      toast.success(`Convite enviado para ${player.name}`)
    } catch (err) {
      toast.error(serverMessage(err))
    } finally {
      setSending(undefined)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Convidar jogadores</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <Input type="search" placeholder="Buscar por nome" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar jogador" />
        {!available ? <p className="text-sm text-muted-foreground">Carregando…</p> : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum jogador disponível. Jogadores aparecem aqui quando marcam "Disponível para times Prime" no perfil.</p>
        ) : (
          <ul className="grid gap-3" aria-label="Jogadores disponíveis">
            {available.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <PlayerAvatar user={u} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm"><span className="truncate">{u.name}</span><RankBadge rank={u.rank} /></p>
                  {u.position && <p className="text-xs text-muted-foreground">{POSITION_LABELS[u.position]}</p>}
                </div>
                <Button size="sm" variant="outline" className="ml-auto" disabled={sending === u.id} onClick={() => invite(u)}
                  aria-label={`Convidar ${u.name}`}>Convidar</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function PlayerAvatar({ user }: { user?: User }) {
  return (
    <Avatar size="sm">
      <AvatarImage src={avatarUrl(user ?? null)} alt="" />
      <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
    </Avatar>
  )
}
