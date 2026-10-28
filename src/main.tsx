import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout, RequireAdmin } from '@/pages/AppLayout'
import EventForm from '@/pages/admin/EventForm'
import EventDetail from '@/pages/EventDetail'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { ConfirmEmail, ForgotPassword, Login, Register, ResetPassword } from '@/pages/auth/pages'
import Home from '@/pages/Home'
import Passport from '@/pages/Passport'
import Profile from '@/pages/Profile'

// câmera + wasm do leitor só carregam para quem abre o scanner
const Scanner = lazy(() => import('@/pages/admin/Scanner'))
import './index.css'

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/entrar', element: <Login /> },
      { path: '/cadastro', element: <Register /> },
      { path: '/esqueci-senha', element: <ForgotPassword /> },
    ],
  },
  // fora do AuthLayout: o link do e-mail pode ser aberto já logado
  {
    element: <main className="min-h-dvh grid place-items-center px-4"><div className="w-full max-w-sm"><Outlet /></div></main>,
    children: [
      { path: '/confirmar-email/:token', element: <ConfirmEmail /> },
      { path: '/redefinir-senha/:token', element: <ResetPassword /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/perfil', element: <Profile /> },
      { path: '/passaporte', element: <Passport /> },
      { path: '/evento/:id', element: <EventDetail /> },
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin', element: <Suspense fallback={<p className="text-muted-foreground">Abrindo câmera…</p>}><Scanner /></Suspense> },
          { path: '/admin/eventos/novo', element: <EventForm /> },
          { path: '/admin/eventos/:id/editar', element: <EventForm /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  </StrictMode>,
)
