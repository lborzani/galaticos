import PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { eventData, member } from './helpers'
import { FAKE_PUSH_URL } from './setup'

const uid = (pb: PocketBase) => pb.authStore.record!.id
// PNG 1x1 válido (o PocketBase confere o tipo pelo conteúdo)
const png = () => new File([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0))], 'foto.png', { type: 'image/png' })

async function newPost(over: Record<string, unknown> = {}) {
  const adm = await member('Admin', 'admin')
  const post = await adm.collection('posts').create({ author: uid(adm), body: 'Aviso importante', ...over })
  return { adm, post }
}

const likes = async (pb: PocketBase, id: string) => (await pb.collection('posts').getOne(id)).likesCount

describe('posts', () => {
  it('admin publica com fotos e evento; membro só lê', async () => {
    const adm = await member('Admin', 'admin')
    const ev = await adm.collection('events').create(eventData(uid(adm)))
    const form = new FormData()
    form.append('author', uid(adm))
    form.append('body', 'Bate-bola confirmado!')
    form.append('event', ev.id)
    form.append('images', png())
    form.append('images', png())
    const post = await adm.collection('posts').create(form)
    expect(post.images).toHaveLength(2)

    const pb = await member()
    const seen = await pb.collection('posts').getOne(post.id, { expand: 'event,author' })
    expect(seen.expand?.event.id).toBe(ev.id)
    expect(seen.expand?.author.name).toBe('Admin')
    await expect(pb.collection('posts').create({ author: uid(pb), body: 'Hack' })).rejects.toThrow()
    await expect(pb.collection('posts').delete(post.id)).rejects.toThrow()
  })

  it('autor e contador não são forjáveis; post não é editável', async () => {
    const { adm, post } = await newPost()
    const other = await member()
    await expect(adm.collection('posts').create({ author: uid(other), body: 'Em nome de outro' })).rejects.toThrow()
    await expect(adm.collection('posts').create({ author: uid(adm), body: 'Inflado', likesCount: 99 })).rejects.toThrow()
    await expect(adm.collection('posts').update(post.id, { body: 'Editado' })).rejects.toThrow()
  })

  it('curtir e descurtir mantém o contador; uma curtida por membro', async () => {
    const { post } = await newPost()
    const [a, b] = await Promise.all([member('Ana'), member('Bia')])
    const like = await a.collection('post_likes').create({ post: post.id, user: uid(a) })
    await b.collection('post_likes').create({ post: post.id, user: uid(b) })
    expect(await likes(a, post.id)).toBe(2)

    await expect(a.collection('post_likes').create({ post: post.id, user: uid(a) })).rejects.toMatchObject({ status: 400 })
    await expect(a.collection('post_likes').create({ post: post.id, user: uid(b) })).rejects.toThrow()
    await expect(b.collection('post_likes').delete(like.id)).rejects.toThrow()

    await a.collection('post_likes').delete(like.id)
    expect(await likes(a, post.id)).toBe(1)
  })

  it('apagar post apaga as curtidas', async () => {
    const { adm, post } = await newPost()
    const a = await member()
    await a.collection('post_likes').create({ post: post.id, user: uid(a) })
    await adm.collection('posts').delete(post.id)
    expect(await a.collection('post_likes').getFullList({ filter: `post = "${post.id}"` })).toHaveLength(0)
  })

  it('post novo avisa todos os aparelhos, menos o de quem publicou', async () => {
    const adm = await member('Admin', 'admin')
    const pb = await member()
    const device = async (p: PocketBase) => {
      const endpoint = `https://push.test/${crypto.randomUUID()}`
      await p.send('/api/g/push/subscribe', { method: 'POST', body: { endpoint, keys: { p256dh: 'p', auth: 'a' } } })
      return endpoint
    }
    const [dAdm, dPb] = await Promise.all([device(adm), device(pb)])
    const post = await adm.collection('posts').create({ author: uid(adm), body: 'x'.repeat(200) })

    const sent = (await (await fetch(`${FAKE_PUSH_URL}/sent`)).json()) as { endpoint: string; payload: { title: string; body: string; tag: string } }[]
    const mine = (d: string) => sent.filter((s) => s.endpoint === d && s.payload.tag === `post-${post.id}`).map((s) => s.payload)
    expect(mine(dPb)).toEqual([expect.objectContaining({ title: 'Novo post', body: 'x'.repeat(117) + '…' })])
    expect(mine(dAdm)).toEqual([])
  })
})
