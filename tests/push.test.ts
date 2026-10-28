import PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { admin, eventData, inHours, member } from './helpers'
import { FAKE_PUSH_URL } from './setup'

const post = (pb: PocketBase, path: string, body?: object) => pb.send(path, { method: 'POST', body })
const uid = (pb: PocketBase) => pb.authStore.record!.id

/** Inscreve um "aparelho" com endpoint único e devolve o endpoint. */
async function device(pb: PocketBase, tag = '') {
  const endpoint = `https://push.test/${tag}${crypto.randomUUID()}`
  await post(pb, '/api/g/push/subscribe', { endpoint, keys: { p256dh: 'p', auth: 'a' } })
  return endpoint
}

/** Pushes que chegaram ao sidecar para este endpoint. */
const received = async (endpoint: string) =>
  ((await (await fetch(`${FAKE_PUSH_URL}/sent`)).json()) as { endpoint: string; payload: { title: string; body: string } }[])
    .filter((s) => s.endpoint === endpoint).map((s) => s.payload)

async function eventWith(over: Record<string, unknown> = {}) {
  const adm = await member('Admin', 'admin')
  const ev = await adm.collection('events').create(eventData(uid(adm), { type: 'custom', maxParticipants: 1, ...over }))
  return { adm, ev }
}

const runReminders = async () => post(await admin(), '/api/g/push/run-reminders')

describe('push', () => {
  it('chave pública e inscrição: só o dono vê; aparelho trocado de conta muda de dono', async () => {
    const a = await member('Dono A')
    expect((await a.send('/api/g/push/key', {})).key).toBe('test-public-key')
    const endpoint = await device(a)
    expect(await a.collection('push_subscriptions').getFullList()).toHaveLength(1)
    const b = await member('Dono B')
    expect(await b.collection('push_subscriptions').getFullList()).toHaveLength(0)

    await post(b, '/api/g/push/subscribe', { endpoint, keys: { p256dh: 'p', auth: 'a' } })
    expect(await a.collection('push_subscriptions').getFullList()).toHaveLength(0)
    expect(await b.collection('push_subscriptions').getFullList()).toHaveLength(1)

    await post(b, '/api/g/push/unsubscribe', { endpoint })
    expect(await b.collection('push_subscriptions').getFullList()).toHaveLength(0)
    await expect(post(b, '/api/g/push/subscribe', { endpoint: 'http://inseguro', keys: { p256dh: 'p', auth: 'a' } })).rejects.toMatchObject({ status: 400 })
  })

  it('cancelamento avisa confirmados e fila, não quem está de fora', async () => {
    const { adm, ev } = await eventWith()
    const [conf, fila, fora] = await Promise.all([member('Conf'), member('Fila'), member('Fora')])
    const [dConf, dFila, dFora] = await Promise.all([device(conf), device(fila), device(fora)])
    await post(conf, `/api/g/events/${ev.id}/register`)
    await post(fila, `/api/g/events/${ev.id}/register`)

    await adm.collection('events').update(ev.id, { cancelledAt: new Date().toISOString(), cancelledBy: uid(adm), cancellationReason: 'Chuva' })
    for (const d of [dConf, dFila]) expect(await received(d)).toEqual([expect.objectContaining({ title: 'Evento cancelado', body: expect.stringContaining('Chuva') })])
    expect(await received(dFora)).toEqual([])
  })

  it('quem sai da fila para confirmado recebe aviso (cancelamento e aumento de vagas)', async () => {
    const { adm, ev } = await eventWith()
    const [a, b, c] = await Promise.all([member('Titular'), member('Reserva 1'), member('Reserva 2')])
    const [dB, dC] = await Promise.all([device(b), device(c)])
    for (const p of [a, b, c]) await post(p, `/api/g/events/${ev.id}/register`)

    await post(a, `/api/g/events/${ev.id}/cancel`)
    expect(await received(dB)).toEqual([expect.objectContaining({ title: 'Você foi confirmado!' })])

    await adm.collection('events').update(ev.id, { maxParticipants: 2 })
    expect(await received(dC)).toEqual([expect.objectContaining({ title: 'Você foi confirmado!' })])
  })

  it('lembretes de 1 h e 5 min, uma vez cada, só para confirmados de eventos ativos', async () => {
    const { ev: soon } = await eventWith({ eventDate: inHours(50 / 60) })
    const { ev: now5 } = await eventWith({ eventDate: inHours(3 / 60) })
    const { adm, ev: cancelled } = await eventWith({ eventDate: inHours(50 / 60) })
    const [p1, p2, p3, waiting] = await Promise.all([member('Um'), member('Dois'), member('Três'), member('Espera')])
    const [d1, d2, d3, dW] = await Promise.all([device(p1), device(p2), device(p3), device(waiting)])
    await post(p1, `/api/g/events/${soon.id}/register`)
    await post(waiting, `/api/g/events/${soon.id}/register`)
    await post(p2, `/api/g/events/${now5.id}/register`)
    await post(p3, `/api/g/events/${cancelled.id}/register`)
    await adm.collection('events').update(cancelled.id, { cancelledAt: new Date().toISOString(), cancelledBy: uid(adm), cancellationReason: 'x' })

    await runReminders()
    await runReminders() // idempotente
    expect(await received(d1)).toEqual([expect.objectContaining({ title: 'Falta 1 hora!' })])
    expect(await received(d2)).toEqual([expect.objectContaining({ title: 'Já está começando!' })]) // só o de 5 min
    expect((await received(d3)).map((p) => p.title)).toEqual(['Evento cancelado'])
    expect(await received(dW)).toEqual([])
  })

  it('membro aceito do time Prime também recebe lembrete', async () => {
    const { ev } = await eventWith({ type: 'prime', maxParticipants: 3, eventDate: inHours(50 / 60) })
    const cap = await member('Capitão')
    const jog = await member('Do Time')
    await jog.collection('users').update(uid(jog), { availableForTeam: true })
    const dJog = await device(jog)
    await post(cap, `/api/g/events/${ev.id}/register`)
    const inv = await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(jog) })
    await post(jog, `/api/g/invites/${inv.id}/accept`)
    await runReminders()
    expect(await received(dJog)).toEqual([expect.objectContaining({ title: 'Falta 1 hora!' })])
  })

  it('inscrição expirada é apagada; só superuser roda lembretes manualmente', async () => {
    const { adm, ev } = await eventWith()
    const p = await member('Expirado')
    await device(p, 'gone-')
    await post(p, `/api/g/events/${ev.id}/register`)
    await adm.collection('events').update(ev.id, { cancelledAt: new Date().toISOString(), cancelledBy: uid(adm), cancellationReason: 'x' })
    expect(await p.collection('push_subscriptions').getFullList()).toHaveLength(0)
    await expect(post(p, '/api/g/push/run-reminders')).rejects.toMatchObject({ status: 403 })
  })
})
