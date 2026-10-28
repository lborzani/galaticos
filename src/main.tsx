import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { UpdatePrompt } from '@/UpdatePrompt'
import { AppLayout, RequireAdmin } from '@/pages/AppLayout'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import Home from '@/pages/Home'
import './index.css'

/** Cada tela vira um chunk próprio, baixado ao navegar (o service worker deixa tudo em cache depois). */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })
const authPage = (name: 'ConfirmEmail' | 'ForgotPassword' | 'Login' | 'Register' | 'ResetPassword') => async () =>
  ({ Component: (await import('@/pages/auth/pages'))[name] })

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/entrar', lazy: authPage('Login') },
      { path: '/cadastro', lazy: authPage('Register') },
      { path: '/esqueci-senha', lazy: authPage('ForgotPassword') },
    ],
  },
  // fora do AuthLayout: o link do e-mail pode ser aberto já logado
  {
    element: <main className="min-h-dvh grid place-items-center px-4"><div className="w-full max-w-sm"><Outlet /></div></main>,
    children: [
      { path: '/confirmar-email/:token', lazy: authPage('ConfirmEmail') },
      { path: '/redefinir-senha/:token', lazy: authPage('ResetPassword') },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/perfil', lazy: page(() => import('@/pages/Profile')) },
      { path: '/passaporte', lazy: page(() => import('@/pages/Passport')) },
      { path: '/convites', lazy: page(() => import('@/pages/Inbox')) },
      { path: '/evento/:id', lazy: page(() => import('@/pages/EventDetail')) },
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin', lazy: page(() => import('@/pages/admin/Scanner')) },
          { path: '/admin/eventos/novo', lazy: page(() => import('@/pages/admin/EventForm')) },
          { path: '/admin/eventos/:id/editar', lazy: page(() => import('@/pages/admin/EventForm')) },
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
      <UpdatePrompt />
    </ThemeProvider>
  </StrictMode>,
)
