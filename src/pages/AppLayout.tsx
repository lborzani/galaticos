import { House, ScanLine, Ticket, User as UserIcon, type LucideIcon } from 'lucide-react'
import { Navigate, NavLink, Outlet } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { avatarUrl, initials, isAdmin, useUser } from '@/lib/pb'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean }

/** Abas inferiores no celular, barra lateral a partir de md. */
export function AppLayout() {
  const user = useUser()
  if (!user) return <Navigate to="/entrar" replace />

  const items: Item[] = [
    { to: '/', label: 'Início', icon: House, end: true },
    { to: '/passaporte', label: 'Passaporte', icon: Ticket },
    ...(isAdmin(user) ? [{ to: '/admin', label: 'Validar', icon: ScanLine, end: true }] : []),
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
              <it.icon className="size-4" /> {it.label}
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
            <it.icon className="size-5" /> {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 font-black">
      <img src="/logo.jpg" alt="" className="size-8 rounded-lg" /> Galáticos
    </NavLink>
  )
}

/** Barra rotas de admin para quem não é admin (a API também recusa). */
export function RequireAdmin() {
  return isAdmin(useUser()) ? <Outlet /> : <Navigate to="/" replace />
}
