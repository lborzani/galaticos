import { z } from 'zod'

// Telefone do Brasil. Na tela: (11) 91234-5678. Na API: +5511912345678 (o mesmo pattern do servidor).

/** Até 11 dígitos nacionais (DDD + número), aceitando colar com +55. */
export const phoneDigits = (s: string) => s.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11)

/** Máscara progressiva enquanto digita; também formata o +55 vindo da API. */
export function formatPhone(s: string) {
  const d = phoneDigits(s)
  if (d.length <= 2) return d && `(${d}`
  const rest = d.slice(2)
  const split = rest.length > 8 ? 5 : 4
  return `(${d.slice(0, 2)}) ${rest.slice(0, split)}${rest.length > split ? '-' + rest.slice(split) : ''}`
}

export const phoneSchema = z.string()
  .transform(phoneDigits)
  .refine((d) => d.length > 0, 'Informe o telefone')
  .refine((d) => /^[1-9]{2}(9\d{8}|[2-5]\d{7})$/.test(d), 'Telefone inválido. Use DDD + número.')
  .transform((d) => `+55${d}`)

export const whatsappUrl = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`
