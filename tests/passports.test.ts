import type PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { eventData, member } from './helpers'

const post = (pb: PocketBase, path: string, body?: object) => pb.send(path, { method: 'POST', body })

async function setup(max = 1) {
  const adm = await member('Admin', 'admin')
  const ev = await adm.collection('events').create(eventData(adm.authStore.record!.id, { maxParticipants: max }))
  const p = await member('Jogadora')
  const reg = await post(p, `/api/g/events/${ev.id}/register`)
  const passport = await p.collection('passports').getFirstListItem(`registration = "${reg.id}"`)
  return { adm, ev, p, reg, token: passport.token as string }
}

describe('passaporte e presença', () => {
  it('token é aleatório e só o dono e admins leem', async () => {
    const { adm, p, reg, token } = await setup()
    expect(token).toHaveLength(40)
    expect(token).not.toContain(reg.id)
    const other = await member()
    expect(await other.collection('passports').getFullList()).toHaveLength(0)
    expect((await adm.collection('passports').getFirstListItem(`token = "${token}"`)).user).toBe(p.authStore.record!.id)
    await expect(p.collection('passports').create({ registration: reg.id, user: p.authStore.record!.id, token: 'x'.repeat(40) })).rejects.toThrow()
  })

  it('admin confere e confirma presença; segunda leitura avisa que já está presente', async () => {
    const { adm, token, p } = await setup()
    const look = await post(adm, '/api/g/passports/lookup', { token })
    expect(look).toMatchObject({ alreadyAttended: false, user: { name: 'Jogadora' } })
    expect(look.user.email).toBeFalsy()
    const first = await post(adm, '/api/g/passports/attend', { token })
    expect(first.registration).toMatchObject({ status: 'attended', attendedBy: adm.authStore.record!.id })
    expect((await post(adm, '/api/g/passports/attend', { token })).alreadyAttended).toBe(true)
    // presente não cancela mais
    await expect(post(p, `/api/g/events/${first.event.id}/cancel`)).rejects.toMatchObject({ status: 400 })
  })

  it('membro não valida passaporte', async () => {
    const { p, token } = await setup()
    await expect(post(p, '/api/g/passports/attend', { token })).rejects.toMatchObject({ status: 403 })
    await expect(post(p, '/api/g/passports/lookup', { token })).rejects.toMatchObject({ status: 403 })
  })

  it('recusa QR inválido, inscrição cancelada, lista de espera e evento cancelado', async () => {
    const { adm, ev, p, token } = await setup()
    await expect(post(adm, '/api/g/passports/lookup', { token: 'forjado' })).rejects.toMatchObject({ status: 404, message: 'QR Code inválido.' })

    const espera = await member('Na Espera')
    const reg2 = await post(espera, `/api/g/events/${ev.id}/register`)
    const t2 = (await espera.collection('passports').getFirstListItem(`registration = "${reg2.id}"`)).token
    await expect(post(adm, '/api/g/passports/attend', { token: t2 })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('lista de espera') })

    await post(p, `/api/g/events/${ev.id}/cancel`)
    await expect(post(adm, '/api/g/passports/attend', { token })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('cancelou') })

    await adm.collection('events').update(ev.id, { cancelledAt: new Date().toISOString(), cancellationReason: 'x', cancelledBy: adm.authStore.record!.id })
    await expect(post(adm, '/api/g/passports/attend', { token: t2 })).rejects.toMatchObject({ status: 400, message: 'Esse evento foi cancelado.' })
  })

  it('reinscrição mantém o mesmo passaporte', async () => {
    const { ev, p, reg, token } = await setup(2)
    await post(p, `/api/g/events/${ev.id}/cancel`)
    await post(p, `/api/g/events/${ev.id}/register`)
    expect((await p.collection('passports').getFirstListItem(`registration = "${reg.id}"`)).token).toBe(token)
  })
})
