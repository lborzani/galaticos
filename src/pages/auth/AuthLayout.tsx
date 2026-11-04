import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tribute } from '@/components/tribute'
import { useUser } from '@/lib/pb'

export function AuthLayout() {
  const user = useUser()
  if (user) return <Navigate to="/" replace />
  return (
    // lg: tela dividida, marca à esquerda e formulário à direita
    <main className="min-h-dvh grid place-items-center px-4 py-10 lg:grid-cols-2 lg:p-0">
      <div className="hidden size-full flex-col items-center justify-center gap-4 bg-linear-to-br from-primary to-violet-950 p-12 text-center text-white lg:flex">
        <Tribute><img src="/logo-128.webp" alt="" className="size-32 rounded-3xl shadow-2xl" /></Tribute>
        <h1 className="text-5xl font-black tracking-tight">Galáticos</h1>
        <p className="max-w-xs text-lg text-white/80">Listas, passaporte e times dos jogos do Galáticos.</p>
      </div>
      <div className="w-full max-w-sm grid gap-6">
        <div className="flex flex-col items-center gap-3 lg:hidden">
          <Tribute><img src="/logo-128.webp" alt="" className="size-20 rounded-2xl" /></Tribute>
          <h1 className="text-3xl font-black tracking-tight">Galáticos</h1>
        </div>
        <Outlet />
      </div>
    </main>
  )
}

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
