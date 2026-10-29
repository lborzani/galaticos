import { House, Mail, Newspaper, ShieldCheck, Ticket, User as UserIcon, type LucideIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Invite } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { avatarUrl, initials, isAdmin, pb, useUser, type User } from '@/lib/pb'

const PhoneGate = lazy(() => import('./PhoneGate'))

type Item ={ to: string; label: string; icon: LucideIcon; end?: boolean; count?: number }

/** Abas inferiores no celular, barra lateral a partir de md. */
export function AppLayout() {
  const user = useUser()
  if (!user) return <Navigate to="/entrar" replace />
  if (!user.phone) return <Suspense><PhoneGate user={user} /></Suspense>
  return <Shell user={user} />
}

function Shell({ user }: { user: User }) {
  const { data: pending } = useLiveList<Invite>('invites', { filter: pb.filter('player = {:u} && status = "pending"', { u: user.id }) })

  const items: Item[] = [
    { to: '/', label: 'Início', icon: House, end: true },
    { to: '/posts', label: 'Posts', icon: Newspaper },
    { to: '/passaporte', label: 'Passaporte', icon: Ticket },
    { to: '/convites', label: 'Convites', icon: Mail, count: pending?.length },
    ...(isAdmin(user) ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
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
                isActive && 'bg-accent text-accent-foreground')}>
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

      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28 md:pb-10">
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

/** Barra rotas de admin para quem não é admin (a API também recusa). */
export function RequireAdmin() {
  return isAdmin(useUser()) ? <Outlet /> : <Navigate to="/" replace />
}
