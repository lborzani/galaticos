import { useUser } from '@/lib/pb'

export default function Home() {
  const user = useUser()!
  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-bold">Olá, {user.name.split(' ')[0]}!</h1>
      <p className="text-muted-foreground">Os eventos aparecem aqui em breve.</p>
    </section>
  )
}
