import { describe, expect, it } from 'vitest'
import { eventData, member } from './helpers'

const name = () => `Quadra ${crypto.randomUUID().slice(0, 8)}`

describe('courts', () => {
  it('membro lê mas não cria, edita nem apaga quadra', async () => {
    const adm = await member('Admin', 'admin')
    const pb = await member()
    const court = await adm.collection('courts').create({ name: name(), address: 'Rua A, 1' })
    expect((await pb.collection('courts').getOne(court.id)).address).toBe('Rua A, 1')
    await expect(pb.collection('courts').create({ name: name() })).rejects.toThrow()
    await expect(pb.collection('courts').update(court.id, { name: 'Hack' })).rejects.toThrow()
    await expect(pb.collection('courts').delete(court.id)).rejects.toThrow()
  })

  it('nome único sem diferenciar maiúsculas', async () => {
    const adm = await member('Admin', 'admin')
    const n = name()
    await adm.collection('courts').create({ name: n })
    await expect(adm.collection('courts').create({ name: n.toUpperCase() })).rejects.toMatchObject({ status: 400 })
  })

  it('evento exige quadra e a quadra usada não pode ser apagada', async () => {
    const adm = await member('Admin', 'admin')
    const uid = adm.authStore.record!.id
    await expect(adm.collection('events').create(eventData(uid, { court: '' }))).rejects.toMatchObject({ status: 400 })

    const court = await adm.collection('courts').create({ name: name() })
    const ev = await adm.collection('events').create(eventData(uid, { court: court.id }))
    expect((await adm.collection('events').getOne(ev.id, { expand: 'court' })).expand?.court.name).toBe(court.name)
    await expect(adm.collection('courts').delete(court.id)).rejects.toMatchObject({ status: 400 })

    const free = await adm.collection('courts').create({ name: name() })
    await adm.collection('courts').delete(free.id)
  })
})
