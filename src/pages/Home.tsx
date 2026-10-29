import { EventSections } from '@/components/events'
import type { GEvent } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { useUser } from '@/lib/pb'

export default function Home() {
  const user = useUser()!
  const { data, error } = useLiveList<GEvent>('events', { sort: '-eventDate', expand: 'court' })
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Olá, {user.name.split(' ')[0]}!</h1>
      {error && <p className="text-destructive" role="alert">Não foi possível carregar os eventos.</p>}
      <EventSections events={data} empty="Nenhum evento marcado por enquanto." />
    </div>
  )
}
