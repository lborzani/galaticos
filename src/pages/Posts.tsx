import { Heart, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { EventCard } from '@/components/events'
import { Field, validate, type FieldErrors } from '@/components/form'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, type GEvent, type Post, type PostLike } from '@/lib/events'
import { useLiveList, useNow } from '@/lib/live'
import { avatarUrl, errorMessage, initials, isAdmin, pb, useUser, type User } from '@/lib/pb'

export default function Posts() {
  const user = useUser()!
  const admin = isAdmin(user)
  const [writing, setWriting] = useState(false)
  const { data: posts, error } = useLiveList<Post>('posts', { sort: '-created', expand: 'author,event.court' })
  const { data: likes } = useLiveList<PostLike>('post_likes', { filter: pb.filter('user = {:u}', { u: user.id }) })
  const likeOf = new Map(likes?.map((l) => [l.post, l.id]))
  const now = useNow(30_000)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        {admin && !writing && <Button onClick={() => setWriting(true)}><Plus /> Novo post</Button>}
      </div>
      {writing && <PostForm user={user} onDone={() => setWriting(false)} />}
      {error && <p className="text-destructive" role="alert">Não foi possível carregar os posts.</p>}
      {!posts ? <p className="text-muted-foreground">Carregando…</p>
        : posts.length === 0 ? <p className="text-muted-foreground">Nenhum post por enquanto.</p>
        : posts.map((p) => <PostCard key={p.id} post={p} likeId={likeOf.get(p.id)} user={user} canDelete={admin} now={now} />)}
    </div>
  )
}

function PostCard({ post, likeId, user, canDelete, now }: { post: Post; likeId?: string; user: User; canDelete: boolean; now: Date }) {
  const author = post.expand?.author
  const [busy, setBusy] = useState(false)

  async function toggleLike() {
    setBusy(true)
    try {
      if (likeId) await pb.collection('post_likes').delete(likeId)
      else await pb.collection('post_likes').create({ post: post.id, user: user.id })
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível curtir.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    try {
      await pb.collection('posts').delete(post.id)
      toast.success('Post apagado')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível apagar.'))
    }
  }

  return (
    <Card role="article" aria-label={`Post de ${author?.name ?? ''}`}>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <Avatar><AvatarImage src={avatarUrl(author ?? null)} alt="" /><AvatarFallback>{initials(author?.name ?? '')}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{author?.name}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(post.created)}</p>
          </div>
          {canDelete && <DeletePost onConfirm={remove} />}
        </div>
        <p className="whitespace-pre-wrap break-words">{post.body}</p>
        {post.images.length > 0 && (
          <div className={post.images.length > 1 ? 'grid grid-cols-2 gap-2' : 'grid'}>
            {post.images.map((img) => (
              <a key={img} href={pb.files.getURL(post, img)} target="_blank" rel="noreferrer">
                <img src={pb.files.getURL(post, img, { thumb: '800x0' })} alt="Foto do post" loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
        {post.expand?.event && <EventCard event={post.expand.event} now={now} />}
        <div>
          <Button variant={likeId ? 'default' : 'outline'} size="sm" disabled={busy} onClick={toggleLike}
            aria-pressed={!!likeId} aria-label={likeId ? 'Descurtir' : 'Curtir'}>
            <Heart className={likeId ? 'fill-current' : ''} /> {post.likesCount}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DeletePost({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Apagar post"><Trash2 /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar post?</AlertDialogTitle>
          <AlertDialogDescription>As curtidas também somem. Não dá para desfazer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>Apagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const MAX_IMAGES = 4
const MAX_SIZE = 5 * 1024 * 1024
const schema = z.object({
  body: z.string().trim().min(1, 'Escreva o texto do post').max(2000, 'Máximo de 2000 caracteres'),
  images: z.array(z.instanceof(File)).max(MAX_IMAGES, `Máximo de ${MAX_IMAGES} fotos`)
    .refine((fs) => fs.every((f) => f.size <= MAX_SIZE), 'Cada foto pode ter até 5 MB'),
})

function PostForm({ user, onDone }: { user: User; onDone: () => void }) {
  const [form, setForm] = useState({ body: '', images: [] as File[], event: 'none' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const { data: events } = useLiveList<GEvent>('events', { filter: "cancelledAt = ''", sort: '-eventDate' })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { data, errors } = validate(schema, form)
    setErrors(errors ?? {})
    if (!data) return
    const body = new FormData()
    body.append('author', user.id)
    body.append('body', data.body)
    data.images.forEach((f) => body.append('images', f))
    if (form.event !== 'none') body.append('event', form.event)
    setSaving(true)
    try {
      await pb.collection('posts').create(body)
      toast.success('Post publicado')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível publicar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field label="Texto" name="postBody" error={errors.body}>
            <Textarea id="postBody" rows={4} maxLength={2000} value={form.body} aria-invalid={!!errors.body}
              aria-describedby={errors.body ? 'postBody-error' : undefined} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <Field label={`Fotos (até ${MAX_IMAGES}, opcional)`} name="postImages" error={errors.images}>
            <input id="postImages" type="file" multiple accept="image/jpeg,image/png,image/webp"
              className="text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-foreground"
              onChange={(e) => setForm({ ...form, images: [...(e.target.files ?? [])] })} />
          </Field>
          <Field label="Evento (opcional)" name="postEvent">
            <Select value={form.event} onValueChange={(event) => setForm({ ...form, event })}>
              <SelectTrigger id="postEvent" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {events?.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title} · {formatDateTime(ev.eventDate)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Publicando…' : 'Publicar'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
