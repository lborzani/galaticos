import type { ReactNode } from 'react'
import type { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type FieldErrors = Partial<Record<string, string>>

/** Valida com zod e devolve os dados ou o primeiro erro de cada campo. */
export function validate<T extends z.ZodType>(schema: T, data: unknown):
  | { data: z.infer<T>; errors?: undefined }
  | { data?: undefined; errors: FieldErrors } {
  const r = schema.safeParse(data)
  if (r.success) return { data: r.data }
  const errors: FieldErrors = {}
  for (const issue of r.error.issues) errors[String(issue.path[0])] ??= issue.message
  return { errors }
}

export function Field({ label, name, error, children, ...input }: {
  label: string
  name: string
  error?: string
  children?: ReactNode
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children ?? <Input id={name} name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...input} />}
      {error && <p id={`${name}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
