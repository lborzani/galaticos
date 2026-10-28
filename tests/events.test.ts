import { describe, expect, it } from 'vitest'
import { eventData, inHours, member } from './helpers'

describe('events', () => {
  it('membro lê mas não cria evento', async () => {
    const adm = await member('Admin', 'admin')
    const pb = await member()
    const ev = await adm.collection('events').create(eventData(adm.authStore.record!.id))
    expect((await pb.collection('events').getOne(ev.id)).title).toBe('Bate-bola Domingo')
    await expect(pb.collection('events').create(eventData(pb.authStore.record!.id))).rejects.toThrow()
    await expect(pb.collection('events').update(ev.id, { title: 'Hack' })).rejects.toThrow()
  })

  it('admin não cria em nome de outro', async () => {
    const adm = await member('Admin', 'admin')
    const other = await member()
    await expect(adm.collection('events').create(eventData(other.authStore.record!.id))).rejects.toThrow()
  })

  it('vagas fixas por tipo e livre no personalizado', async () => {
    const adm = await member('Admin', 'admin')
    const uid = adm.authStore.record!.id
    await expect(adm.collection('events').create(eventData(uid, { type: 'sunday', maxParticipants: 30 }))).rejects.toMatchObject({ status: 400 })
    await expect(adm.collection('events').create(eventData(uid, { type: 'wednesday', maxParticipants: 28 }))).rejects.toMatchObject({ status: 400 })
    const custom = await adm.collection('events').create(eventData(uid, { type: 'custom', maxParticipants: 12 }))
    expect(custom.maxParticipants).toBe(12)
  })

  it('lista precisa abrir antes do evento', async () => {
    const adm = await member('Admin', 'admin')
    const data = eventData(adm.authStore.record!.id, { eventDate: inHours(2), registrationOpensAt: inHours(3) })
    await expect(adm.collection('events').create(data)).rejects.toMatchObject({ status: 400 })
  })

  it('cancelamento exige motivo e trava edições', async () => {
    const adm = await member('Admin', 'admin')
    const uid = adm.authStore.record!.id
    const ev = await adm.collection('events').create(eventData(uid))
    await expect(adm.collection('events').update(ev.id, { cancelledAt: new Date().toISOString(), cancelledBy: uid })).rejects.toMatchObject({ status: 400 })
    await adm.collection('events').update(ev.id, { cancelledAt: new Date().toISOString(), cancelledBy: uid, cancellationReason: 'Chuva' })
    await expect(adm.collection('events').update(ev.id, { cancelledAt: '' })).rejects.toThrow()
  })

  it('não nasce cancelado e não exclui', async () => {
    const adm = await member('Admin', 'admin')
    const uid = adm.authStore.record!.id
    await expect(adm.collection('events').create(eventData(uid, { cancelledAt: new Date().toISOString(), cancellationReason: 'x' }))).rejects.toThrow()
    const ev = await adm.collection('events').create(eventData(uid))
    await expect(adm.collection('events').delete(ev.id)).rejects.toThrow()
  })
})
