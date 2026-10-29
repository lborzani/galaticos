import type PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { eventData, member } from './helpers'

const post = (pb: PocketBase, path: string, body?: object) => pb.send(path, { method: 'POST', body })
const uid = (pb: PocketBase) => pb.authStore.record!.id

async function withRank(adm: PocketBase, name: string, rank: string) {
  const pb = await member(name)
  await pb.collection('users').update(uid(pb), { availableForTeam: true })
  await post(adm, `/api/g/admin/users/${uid(pb)}`, { rank })
  return pb
}

describe('ranks permitidos', () => {
  it('template e evento guardam os ranks permitidos', async () => {
    const adm = await member('Admin', 'admin')
    const tpl = await adm.collection('templates').create({ name: `4fun ${crypto.randomUUID().slice(0, 6)}`, maxParticipants: 3, teams: true, allowedRanks: ['regular'] })
    expect(tpl.allowedRanks).toEqual(['regular'])
    const ev = await adm.collection('events').create(eventData(uid(adm), { allowedRanks: ['mitico', 'lendario'] }))
    expect(ev.allowedRanks).toEqual(['mitico', 'lendario'])
    expect((await adm.collection('events').update(ev.id, { allowedRanks: [] })).allowedRanks).toEqual([])
  })

  it('inscrição fora do rank é recusada; sem restrição aceita todos', async () => {
    const adm = await member('Admin', 'admin')
    const funEv = await adm.collection('events').create(eventData(uid(adm), { allowedRanks: ['regular'] }))
    const elite = await adm.collection('events').create(eventData(uid(adm), { allowedRanks: ['mitico', 'lendario'] }))
    const open = await adm.collection('events').create(eventData(uid(adm)))
    const lendario = await withRank(adm, 'Lenda', 'lendario')
    const regular = await member('Regular')

    await expect(post(lendario, `/api/g/events/${funEv.id}/register`)).rejects.toMatchObject({ status: 400, message: 'Este evento é só para Regulares.' })
    await expect(post(regular, `/api/g/events/${elite.id}/register`)).rejects.toMatchObject({ message: 'Este evento é só para Míticos e Lendários.' })
    await post(regular, `/api/g/events/${funEv.id}/register`)
    await post(lendario, `/api/g/events/${elite.id}/register`)
    await post(lendario, `/api/g/events/${open.id}/register`)
    await post(regular, `/api/g/events/${open.id}/register`)
  })

  it('convite do Prime só para jogador de rank permitido', async () => {
    const adm = await member('Admin', 'admin')
    const ev = await adm.collection('events').create(eventData(uid(adm), { teams: true, maxParticipants: 3, allowedRanks: ['regular'] }))
    const cap = await member('Capitão')
    await post(cap, `/api/g/events/${ev.id}/register`)
    const mitico = await withRank(adm, 'Mítico Fulano', 'mitico')
    const regular = await withRank(adm, 'Regular Beltrano', 'regular')

    await expect(post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(mitico) }))
      .rejects.toMatchObject({ status: 400, message: 'Mítico Fulano não pode jogar este evento (só Regulares).' })
    expect((await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(regular) })).status).toBe('pending')
  })
})
