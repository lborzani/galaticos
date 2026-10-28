import type { RecordModel } from 'pocketbase'

export type EventType = 'wednesday' | 'sunday' | 'custom' | 'prime'
export type EventStatus = 'upcoming' | 'open' | 'full' | 'in_progress' | 'finished' | 'cancelled'

export interface GEvent extends RecordModel {
  title: string
  type: EventType
  eventDate: string
  registrationOpensAt: string
  location: string
  maxParticipants: number
  createdBy: string
  cancelledAt: string
  cancellationReason: string
  confirmedCount: number
  waitlistCount: number
}

export type RegistrationStatus = 'confirmed' | 'waitlist' | 'cancelled' | 'attended'

export interface Registration extends RecordModel {
  event: string
  user: string
  status: RegistrationStatus
  position: number
  expand?: { user?: import('./pb').User }
}

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export interface Invite extends RecordModel {
  event: string
  captain: string
  player: string
  status: InviteStatus
  expand?: { event?: GEvent; captain?: import('./pb').User; player?: import('./pb').User }
}

export const TYPE_LABELS: Record<EventType, string> = {
  wednesday: 'Bate-bola Quarta',
  sunday: 'Bate-bola Domingo',
  custom: 'Personalizado',
  prime: 'Prime',
}

/** Vagas fixas por tipo (espelha pb_hooks/events.pb.js). `custom` é livre. */
export const FIXED_MAX: Partial<Record<EventType, number>> = { wednesday: 3, sunday: 28, prime: 3 }

export const STATUS_META: Record<EventStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  upcoming: { label: 'Em breve', variant: 'outline' },
  open: { label: 'Lista aberta', variant: 'default' },
  full: { label: 'Lotado', variant: 'secondary' },
  in_progress: { label: 'Acontecendo agora', variant: 'default' },
  finished: { label: 'Encerrado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

// ponytail: eventos não têm horário de término; assume 3h. Vira campo `endsAt` se surgir evento mais longo.
const EVENT_DURATION_MS = 3 * 3600_000

/** Datas do PocketBase vêm como "2026-10-30 13:00:00.000Z"; o Safari não aceita o espaço. */
export const parseDate = (s: string) => new Date(s.replace(' ', 'T'))

export function deriveStatus(ev: GEvent, now = new Date()): EventStatus {
  if (ev.cancelledAt) return 'cancelled'
  const start = parseDate(ev.eventDate).getTime()
  const t = now.getTime()
  if (t >= start + EVENT_DURATION_MS) return 'finished'
  if (t >= start) return 'in_progress'
  if (t < parseDate(ev.registrationOpensAt).getTime()) return 'upcoming'
  return ev.confirmedCount >= ev.maxParticipants ? 'full' : 'open'
}

export const isPast = (s: EventStatus) => s === 'finished' || s === 'cancelled'

const fmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export const formatDateTime = (s: string) => fmt.format(parseDate(s))

/** Date ⇄ valor de <input type="datetime-local"> (hora local). */
export function toLocalInput(s: string) {
  if (!s) return ''
  const d = parseDate(s)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
export const fromLocalInput = (v: string) => new Date(v).toISOString()
