import type PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { eventData, member } from './helpers'

const post = (pb: PocketBase, path: string, body?: object) => pb.send(path, { method: 'POST', body })
const uid = (pb: PocketBase) => pb.authStore.record!.id

async function available(name: string) {
  const pb = await member(name)
  await pb.collection('users').update(uid(pb), { availableForTeam: true })
  return pb
}

async function primeWithCaptain() {
  const adm = await member('Admin', 'admin')
  const ev = await adm.collection('events').create(eventData(uid(adm), { type: 'prime', maxParticipants: 3, title: 'Prime' }))
  const cap = await member('Capitã')
  await post(cap, `/api/g/events/${ev.id}/register`)
  return { adm, ev, cap }
}

describe('convites Prime', () => {
  it('capitão convida, jogador aceita e o time aparece para todos', async () => {
    const { ev, cap } = await primeWithCaptain()
    const p = await available('Jogador Um')
    const inv = await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(p) })
    expect(inv.status).toBe('pending')
    expect((await post(p, `/api/g/invites/${inv.id}/accept`)).status).toBe('accepted')
    const viewer = await member()
    const team = await viewer.collection('invites').getFullList({ filter: `event = "${ev.id}" && captain = "${uid(cap)}"` })
    expect(team.map((i) => [i.player, i.status])).toEqual([[uid(p), 'accepted']])
  })

  it('só capitão confirmado convida, e só em evento Prime', async () => {
    const { adm, ev } = await primeWithCaptain()
    const p = await available('Jogador')
    const intruso = await member('Intruso')
    await expect(post(intruso, `/api/g/events/${ev.id}/invites`, { player: uid(p) })).rejects.toMatchObject({ status: 403 })

    const comum = await adm.collection('events').create(eventData(uid(adm), { type: 'custom', maxParticipants: 5 }))
    await post(intruso, `/api/g/events/${comum.id}/register`)
    await expect(post(intruso, `/api/g/events/${comum.id}/invites`, { player: uid(p) })).rejects.toMatchObject({ status: 400 })
  })

  it('recusa jogador indisponível, capitão, já convidado e a si mesmo', async () => {
    const { ev, cap } = await primeWithCaptain()
    const ocupado = await member('Indisponível')
    await expect(post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(ocupado) })).rejects.toMatchObject({ message: expect.stringContaining('não está disponível') })

    const outroCap = await available('Outro Capitão')
    await post(outroCap, `/api/g/events/${ev.id}/register`)
    await expect(post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(outroCap) })).rejects.toMatchObject({ message: expect.stringContaining('capitão de outro time') })

    const p = await available('Disputado')
    await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(p) })
    await expect(post(outroCap, `/api/g/events/${ev.id}/invites`, { player: uid(p) })).rejects.toMatchObject({ message: expect.stringContaining('já tem convite') })
    await expect(post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(cap) })).rejects.toMatchObject({ status: 400 })
  })

  it('só o convidado responde e só o capitão cancela; recusado pode ser convidado de novo', async () => {
    const { ev, cap } = await primeWithCaptain()
    const p = await available('Convidado')
    const outro = await member()
    const inv = await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(p) })
    await expect(post(outro, `/api/g/invites/${inv.id}/accept`)).rejects.toMatchObject({ status: 403 })
    await expect(post(cap, `/api/g/invites/${inv.id}/accept`)).rejects.toMatchObject({ status: 403 })
    await expect(post(p, `/api/g/invites/${inv.id}/cancel`)).rejects.toMatchObject({ status: 403 })

    expect((await post(p, `/api/g/invites/${inv.id}/decline`)).status).toBe('declined')
    await expect(post(p, `/api/g/invites/${inv.id}/accept`)).rejects.toMatchObject({ status: 400 })

    const again = await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(p) })
    expect((await post(cap, `/api/g/invites/${again.id}/cancel`)).status).toBe('cancelled')
  })

  it('capitão que sai desfaz o time; convidado não vira capitão', async () => {
    const { ev, cap } = await primeWithCaptain()
    const p = await available('Do Time')
    const inv = await post(cap, `/api/g/events/${ev.id}/invites`, { player: uid(p) })
    await post(p, `/api/g/invites/${inv.id}/accept`)
    await expect(post(p, `/api/g/events/${ev.id}/register`)).rejects.toMatchObject({ message: expect.stringContaining('convidado para um time') })

    await post(cap, `/api/g/events/${ev.id}/cancel`)
    expect((await p.collection('invites').getOne(inv.id)).status).toBe('cancelled')
    await post(p, `/api/g/events/${ev.id}/register`) // agora livre
  })

  it('cliente não escreve convites direto', async () => {
    const { ev, cap } = await primeWithCaptain()
    const p = await available('Alvo')
    await expect(cap.collection('invites').create({ event: ev.id, captain: uid(cap), player: uid(p), status: 'accepted' })).rejects.toThrow()
  })
})
