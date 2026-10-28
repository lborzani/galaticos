import PocketBase from 'pocketbase'
import { expect, loginAs, test } from './fixtures'

test('fila de espera anda ao vivo entre dois jogadores', async ({ browser, page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  const ana = await makeUser({ name: 'Ana Titular' })
  const bia = await makeUser({ name: 'Bia Reserva' })
  const ev = await makeEvent(admin.id, { maxParticipants: 1 })

  await loginAs(page, ana)
  await page.goto(`/evento/${ev.id}`)
  await page.getByRole('button', { name: 'Entrar na lista' }).click()
  await expect(page.getByText('Você está confirmado')).toBeVisible()
  await expect(page.getByText('Lotado')).toBeVisible()

  const biaCtx = await browser.newContext()
  const biaPage = await biaCtx.newPage()
  await loginAs(biaPage, bia)
  await biaPage.goto(`/evento/${ev.id}`)
  await expect(biaPage.getByRole('list', { name: /Confirmados/ })).toContainText('Ana Titular')
  await biaPage.getByRole('button', { name: 'Entrar na lista de espera' }).click()
  await expect(biaPage.getByText('Você é o 1º da lista de espera')).toBeVisible()

  // Ana vê a Bia entrar na fila sem recarregar
  await expect(page.getByRole('list', { name: /Lista de espera/ })).toContainText('Bia Reserva')

  await page.getByRole('button', { name: 'Cancelar inscrição' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar inscrição' }).click()
  await expect(page.getByRole('button', { name: 'Entrar na lista de espera' })).toBeVisible()

  // Bia é promovida ao vivo
  await expect(biaPage.getByText('Você está confirmado')).toBeVisible()
  await expect(biaPage.getByRole('list', { name: /Confirmados/ })).toContainText('Bia Reserva')
  await expect(biaPage.getByRole('list', { name: /Lista de espera/ })).toHaveCount(0)
  await biaCtx.close()
})

test('lista fechada mostra quando abre e não deixa entrar', async ({ page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id, { registrationOpensAt: new Date(Date.now() + 3600_000).toISOString() })
  await loginAs(page, await makeUser())
  await page.goto(`/evento/${ev.id}`)
  await expect(page.getByText(/A lista abre/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Entrar na lista/ })).toHaveCount(0)
})

test('card do evento mostra confirmados e espera', async ({ page, api, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id, { maxParticipants: 1 })
  for (const name of ['Um Jogador', 'Dois Jogador']) {
    const u = await makeUser({ name })
    const pb = new PocketBase(api.baseURL)
    await pb.collection('users').authWithPassword(u.email, u.password)
    await pb.send(`/api/g/events/${ev.id}/register`, { method: 'POST' })
  }
  await loginAs(page, admin)
  await page.goto('/')
  await expect(page.getByRole('link', { name: new RegExp(ev.title) })).toContainText('1/1 confirmados · 1 na espera')
})
