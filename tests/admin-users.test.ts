import PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { admin, eventData, inHours, member, pbUrl } from './helpers'
import { FAKE_PUSH_URL } from './setup'

const post = (pb: PocketBase, path: string, body?: object) => pb.send(path, { method: 'POST', body })
const uid = (pb: PocketBase) => pb.authStore.record!.id
const PASSWORD = 'senha-forte-123' // a mesma de helpers.member

describe('gestão de usuários', () => {
  it('rank começa Regular e só admin muda rank e papel', async () => {
    const pb = await member()
    expect(pb.authStore.record!.rank).toBe('regular')
    await expect(pb.collection('users').update(uid(pb), { rank: 'lendario' })).rejects.toThrow()
    await expect(post(pb, `/api/g/admin/users/${uid(pb)}`, { rank: 'lendario' })).rejects.toMatchObject({ status: 403 })

    const adm = await member('Admin', 'admin')
    await post(adm, `/api/g/admin/users/${uid(pb)}`, { rank: 'mitico', role: 'admin' })
    const seen = await (await member()).collection('users').getOne(uid(pb))
    expect(seen).toMatchObject({ rank: 'mitico', role: 'admin' })

    await expect(post(adm, `/api/g/admin/users/${uid(pb)}`, { rank: 'deus' })).rejects.toMatchObject({ status: 400 })
    await expect(post(adm, `/api/g/admin/users/${uid(adm)}`, { role: 'member' })).rejects.toMatchObject({ status: 400 })
    await post(adm, `/api/g/admin/users/${uid(adm)}`, { rank: 'lendario' }) // o próprio rank pode
  })

  it('banir exige motivo, derruba a sessão e o login avisa conta suspensa; desbanir libera', async () => {
    const adm = await member('Admin', 'admin')
    const pb = await member('Banido')
    const email = pb.authStore.record!.email
    await expect(post(adm, `/api/g/admin/users/${uid(pb)}/ban`, { reason: ' ' })).rejects.toMatchObject({ status: 400 })
    await expect(post(adm, `/api/g/admin/users/${uid(adm)}/ban`, { reason: 'x' })).rejects.toMatchObject({ status: 400 })
    await expect(post(pb, `/api/g/admin/users/${uid(adm)}/ban`, { reason: 'x' })).rejects.toMatchObject({ status: 403 })

    await post(adm, `/api/g/admin/users/${uid(pb)}/ban`, { reason: 'Briga no jogo' })
    await expect(pb.collection('users').authRefresh()).rejects.toMatchObject({ status: 401 })
    const login = new PocketBase(pbUrl()).collection('users')
    await expect(login.authWithPassword(email, PASSWORD)).rejects.toMatchObject({ status: 403, message: 'Conta suspensa. Fale com a organização.' })
    await expect(login.authWithPassword(email, 'senha-errada')).rejects.toMatchObject({ status: 400 })

    await post(adm, `/api/g/admin/users/${uid(pb)}/unban`)
    await login.authWithPassword(email, PASSWORD)
  })

  it('banido some da lista para membros; admin vê todos com o motivo', async () => {
    const adm = await member('Admin', 'admin')
    const alvo = await member('Sumido')
    const outro = await member()
    await post(adm, `/api/g/admin/users/${uid(alvo)}/ban`, { reason: 'Motivo secreto' })

    await expect(outro.collection('users').getOne(uid(alvo))).rejects.toMatchObject({ status: 404 })
    expect(await outro.collection('users').getFullList({ filter: `id = '${uid(alvo)}'` })).toHaveLength(0)
    const seen = await adm.collection('users').getOne(uid(alvo))
    expect(seen).toMatchObject({ banReason: 'Motivo secreto', bannedBy: uid(adm) })
    expect(seen.bannedAt).toBeTruthy()
    expect((await outro.collection('users').getOne(uid(outro))).banReason).toBeUndefined()
  })

  it('banido sai das listas futuras (fila anda), dos convites e desfaz o próprio time; passado fica', async () => {
    const adm = await member('Admin', 'admin')
    const ev = await adm.collection('events').create(eventData(uid(adm), { maxParticipants: 1 }))
    const prime = await adm.collection('events').create(eventData(uid(adm), { teams: true, maxParticipants: 3 }))
    const past = await adm.collection('events').create(eventData(uid(adm), { eventDate: inHours(-48), registrationOpensAt: inHours(-72) }))

    const capitao = await member('Capitão Banido')
    const reserva = await member('Reserva')
    const convidado = await member('Convidado')
    await convidado.collection('users').update(uid(convidado), { availableForTeam: true })
    const endpoint = `https://push.test/${crypto.randomUUID()}`
    await post(reserva, '/api/g/push/subscribe', { endpoint, keys: { p256dh: 'p', auth: 'a' } })

    // inscrição no passado direto pelo superuser (a rota recusa evento já começado)
    const root = await admin()
    await root.collection('registrations').create({ event: past.id, user: uid(capitao), status: 'attended', position: 1 })

    await post(capitao, `/api/g/events/${ev.id}/register`)
    await post(reserva, `/api/g/events/${ev.id}/register`)
    await post(capitao, `/api/g/events/${prime.id}/register`)
    const inv = await post(capitao, `/api/g/events/${prime.id}/invites`, { player: uid(convidado) })
    await post(convidado, `/api/g/invites/${inv.id}/accept`)

    await post(adm, `/api/g/admin/users/${uid(capitao)}/ban`, { reason: 'Banido' })

    const reg = (event: string, user: string) => root.collection('registrations').getFirstListItem(`event = '${event}' && user = '${user}'`)
    expect((await reg(ev.id, uid(capitao))).status).toBe('cancelled')
    expect((await reg(ev.id, uid(reserva))).status).toBe('confirmed')
    expect((await reg(prime.id, uid(capitao))).status).toBe('cancelled')
    expect((await reg(past.id, uid(capitao))).status).toBe('attended')
    expect((await root.collection('invites').getOne(inv.id)).status).toBe('cancelled')
    expect(await root.collection('push_subscriptions').getFullList({ filter: `user = '${uid(capitao)}'` })).toHaveLength(0)

    const sent = (await (await fetch(`${FAKE_PUSH_URL}/sent`)).json()) as { endpoint: string; payload: { title: string } }[]
    expect(sent.filter((s) => s.endpoint === endpoint).map((s) => s.payload.title)).toEqual(['Você foi confirmado!'])
  })

  it('convidado banido sai do time de outro capitão', async () => {
    const adm = await member('Admin', 'admin')
    const prime = await adm.collection('events').create(eventData(uid(adm), { teams: true, maxParticipants: 3 }))
    const cap = await member('Capitã')
    const jog = await member('Jogador')
    await jog.collection('users').update(uid(jog), { availableForTeam: true })
    await post(cap, `/api/g/events/${prime.id}/register`)
    const inv = await post(cap, `/api/g/events/${prime.id}/invites`, { player: uid(jog) })
    await post(jog, `/api/g/invites/${inv.id}/accept`)

    await post(adm, `/api/g/admin/users/${uid(jog)}/ban`, { reason: 'x' })
    expect((await adm.collection('invites').getOne(inv.id)).status).toBe('cancelled')
  })
})
