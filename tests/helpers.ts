import PocketBase from 'pocketbase'
import { inject } from 'vitest'
import { SUPERUSER } from './setup'

export const pbUrl = () => inject('pbUrl')

export async function admin() {
  const pb = new PocketBase(pbUrl())
  await pb.collection('_superusers').authWithPassword(SUPERUSER.email, SUPERUSER.password)
  return pb
}

let seq = 0
/** Cria um usuário verificado e devolve um client autenticado como ele. */
export async function member(name = 'Jogador', role: 'member' | 'admin' = 'member') {
  const email = `u${Date.now()}${seq++}@test.local`
  const password = 'senha-forte-123'
  const root = await admin()
  await root.collection('users').create({ email, password, passwordConfirm: password, name, role, verified: true })
  const pb = new PocketBase(pbUrl())
  await pb.collection('users').authWithPassword(email, password)
  return pb
}

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

/** Payload válido de evento; sobrescreva o que o teste precisar. */
export function eventData(createdBy: string, over: Record<string, unknown> = {}) {
  return {
    title: 'Bate-bola Domingo',
    type: 'sunday',
    eventDate: inHours(48),
    registrationOpensAt: inHours(-1),
    location: 'Quadra',
    maxParticipants: 28,
    createdBy,
    ...over,
  }
}

export { inHours }
