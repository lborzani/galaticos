import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/lib/pb'

export function AuthLayout() {
  const user = useUser()
  if (user) return <Navigate to="/" replace />
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm grid gap-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.jpg" alt="" className="size-20 rounded-2xl" />
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
