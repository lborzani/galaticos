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
export async function member(name = 'Jogador') {
  const email = `u${Date.now()}${seq++}@test.local`
  const password = 'senha-forte-123'
  const root = await admin()
  await root.collection('users').create({ email, password, passwordConfirm: password, name, verified: true })
  const pb = new PocketBase(pbUrl())
  await pb.collection('users').authWithPassword(email, password)
  return pb
}
