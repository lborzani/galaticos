import { describe, expect, it } from 'vitest'
import { member } from './helpers'

const name = () => `Template ${crypto.randomUUID().slice(0, 8)}`

describe('templates', () => {
  it('nascem com os tipos antigos', async () => {
    const pb = await member()
    const all = await pb.collection('templates').getFullList({ filter: 'name ~ "Bate-bola" || name = "Prime"', sort: 'name' })
    expect(all.map((t) => [t.name, t.maxParticipants, t.teams])).toEqual([
      ['Bate-bola Domingo', 28, false],
      ['Bate-bola Quarta', 3, false],
      ['Prime', 3, true],
    ])
  })

  it('só admin cria, edita e apaga; nome único', async () => {
    const adm = await member('Admin', 'admin')
    const pb = await member()
    const n = name()
    const t = await adm.collection('templates').create({ name: n, maxParticipants: 12, teams: true })
    await expect(adm.collection('templates').create({ name: n.toLowerCase(), maxParticipants: 5 })).rejects.toMatchObject({ status: 400 })
    await expect(pb.collection('templates').create({ name: name(), maxParticipants: 5 })).rejects.toThrow()
    await expect(pb.collection('templates').update(t.id, { maxParticipants: 1 })).rejects.toThrow()
    await expect(pb.collection('templates').delete(t.id)).rejects.toThrow()
    expect((await adm.collection('templates').update(t.id, { maxParticipants: 10 })).maxParticipants).toBe(10)
    await adm.collection('templates').delete(t.id)
  })
})
