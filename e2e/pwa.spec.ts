import { expect, loginAs, test } from './fixtures'

test('instalável e abre offline depois da primeira visita', async ({ page, context, makeUser }) => {
  await loginAs(page, await makeUser({ name: 'Offline Fulano' }))
  await page.goto('/')

  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Galáticos', display: 'standalone', start_url: '/' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)

  // primeira visita instala o service worker; a partir da próxima ele controla a página
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Olá, Offline!' })).toBeVisible()
  await expect(page.getByText('Não foi possível carregar os eventos.')).toBeVisible()

  // telas carregadas sob demanda também vêm do cache
  await page.getByRole('link', { name: 'Perfil' }).filter({ visible: true }).first().click()
  await expect(page.getByLabel('Nome')).toHaveValue('Offline Fulano')
  await expect(page.getByRole('switch', { name: 'Notificações' })).toBeVisible()
  await context.setOffline(false)
})

test('com o service worker ativo, o painel do PocketBase não cai no fallback do app', async ({ page }) => {
  await page.goto('/entrar')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await page.goto('/_/')
  await expect(page.locator('#root')).toHaveCount(0) // #root é o app; o painel tem outra página
  expect(await (await page.request.get('/api/health')).json()).toMatchObject({ code: 200 })
})
