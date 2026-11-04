import { readFileSync } from 'node:fs'
import path from 'node:path'
import PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { admin, eventData, member, pbUrl } from './helpers'

const signup = (data: Record<string, unknown>) =>
  new PocketBase(pbUrl()).collection('users').create({
    email: `s${Date.now()}${Math.random()}@test.local`,
    password: 'senha-forte-123',
    passwordConfirm: 'senha-forte-123',
    name: 'Novo',
    phone: '+5521912345678',
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

  describe('telefone', () => {
    const PHONE = '+5511987654321'
    const uid = (pb: PocketBase) => pb.authStore.record!.id

    it('cadastro exige telefone do Brasil válido', async () => {
      await expect(signup({ phone: '' })).rejects.toMatchObject({ status: 400 })
      for (const phone of ['11912345678', '+551191234567', '+5511812345678', '+5501912345678', '+14155552671']) {
        await expect(signup({ phone }), phone).rejects.toMatchObject({ status: 400, response: { data: { phone: { code: 'invalid' } } } })
      }
      await signup({ phone: '+551133334444' }) // fixo
    })

    it('dono vê o próprio telefone no login, refresh e getOne', async () => {
      const pb = await member()
      expect(pb.authStore.record!.phone).toBe(PHONE)
      expect((await pb.collection('users').authRefresh()).record.phone).toBe(PHONE)
      expect((await pb.collection('users').getOne(uid(pb))).phone).toBe(PHONE)
    })

    it('outro membro não vê nem filtra pelo telefone; admin vê', async () => {
      const alvo = await member('Alvo')
      const outro = await member('Outro')
      expect((await outro.collection('users').getOne(uid(alvo))).phone).toBeUndefined()
      for (const field of ['phone', 'phonePrivate']) {
        const found = await outro.collection('users').getList(1, 5, { filter: `${field} = '${PHONE}'` }).then((r) => r.items.length, () => 0)
        expect(found, field).toBe(0)
      }

      const adm = await member('Admin', 'admin')
      expect((await adm.collection('users').getOne(uid(alvo))).phone).toBe(PHONE)

      const ev = await adm.collection('events').create(eventData(uid(adm)))
      await alvo.send(`/api/g/events/${ev.id}/register`, { method: 'POST' })
      const regOf = async (pb: PocketBase) =>
        (await pb.collection('registrations').getFullList({ filter: `event = '${ev.id}'`, expand: 'user' }))[0].expand?.user
      expect((await regOf(outro)).phone).toBeUndefined()
      expect((await regOf(adm)).phone).toBe(PHONE)
      const viaRelation = await outro.collection('registrations')
        .getList(1, 5, { filter: `event = '${ev.id}' && user.phonePrivate = '${PHONE}'` }).then((r) => r.items.length, () => 0)
      expect(viaRelation).toBe(0)
    })

    it('não apaga o telefone; conta antiga sem telefone ainda salva o resto', async () => {
      const pb = await member()
      await expect(pb.collection('users').update(uid(pb), { phone: '' })).rejects.toMatchObject({ status: 400 })
      expect((await pb.collection('users').update(uid(pb), { phone: '+5531999998888' })).phone).toBe('+5531999998888')

      const antigo = await member('Antigo', 'member', '')
      expect(antigo.authStore.record!.phone).toBe('')
      await antigo.collection('users').update(uid(antigo), { name: 'Antigo Editado' })
      await (await admin()).collection('users').update(uid(antigo), { verified: true }) // painel /_/
    })
  })
})
