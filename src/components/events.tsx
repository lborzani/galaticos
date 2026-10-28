import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useNow } from '@/lib/live'
import { deriveStatus, formatDateTime, isPast, parseDate, STATUS_META, TYPE_LABELS, type EventStatus, type GEvent } from '@/lib/events'

export function StatusBadge({ status }: { status: EventStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function EventCard({ event, now }: { event: GEvent; now: Date }) {
  return (
    <Link to={`/evento/${event.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
      <Card className="gap-2 px-4 py-4 transition-colors hover:bg-muted/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{TYPE_LABELS[event.type]}</p>
            <h3 className="truncate font-semibold">{event.title}</h3>
          </div>
          <StatusBadge status={deriveStatus(event, now)} />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> {formatDateTime(event.eventDate)}</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> {event.location}</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" /> {event.confirmedCount}/{event.maxParticipants} confirmados
          {event.waitlistCount > 0 && ` · ${event.waitlistCount} na espera`}
        </p>
      </Card>
    </Link>
  )
}

/** Lista dividida em próximos (data crescente) e anteriores (data decrescente). */
export function EventSections({ events, empty }: { events: GEvent[] | undefined; empty: string }) {
  const now = useNow(30_000)
  if (!events) return <p className="text-muted-foreground">Carregando…</p>
  const byDate = (a: GEvent, b: GEvent) => parseDate(a.eventDate).getTime() - parseDate(b.eventDate).getTime()
  const upcoming = events.filter((e) => !isPast(deriveStatus(e, now))).sort(byDate)
  const past = events.filter((e) => isPast(deriveStatus(e, now))).sort((a, b) => byDate(b, a))

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Próximos</h2>
        {upcoming.length ? upcoming.map((e) => <EventCard key={e.id} event={e} now={now} />) : <p className="text-muted-foreground">{empty}</p>}
      </section>
      {past.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Anteriores</h2>
          {past.map((e) => <EventCard key={e.id} event={e} now={now} />)}
        </section>
      )}
    </div>
  )
}
