import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase'
import { useSyncExternalStore } from 'react'

export const pb = new PocketBase('/')

export type PlayerPosition = 'levantador' | 'ponteiro' | 'central' | 'oposto' | 'libero' | 'universal'

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  levantador: 'Levantador',
  ponteiro: 'Ponteiro',
  central: 'Central',
  oposto: 'Oposto',
  libero: 'Líbero',
  universal: 'Universal',
}

export type Rank = 'regular' | 'mitico' | 'lendario'

export const RANK_LABELS: Record<Rank, string> = { regular: 'Regular', mitico: 'Mítico', lendario: 'Lendário' }
const RANK_PLURAL: Record<Rank, string> = { regular: 'Regulares', mitico: 'Míticos', lendario: 'Lendários' }

/** "Regulares" / "Míticos e Lendários" (mesmo texto das mensagens do servidor). */
export function ranksLabel(ranks: Rank[]) {
  const names = ranks.map((r) => RANK_PLURAL[r])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0]
}

/** Lista vazia = todos podem. */
export const rankAllowed = (allowed: Rank[] | undefined, rank: Rank) => !allowed?.length || allowed.includes(rank)

export interface User extends RecordModel {
  email?: string
  name: string
  /** +55…; só vem para o próprio usuário e para admins. */
  phone?: string
  avatar: string
  position: PlayerPosition | ''
  availableForTeam: boolean
  role: 'member' | 'admin' | ''
  rank: Rank
  /** Banimento: só vem para admins. */
  bannedAt?: string
  banReason?: string
}

// authStore.record relê do localStorage e devolve objeto novo a cada acesso: cacheia para o useSyncExternalStore.
let current = pb.authStore.record as User | null
pb.authStore.onChange((_, record) => { current = record as User | null })
const subscribe = (cb: () => void) => pb.authStore.onChange(cb)
const snapshot = () => current

/** Usuário logado, reativo a login/logout/refresh. */
export function useUser() {
  return useSyncExternalStore(subscribe, snapshot)
}

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export const isAdmin = (user: User | null) => user?.role === 'admin'

export function avatarUrl(user: Pick<User, 'avatar' | 'collectionId' | 'id'> | null, thumb = '96x96') {
  return user?.avatar ? pb.files.getURL(user, user.avatar, { thumb }) : undefined
}

/** Mensagem em português para erros da API (as do PocketBase vêm em inglês). */
export function errorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  return err instanceof ClientResponseError && err.status === 0 ? 'Sem conexão com o servidor.' : fallback
}

// Mantém a sessão válida (e o `role` atualizado) ao abrir o app.
if (pb.authStore.isValid) {
  pb.collection('users').authRefresh().catch((err: ClientResponseError) => {
    if ([401, 403, 404].includes(err.status)) pb.authStore.clear() // offline mantém a sessão
  })
}

/** Mensagem das rotas /api/g/* (escritas em português pelo próprio backend). */
export function serverMessage(err: unknown, fallback?: string) {
  return err instanceof ClientResponseError && err.status === 400 && err.response?.message ? err.response.message : errorMessage(err, fallback)
}
