import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { PhoneField, validate, type FieldErrors } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { errorMessage, pb, type User } from '@/lib/pb'
import { phoneSchema } from '@/lib/phone'
import { signOut } from '@/lib/push'

/** Conta antiga sem telefone: pede o número antes de liberar o app. */
export default function PhoneGate({ user }: { user: User }) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { data, errors } = validate(z.object({ phone: phoneSchema }), { phone: new FormData(e.currentTarget).get('phone') })
    setErrors(errors ?? {})
    if (!data) return
    setSaving(true)
    try {
      await pb.collection('users').update(user.id, data) // atualiza o authStore e libera o app
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar o telefone.'))
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle><h1>Informe seu telefone</h1></CardTitle>
          <CardDescription>Agora o telefone é obrigatório para jogar com os Galáticos. Só você e os admins veem.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <PhoneField error={errors.phone} />
            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar e continuar'}</Button>
            <Button type="button" variant="ghost" onClick={signOut}>Sair</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
