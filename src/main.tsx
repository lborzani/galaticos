import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/pages/AppLayout'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { ConfirmEmail, ForgotPassword, Login, Register, ResetPassword } from '@/pages/auth/pages'
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
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
