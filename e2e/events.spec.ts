import { expect, loginAs, test } from './fixtures'

/** Valor de <input type="datetime-local"> daqui a `h` horas, no fuso do navegador (America/Sao_Paulo). */
const localInput = (h: number) =>
  new Date(Date.now() + h * 3600_000).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(' ', 'T')

test('admin cria evento pelo formulário', async ({ page, makeUser }) => {
  await loginAs(page, await makeUser({ role: 'admin' }))
  await page.goto('/')
  await page.getByRole('link', { name: 'Novo evento' }).click()

  await page.getByRole('combobox', { name: 'Tipo' }).click()
  await page.getByRole('option', { name: 'Bate-bola Domingo' }).click()
  await expect(page.getByLabel('Título')).toHaveValue('Bate-bola Domingo')
  await expect(page.getByLabel('Vagas')).toHaveValue('28')
  await expect(page.getByLabel('Vagas')).toBeDisabled()

  await page.getByLabel('Data e hora do evento').fill(localInput(2))
  await page.getByLabel('Lista abre em').fill(localInput(3))
  await page.getByLabel('Local').fill('Quadra do Parque')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('A lista deve abrir antes do evento')).toBeVisible()

  await page.getByLabel('Lista abre em').fill(localInput(-1))
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/\/evento\/\w+$/)
  await expect(page.getByRole('heading', { name: 'Bate-bola Domingo' })).toBeVisible()
  await expect(page.getByText('Lista aberta')).toBeVisible()
  await expect(page.getByText('28 vagas')).toBeVisible()
})

test('membro vê criação e cancelamento ao vivo, sem recarregar', async ({ browser, page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  await loginAs(page, await makeUser())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximos' })).toBeVisible()

  const ev = await makeEvent(admin.id)
  const card = page.getByRole('link', { name: new RegExp(ev.title) })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Lista aberta')

  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await loginAs(adminPage, admin)
  await adminPage.goto(`/evento/${ev.id}`)
  await adminPage.getByRole('button', { name: 'Cancelar evento' }).click()
  await adminPage.getByLabel('Motivo').fill('Chuva forte')
  await adminPage.getByRole('alertdialog').getByRole('button', { name: 'Cancelar evento' }).click()
  await expect(adminPage.getByText('Evento cancelado.')).toBeVisible()
  await adminCtx.close()

  await expect(card).toContainText('Cancelado')
  await card.click()
  await expect(page.getByText('Chuva forte')).toBeVisible()
})

test('membro não vê nem acessa ações de admin', async ({ page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id)
  await loginAs(page, await makeUser())

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Novo evento' })).toHaveCount(0)

  await page.goto(`/evento/${ev.id}`)
  await expect(page.getByRole('heading', { name: ev.title })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancelar evento' })).toHaveCount(0)

  await page.goto('/admin/eventos/novo')
  await expect(page).toHaveURL(/\/$/)
})
