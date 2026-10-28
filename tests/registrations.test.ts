import type PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { admin, eventData, inHours, member } from './helpers'

const register = (pb: PocketBase, eventId: string) => pb.send(`/api/g/events/${eventId}/register`, { method: 'POST' })
const cancel = (pb: PocketBase, eventId: string) => pb.send(`/api/g/events/${eventId}/cancel`, { method: 'POST' })

async function newEvent(over: Record<string, unknown> = {}) {
  const adm = await member('Admin', 'admin')
  const ev = await adm.collection('events').create(eventData(adm.authStore.record!.id, { type: 'custom', maxParticipants: 2, ...over }))
  return { adm, ev }
}

async function snapshot(eventId: string) {
  const root = await admin()
  const ev = await root.collection('events').getOne(eventId)
  const regs = await root.collection('registrations').getFullList({ filter: `event = "${eventId}"`, sort: 'position' })
  const by = (s: string) => regs.filter((r) => r.status === s).map((r) => r.user)
  return { ev, confirmed: by('confirmed'), waitlist: by('waitlist'), cancelled: by('cancelled') }
}

describe('inscrições', () => {
  it('confirma até lotar e depois manda para a fila', async () => {
    const { ev } = await newEvent()
    const [a, b, c] = await Promise.all([member('Jog A'), member('Jog B'), member('Jog C')])
    for (const pb of [a, b, c]) await register(pb, ev.id)
    const s = await snapshot(ev.id)
    expect(s.confirmed).toEqual([a, b].map((p) => p.authStore.record!.id))
    expect(s.waitlist).toEqual([c.authStore.record!.id])
    expect(s.ev).toMatchObject({ confirmedCount: 2, waitlistCount: 1 })
  })

  it('não passa da lotação com inscrições simultâneas', async () => {
    const { ev } = await newEvent({ type: 'sunday', maxParticipants: 28 })
    const players = await Promise.all(Array.from({ length: 40 }, (_, i) => member(`Jog ${i}`)))
    const results = await Promise.allSettled(players.map((pb) => register(pb, ev.id)))
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(0)
    const s = await snapshot(ev.id)
    expect(s.confirmed).toHaveLength(28)
    expect(s.waitlist).toHaveLength(12)
    expect(s.ev).toMatchObject({ confirmedCount: 28, waitlistCount: 12 })
  })

  it('recusa lista fechada, evento cancelado e inscrição dupla', async () => {
    const { adm, ev } = await newEvent({ registrationOpensAt: inHours(1) })
    const p = await member()
    await expect(register(p, ev.id)).rejects.toMatchObject({ status: 400, message: 'A lista ainda não abriu.' })

    const { ev: open } = await newEvent()
    await register(p, open.id)
    await expect(register(p, open.id)).rejects.toMatchObject({ status: 400, message: 'Você já está na lista.' })

    await adm.collection('events').update(ev.id, { registrationOpensAt: inHours(-1) })
    await adm.collection('events').update(ev.id, { cancelledAt: new Date().toISOString(), cancellationReason: 'x', cancelledBy: adm.authStore.record!.id })
    await expect(register(p, ev.id)).rejects.toMatchObject({ status: 400, message: 'Esse evento foi cancelado.' })
  })

  it('cancelar confirmado promove o primeiro da fila', async () => {
    const { ev } = await newEvent()
    const [a, b, c, d] = await Promise.all([member('Jog A'), member('Jog B'), member('Jog C'), member('Jog D')])
    for (const pb of [a, b, c, d]) await register(pb, ev.id)
    await cancel(a, ev.id)
    const s = await snapshot(ev.id)
    expect(s.confirmed).toEqual([b, c].map((p) => p.authStore.record!.id))
    expect(s.waitlist).toEqual([d.authStore.record!.id])
    expect(s.ev).toMatchObject({ confirmedCount: 2, waitlistCount: 1 })
  })

  it('sair da fila não mexe nos confirmados e reinscrição vai para o fim', async () => {
    const { ev } = await newEvent({ maxParticipants: 1 })
    const [a, b, c] = await Promise.all([member('Jog A'), member('Jog B'), member('Jog C')])
    for (const pb of [a, b, c]) await register(pb, ev.id)
    await cancel(b, ev.id)
    let s = await snapshot(ev.id)
    expect(s.confirmed).toEqual([a.authStore.record!.id])
    expect(s.waitlist).toEqual([c.authStore.record!.id])

    await register(b, ev.id)
    s = await snapshot(ev.id)
    expect(s.waitlist).toEqual([c, b].map((p) => p.authStore.record!.id))
    expect(s.ev).toMatchObject({ confirmedCount: 1, waitlistCount: 2 })
  })

  it('cancelar sem estar na lista falha', async () => {
    const { ev } = await newEvent()
    await expect(cancel(await member(), ev.id)).rejects.toMatchObject({ status: 400 })
  })

  it('cliente não escreve inscrições nem contadores direto', async () => {
    const { adm, ev } = await newEvent()
    const p = await member()
    const uid = p.authStore.record!.id
    await expect(p.collection('registrations').create({ event: ev.id, user: uid, status: 'confirmed', position: 1 })).rejects.toThrow()
    const reg = await register(p, ev.id)
    await expect(p.collection('registrations').update(reg.id, { status: 'attended' })).rejects.toThrow()
    await expect(p.collection('registrations').delete(reg.id)).rejects.toThrow()
    await expect(adm.collection('events').update(ev.id, { confirmedCount: 0 })).rejects.toThrow()
  })

  it('aumentar vagas promove a fila; reduzir abaixo dos confirmados é recusado', async () => {
    const { adm, ev } = await newEvent()
    const [a, b, c, d] = await Promise.all([member('Jog A'), member('Jog B'), member('Jog C'), member('Jog D')])
    for (const pb of [a, b, c, d]) await register(pb, ev.id)
    await adm.collection('events').update(ev.id, { maxParticipants: 3 })
    const s = await snapshot(ev.id)
    expect(s.confirmed).toEqual([a, b, c].map((p) => p.authStore.record!.id))
    expect(s.ev).toMatchObject({ confirmedCount: 3, waitlistCount: 1 })
    await expect(adm.collection('events').update(ev.id, { maxParticipants: 2 })).rejects.toMatchObject({ status: 400 })
  })

  it('anônimo não se inscreve', async () => {
    const { ev } = await newEvent()
    const anon = (await member()).authStore
    anon.clear()
    await expect(fetch(`${(await admin()).baseURL}/api/g/events/${ev.id}/register`, { method: 'POST' }).then((r) => r.status)).resolves.toBe(401)
  })
})
