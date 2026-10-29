import { expect, loginAs, test } from './fixtures'

/** Valor de <input type="datetime-local"> daqui a `h` horas, no fuso do navegador (America/Sao_Paulo). */
const localInput = (h: number) =>
  new Date(Date.now() + h * 3600_000).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(' ', 'T')

test('admin cadastra quadra e cria evento nela', async ({ page, makeUser }) => {
  const court = `Quadra do Parque ${Date.now()}${test.info().parallelIndex}`
  await loginAs(page, await makeUser({ role: 'admin' }))
  await page.goto('/')
  await page.getByRole('link', { name: 'Configurações' }).click()
  await page.getByRole('button', { name: 'Nova quadra' }).click()
  await page.getByLabel('Nome').fill(court)
  await page.getByLabel('Endereço (opcional)').fill('Av. Paulista, 1000')
  await page.getByRole('button', { name: 'Salvar quadra' }).click()
  await expect(page.getByRole('group', { name: court })).toContainText('Av. Paulista, 1000')

  await page.getByRole('button', { name: 'Nova quadra' }).click()
  await page.getByLabel('Nome').fill(court.toLowerCase())
  await page.getByRole('button', { name: 'Salvar quadra' }).click()
  await expect(page.getByText('Já existe uma quadra com esse nome')).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await page.goto('/')
  await page.getByRole('link', { name: 'Novo evento' }).click()

  await page.getByRole('combobox', { name: 'Template' }).click()
  await page.getByRole('option', { name: 'Bate-bola Domingo' }).click()
  await expect(page.getByLabel('Título')).toHaveValue('Bate-bola Domingo')
  await expect(page.getByLabel('Vagas')).toHaveValue('28')
  await page.getByLabel('Vagas').fill('30') // sugestão do template, editável

  await page.getByLabel('Data e hora do evento').fill(localInput(2))
  await page.getByLabel('Lista abre em').fill(localInput(3))
  await page.getByRole('combobox', { name: 'Quadra' }).click()
  await page.getByRole('option', { name: court }).click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('A lista deve abrir antes do evento')).toBeVisible()

  await page.getByLabel('Lista abre em').fill(localInput(-1))
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/\/evento\/\w+$/)
  await expect(page.getByRole('heading', { name: 'Bate-bola Domingo' })).toBeVisible()
  await expect(page.getByText('Lista aberta')).toBeVisible()
  await expect(page.getByText('30 vagas')).toBeVisible()
  await expect(page.getByText(court)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Av. Paulista, 1000' })).toHaveAttribute('href', /google\.com\/maps.*Av\.%20Paulista/)
})

test('admin cria template com times e evento a partir dele', async ({ page, makeUser, api }) => {
  const tpl = `Torneio ${Date.now()}${test.info().parallelIndex}`
  const court = await api.collection('courts').create({ name: `Quadra T ${Date.now()}${test.info().parallelIndex}` })
  await loginAs(page, await makeUser({ role: 'admin' }))
  await page.goto('/admin/config')
  await page.getByRole('button', { name: 'Novo template' }).click()
  await page.getByLabel('Nome').fill(tpl)
  await page.getByLabel('Vagas').fill('4')
  await page.getByLabel('Com times').click()
  await page.getByRole('button', { name: 'Salvar template' }).click()
  await expect(page.getByRole('group', { name: tpl })).toContainText('4 vagas · com times')

  await page.goto('/admin/eventos/novo')
  await page.getByRole('combobox', { name: 'Template' }).click()
  await page.getByRole('option', { name: tpl }).click()
  await expect(page.getByLabel('Vagas')).toHaveValue('4')
  await expect(page.getByText('Com times: os confirmados são capitães')).toBeVisible()
  await page.getByLabel('Data e hora do evento').fill(localInput(2))
  await page.getByLabel('Lista abre em').fill(localInput(-1))
  await page.getByRole('combobox', { name: 'Quadra' }).click()
  await page.getByRole('option', { name: court.name }).click()
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: tpl })).toBeVisible()
  await expect(page.getByText('Capitães (0/4)')).toBeVisible()
  await page.getByRole('link', { name: 'Editar' }).click()
  await expect(page.getByLabel('Template')).toHaveValue(tpl)
  await expect(page.getByLabel('Template')).toBeDisabled()
})

test('quadra com evento não pode ser apagada', async ({ page, makeUser, makeEvent, api }) => {
  const admin = await makeUser({ role: 'admin' })
  const court = await api.collection('courts').create({ name: `Quadra Usada ${Date.now()}${test.info().parallelIndex}` })
  await makeEvent(admin.id, { court: court.id })
  await loginAs(page, admin)
  await page.goto('/admin/config')
  await page.getByRole('group', { name: court.name }).getByRole('button', { name: 'Apagar' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Apagar' }).click()
  await expect(page.getByText('Essa quadra tem eventos; não dá para apagar.')).toBeVisible()
  await expect(page.getByRole('group', { name: court.name })).toBeVisible()
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
