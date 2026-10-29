import { Plus, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { EventSections } from '@/components/events'
import { Button } from '@/components/ui/button'
import type { GEvent } from '@/lib/events'
import { useLiveList } from '@/lib/live'
import { isAdmin, useUser } from '@/lib/pb'

export default function Home() {
  const user = useUser()!
  const { data, error } = useLiveList<GEvent>('events', { sort: '-eventDate', expand: 'court' })
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Olá, {user.name.split(' ')[0]}!</h1>
        {isAdmin(user) && (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" asChild><Link to="/admin/config" aria-label="Configurações"><Settings /></Link></Button>
            <Button asChild><Link to="/admin/eventos/novo"><Plus /> Novo evento</Link></Button>
          </div>
        )}
      </div>
      {error && <p className="text-destructive" role="alert">Não foi possível carregar os eventos.</p>}
      <EventSections events={data} empty="Nenhum evento marcado por enquanto." />
    </div>
  )
}
