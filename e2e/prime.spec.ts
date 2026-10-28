import type { Browser } from '@playwright/test'
import { expect, loginAs, test, type TestUser } from './fixtures'

// nomes únicos: projetos e repetições rodam em paralelo no mesmo banco
const uid = () => Math.random().toString(36).slice(2, 6)

async function openAs(browser: Browser, user: TestUser, url: string) {
  const ctx = await browser.newContext(test.info().project.use)
  const page = await ctx.newPage()
  await loginAs(page, user)
  await page.goto(url)
  return page
}

test('capitão convida, jogador aceita pela inbox e o time atualiza ao vivo para todos', async ({ browser, page, api, makeUser, makeEvent }) => {
  const CAP = `Carla ${uid()}`, JOG = `Paulo ${uid()}`, VER = `Vera ${uid()}`
  const admin = await makeUser({ role: 'admin' })
  const capita = await makeUser({ name: CAP })
  const jogador = await makeUser({ name: JOG })
  await api.collection('users').update(jogador.id, { availableForTeam: true, position: 'ponteiro' })
  const ev = await makeEvent(admin.id, { type: 'prime', maxParticipants: 3, title: 'Prime de Teste' })

  // capitã entra na lista e vira capitã
  await loginAs(page, capita)
  await page.goto(`/evento/${ev.id}`)
  await page.getByRole('button', { name: 'Entrar na lista' }).click()
  await expect(page.getByRole('list', { name: /Capitães/ })).toContainText(CAP)
  await expect(page.getByRole('list', { name: `Time de ${CAP}` })).toContainText('Ainda sem jogadores')

  // um terceiro acompanha o evento
  const viewer = await openAs(browser, await makeUser({ name: VER }), `/evento/${ev.id}`)
  await expect(viewer.getByRole('list', { name: `Time de ${CAP}` })).toBeVisible()
  await expect(viewer.getByRole('heading', { name: 'Convidar jogadores' })).toHaveCount(0)

  // convite
  await page.getByRole('button', { name: `Convidar ${JOG}` }).click()
  await expect(page.getByRole('list', { name: `Time de ${CAP}` })).toContainText('aguardando')
  await expect(page.getByRole('button', { name: `Convidar ${JOG}` })).toHaveCount(0)

  // jogador vê o contador e aceita pela inbox
  const player = await openAs(browser, jogador, '/')
  await expect(player.getByLabel('1 pendente').filter({ visible: true })).toBeVisible()
  await player.goto('/convites')
  const convite = player.getByRole('region', { name: `Convite de ${CAP}` })
  await expect(convite).toContainText('Prime de Teste')
  await convite.getByRole('button', { name: 'Aceitar' }).click()
  await expect(convite).toContainText('Aceito')
  await expect(player.getByLabel('1 pendente')).toHaveCount(0)

  // capitã e torcedora veem o time completo sem recarregar
  for (const p of [page, viewer]) {
    const team = p.getByRole('list', { name: `Time de ${CAP}` })
    await expect(team).toContainText(JOG)
    await expect(team).not.toContainText('aguardando')
  }
  await viewer.context().close()
  await player.context().close()
})

test('capitão cancela convite pendente e jogador recusa outro', async ({ browser, page, api, makeUser, makeEvent }) => {
  const CAP = `Cris ${uid()}`, ANA = `Ana ${uid()}`, BETO = `Beto ${uid()}`
  const admin = await makeUser({ role: 'admin' })
  const capita = await makeUser({ name: CAP })
  const a = await makeUser({ name: ANA })
  const b = await makeUser({ name: BETO })
  for (const u of [a, b]) await api.collection('users').update(u.id, { availableForTeam: true })
  const ev = await makeEvent(admin.id, { type: 'prime', maxParticipants: 3 })

  await loginAs(page, capita)
  await page.goto(`/evento/${ev.id}`)
  await page.getByRole('button', { name: 'Entrar na lista' }).click()
  await page.getByRole('button', { name: `Convidar ${ANA}` }).click()
  await page.getByRole('button', { name: `Convidar ${BETO}` }).click()
  const team = page.getByRole('list', { name: `Time de ${CAP}` })
  await expect(team).toContainText(BETO)

  await page.getByRole('button', { name: `Cancelar convite de ${ANA}` }).click()
  await expect(team).not.toContainText(ANA)
  await expect(page.getByRole('button', { name: `Convidar ${ANA}` })).toBeVisible()

  const beto = await openAs(browser, b, '/convites')
  await beto.getByRole('region', { name: `Convite de ${CAP}` }).getByRole('button', { name: 'Recusar' }).click()
  await expect(team).not.toContainText(BETO)
  await beto.context().close()
})
