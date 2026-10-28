import { test as base, expect, type Page } from '@playwright/test'
import PocketBase from 'pocketbase'
import { BASE_URL, SU } from '../playwright.config'

export type TestUser = { id: string; email: string; password: string; name: string }

let seq = 0
const unique = () => `${Date.now()}${process.pid}${seq++}`
const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

type Fixtures = {
  /** Client autenticado como superuser, para preparar dados sem passar pela UI. */
  api: PocketBase
  makeUser: (opts?: { name?: string; role?: 'admin'; verified?: boolean }) => Promise<TestUser>
  makeEvent: (createdBy: string, over?: Record<string, unknown>) => Promise<{ id: string; title: string }>
}

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const pb = new PocketBase(BASE_URL)
    await pb.collection('_superusers').authWithPassword(SU.email, SU.password)
    await use(pb)
  },
  makeUser: async ({ api }, use) => {
    await use(async ({ name = 'Jogador E2E', role, verified = true } = {}) => {
      const email = `e2e${unique()}@test.local`
      const password = 'senha-e2e-123'
      const rec = await api.collection('users').create({ email, password, passwordConfirm: password, name, role, verified })
      return { id: rec.id, email, password, name }
    })
  },
  makeEvent: async ({ api }, use) => {
    await use(async (createdBy, over = {}) => {
      const title = `Evento ${unique()}`
      return api.collection('events').create({
        title, type: 'custom', eventDate: inHours(48), registrationOpensAt: inHours(-1),
        location: 'Quadra E2E', maxParticipants: 10, createdBy, ...over,
      })
    })
  },
})

/** Abre o app já logado como `user` (sessão injetada no localStorage, como o SDK faz). */
export async function loginAs(page: Page, user: TestUser) {
  const pb = new PocketBase(BASE_URL)
  const { token, record } = await pb.collection('users').authWithPassword(user.email, user.password)
  // só na primeira carga: reloads e logout precisam ver o que o app gravou depois
  await page.addInitScript((auth) => {
    if (!sessionStorage.getItem('e2e_seeded')) {
      localStorage.setItem('pocketbase_auth', auth)
      sessionStorage.setItem('e2e_seeded', '1')
    }
  }, JSON.stringify({ token, record }))
}

export { expect }
