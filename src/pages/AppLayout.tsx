import { House, Mail, ScanLine, Smartphone, Ticket, User as UserIcon, type LucideIcon } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Invite } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { avatarUrl, initials, isAdmin, pb, useUser, type User } from '@/lib/pb'

/** mobileOnly: QR e câmera não fazem sentido no computador, some da barra lateral a partir de lg. */
type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; count?: number; mobileOnly?: boolean }

/** Abas inferiores no celular, barra lateral a partir de md; conteúdo largo a partir de lg. */
export function AppLayout() {
  const user = useUser()
  if (!user) return <Navigate to="/entrar" replace />
  return <Shell user={user} />
}

function Shell({ user }: { user: User }) {
  const { data: pending } = useLiveList<Invite>('invites', { filter: pb.filter('player = {:u} && status = "pending"', { u: user.id }) })

  const items: Item[] = [
    { to: '/', label: 'Início', icon: House, end: true },
    { to: '/passaporte', label: 'Passaporte', icon: Ticket, mobileOnly: true },
    { to: '/convites', label: 'Convites', icon: Mail, count: pending?.length },
    ...(isAdmin(user) ? [{ to: '/admin', label: 'Validar', icon: ScanLine, end: true, mobileOnly: true }] : []),
    { to: '/perfil', label: 'Perfil', icon: UserIcon },
  ]

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden md:flex sticky top-0 h-dvh flex-col gap-6 border-r bg-card/40 p-4">
        <Logo />
        <nav className="grid gap-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                isActive && 'bg-accent text-accent-foreground', it.mobileOnly && 'lg:hidden')}>
              <it.icon className="size-4" /> {it.label} <Count n={it.count} />
            </NavLink>
          ))}
        </nav>
        <NavLink to="/perfil" className="mt-auto flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
          <Avatar><AvatarImage src={avatarUrl(user)} alt="" /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
          <span className="truncate text-sm">{user.name}</span>
        </NavLink>
      </aside>

      <header className="md:hidden sticky top-0 z-10 border-b bg-background/80 px-4 py-3 backdrop-blur">
        <Logo />
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28 md:pb-10 lg:max-w-6xl lg:px-8 lg:pt-8">
        <Outlet />
      </main>

      <nav aria-label="Navegação principal"
        className="md:hidden fixed inset-x-0 bottom-0 z-10 grid border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground', isActive && 'text-primary')}>
            <span className="relative"><it.icon className="size-5" /><Count n={it.count} floating /></span> {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Count({ n, floating }: { n?: number; floating?: boolean }) {
  if (!n) return null
  return (
    <span aria-label={`${n} pendente${n > 1 ? 's' : ''}`}
      className={cn('grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground',
        floating ? 'absolute -right-2 -top-1' : 'ml-auto')}>
      {n}
    </span>
  )
}

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 font-black">
      <img src="/logo-128.webp" alt="" className="size-8 rounded-lg" /> Galáticos
    </NavLink>
  )
}

const desktop = window.matchMedia('(min-width: 64rem)') // = lg do Tailwind
const subscribe = (cb: () => void) => { desktop.addEventListener('change', cb); return () => desktop.removeEventListener('change', cb) }

/** Passaporte e validação só no celular: no desktop nem renderiza (o scanner não pede câmera à toa). */
export function MobileOnly() {
  if (!useSyncExternalStore(subscribe, () => desktop.matches)) return <Outlet />
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Abra no celular</h1>
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <Smartphone className="size-5 shrink-0 text-primary" /> O passaporte e a validação usam QR Code e câmera, por isso ficam só no app do celular.
        </CardContent>
      </Card>
    </div>
  )
}

/** Barra rotas de admin para quem não é admin (a API também recusa). */
export function RequireAdmin() {
  return isAdmin(useUser()) ? <Outlet /> : <Navigate to="/" replace />
}
