import { readFileSync } from 'node:fs'
import path from 'node:path'
import PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { member, pbUrl } from './helpers'

const signup = (data: Record<string, unknown>) =>
  new PocketBase(pbUrl()).collection('users').create({
    email: `s${Date.now()}${Math.random()}@test.local`,
    password: 'senha-forte-123',
    passwordConfirm: 'senha-forte-123',
    name: 'Novo',
    ...data,
  })

describe('users', () => {
  it('cadastro público cria membro comum', async () => {
    const user = await signup({})
    expect(user.role).not.toBe('admin')
  })

  it('cadastro não aceita role', async () => {
    await expect(signup({ role: 'admin' })).rejects.toThrow()
  })

  it('não autentica antes de verificar o e-mail', async () => {
    const email = `nv${Date.now()}@test.local`
    await signup({ email })
    await expect(
      new PocketBase(pbUrl()).collection('users').authWithPassword(email, 'senha-forte-123'),
    ).rejects.toThrow()
  })

  it('usuário não se promove a admin nem verifica outra conta', async () => {
    const pb = await member()
    const id = pb.authStore.record!.id
    await expect(pb.collection('users').update(id, { role: 'admin' })).rejects.toThrow()
    const unverified = await signup({})
    await expect(pb.collection('users').update(unverified.id, { verified: true })).rejects.toThrow()
  })

  it('edita o próprio perfil', async () => {
    const pb = await member()
    const id = pb.authStore.record!.id
    const updated = await pb.collection('users').update(id, { name: 'Ana', position: 'libero', availableForTeam: true })
    expect(updated).toMatchObject({ name: 'Ana', position: 'libero', availableForTeam: true })
  })

  it('avatar é salvo como arquivo com miniatura; outros formatos são recusados', async () => {
    const pb = await member()
    const id = pb.authStore.record!.id
    const png = readFileSync(path.resolve(import.meta.dirname, '../public/favicon.png'))
    const updated = await pb.collection('users').update(id, { avatar: new File([png], 'a.png', { type: 'image/png' }) })
    expect(updated.avatar).toMatch(/\.png$/)
    const thumb = await fetch(pb.files.getURL(updated, updated.avatar, { thumb: '96x96' }))
    expect(thumb.headers.get('content-type')).toBe('image/png')
    const txt = new File(['oi'], 'a.txt', { type: 'text/plain' })
    await expect(pb.collection('users').update(id, { avatar: txt })).rejects.toThrow()
  })

  it('não edita perfil alheio', async () => {
    const a = await member()
    const b = await member()
    await expect(b.collection('users').update(a.authStore.record!.id, { name: 'Hack' })).rejects.toThrow()
  })

  it('outro membro vê o perfil mas não o e-mail', async () => {
    const a = await member('Alvo')
    const b = await member()
    const seen = await b.collection('users').getOne(a.authStore.record!.id)
    expect(seen.name).toBe('Alvo')
    expect(seen.email).toBeFalsy()
  })

  it('visitante anônimo não lista usuários', async () => {
    const res = await new PocketBase(pbUrl()).collection('users').getList(1, 50)
    expect(res.items).toHaveLength(0)
  })
})
