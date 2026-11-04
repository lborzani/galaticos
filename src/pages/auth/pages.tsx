import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, PhoneField, validate, type FieldErrors } from '@/components/form'
import { ClientResponseError } from 'pocketbase'
import { errorMessage, pb } from '@/lib/pb'
import { phoneSchema } from '@/lib/phone'
import { AuthCard } from './AuthLayout'

const email = z.string().trim().email('E-mail inválido')
const password = z.string().min(8, 'Mínimo de 8 caracteres')
const passwordPair = z
  .object({ password, passwordConfirm: z.string() })
  .refine((d) => d.password === d.passwordConfirm, { message: 'As senhas não coincidem', path: ['passwordConfirm'] })

const formData = (e: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(e.currentTarget))

export function Login() {
  const navigate = useNavigate()
  const notice = (useLocation().state as { notice?: string } | null)?.notice
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failedEmail, setFailedEmail] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { data, errors } = validate(z.object({ email, password: z.string().min(1, 'Informe a senha') }), formData(e))
    setErrors(errors ?? {})
    if (!data) return
    setLoading(true)
    try {
      await pb.collection('users').authWithPassword(data.email, data.password)
      navigate('/', { replace: true })
    } catch (err) {
      // conta suspensa (pb_hooks/admin_users.pb.js); e-mail não confirmado também dá 403, por isso olha a mensagem
      const suspended = err instanceof ClientResponseError && err.status === 403 && err.response.message?.startsWith('Conta suspensa')
      setFailedEmail(suspended ? undefined : data.email)
      setErrors({ form: suspended ? err.response.message : errorMessage(err, 'E-mail ou senha incorretos, ou e-mail ainda não confirmado.') })
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    try {
      await pb.collection('users').requestVerification(failedEmail!)
      toast.success('Se a conta existir, enviamos um novo link de confirmação.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <AuthCard title="Entrar" description={notice}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="E-mail" name="email" type="email" autoComplete="email" error={errors.email} />
        <Field label="Senha" name="password" type="password" autoComplete="current-password" error={errors.password} />
        {errors.form && (
          <div className="grid gap-2 text-sm" role="alert">
            <p className="text-destructive">{errors.form}</p>
            {failedEmail && (
              <Button type="button" variant="link" className="h-auto justify-start p-0" onClick={resend}>
                Reenviar e-mail de confirmação
              </Button>
            )}
          </div>
        )}
        <Button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</Button>
        <div className="flex justify-between text-sm">
          <Link to="/esqueci-senha" className="text-muted-foreground hover:underline">Esqueci a senha</Link>
          <Link to="/cadastro" className="text-primary hover:underline">Criar conta</Link>
        </div>
      </form>
    </AuthCard>
  )
}

export function Register() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const schema = z.object({ name: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(50), email, phone: phoneSchema }).and(passwordPair)
    const { data, errors } = validate(schema, formData(e))
    setErrors(errors ?? {})
    if (!data) return
    setLoading(true)
    try {
      await pb.collection('users').create(data)
      await pb.collection('users').requestVerification(data.email)
      navigate('/entrar', { state: { notice: 'Conta criada! Confirme pelo link que enviamos para o seu e-mail e depois entre.' } })
    } catch (err) {
      setErrors({ form: errorMessage(err, 'Não foi possível criar a conta. Esse e-mail pode já estar em uso.') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Nome" name="name" autoComplete="name" error={errors.name} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" error={errors.email} />
        <PhoneField error={errors.phone} />
        <Field label="Senha" name="password" type="password" autoComplete="new-password" error={errors.password} />
        <Field label="Confirmar senha" name="passwordConfirm" type="password" autoComplete="new-password" error={errors.passwordConfirm} />
        {errors.form && <p className="text-sm text-destructive" role="alert">{errors.form}</p>}
        <Button type="submit" disabled={loading}>{loading ? 'Criando…' : 'Criar conta'}</Button>
        <Link to="/entrar" className="text-sm text-center text-muted-foreground hover:underline">Já tenho conta</Link>
      </form>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { data, errors } = validate(z.object({ email }), formData(e))
    setErrors(errors ?? {})
    if (!data) return
    try {
      await pb.collection('users').requestPasswordReset(data.email)
      setSent(true)
    } catch (err) {
      setErrors({ form: errorMessage(err) })
    }
  }

  return (
    <AuthCard title="Esqueci a senha" description={sent ? 'Se a conta existir, enviamos um link para criar uma nova senha.' : undefined}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {!sent && <Field label="E-mail" name="email" type="email" autoComplete="email" error={errors.email} />}
        {errors.form && <p className="text-sm text-destructive" role="alert">{errors.form}</p>}
        {!sent && <Button type="submit">Enviar link</Button>}
        <Link to="/entrar" className="text-sm text-center text-muted-foreground hover:underline">Voltar para o login</Link>
      </form>
    </AuthCard>
  )
}

export function ConfirmEmail() {
  const { token } = useParams()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    pb.collection('users').confirmVerification(token!).then(() => setStatus('ok'), () => setStatus('error'))
  }, [token])

  const text = {
    loading: 'Confirmando…',
    ok: 'E-mail confirmado! Agora é só entrar.',
    error: 'Link inválido ou expirado. Tente entrar para receber um novo link.',
  }[status]

  return (
    <AuthCard title="Confirmação de e-mail" description={text}>
      {status !== 'loading' && <Button asChild className="w-full"><Link to="/entrar">Ir para o login</Link></Button>}
    </AuthCard>
  )
}

export function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<FieldErrors>({})

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { data, errors } = validate(passwordPair, formData(e))
    setErrors(errors ?? {})
    if (!data) return
    try {
      await pb.collection('users').confirmPasswordReset(token!, data.password, data.passwordConfirm)
      navigate('/entrar', { state: { notice: 'Senha alterada. Entre com a nova senha.' } })
    } catch (err) {
      setErrors({ form: errorMessage(err, 'Link inválido ou expirado. Peça um novo.') })
    }
  }

  return (
    <AuthCard title="Nova senha">
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Nova senha" name="password" type="password" autoComplete="new-password" error={errors.password} />
        <Field label="Confirmar senha" name="passwordConfirm" type="password" autoComplete="new-password" error={errors.passwordConfirm} />
        {errors.form && <p className="text-sm text-destructive" role="alert">{errors.form}</p>}
        <Button type="submit">Salvar senha</Button>
      </form>
    </AuthCard>
  )
}
