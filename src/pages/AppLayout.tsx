import { Navigate, NavLink, Outlet } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarUrl, initials, useUser } from '@/lib/pb'

// ponytail: layout mínimo; a navegação responsiva (abas/sidebar) chega na fase 2
export function AppLayout() {
  const user = useUser()
  if (!user) return <Navigate to="/entrar" replace />
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-black">
            <img src="/logo.jpg" alt="" className="size-8 rounded-lg" /> Galáticos
          </NavLink>
          <NavLink to="/perfil" aria-label="Meu perfil">
            <Avatar><AvatarImage src={avatarUrl(user)} alt="" /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6"><Outlet /></main>
    </div>
  )
}
