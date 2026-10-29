import { expect, loginAs, test } from './fixtures'

const localInput = (h: number) =>
  new Date(Date.now() + h * 3600_000).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(' ', 'T')

test('admin muda rank e papel, bane e desbane; banido cai e vê conta suspensa', async ({ browser, page, makeUser }) => {
  const suffix = `${Date.now()}${test.info().parallelIndex}`
  const alvo = await makeUser({ name: `Alvo ${suffix}` })
  await loginAs(page, await makeUser({ role: 'admin' }))

  const ctx = await browser.newContext()
  const alvoPage = await ctx.newPage()
  await loginAs(alvoPage, alvo)
  await alvoPage.goto('/perfil')
  await expect(alvoPage.getByLabel('Rank')).toHaveValue('Regular')

  await page.goto('/admin')
  await page.getByRole('link', { name: 'Usuários' }).click()
  await page.getByLabel('Buscar usuário').fill(suffix)
  const card = page.getByRole('group', { name: alvo.name })
  await card.getByRole('combobox', { name: `Rank de ${alvo.name}` }).click()
  await page.getByRole('option', { name: 'Lendário' }).click()
  await expect(card.locator('[data-slot=badge]', { hasText: 'Lendário' })).toBeVisible()
  await card.getByRole('combobox', { name: `Papel de ${alvo.name}` }).click()
  await page.getByRole('option', { name: 'Admin' }).click()
  await expect(card.locator('[data-slot=badge]', { hasText: 'Admin' })).toBeVisible()

  await card.getByRole('button', { name: 'Banir' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('button', { name: 'Banir' })).toBeDisabled()
  await dialog.getByLabel('Motivo').fill('Faltou 3 vezes sem avisar')
  await dialog.getByRole('button', { name: 'Banir' }).click()
  await expect(page.getByText(`${alvo.name} banido`)).toBeVisible()
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: 'Banidos' }).click()
  await expect(card).toContainText('Faltou 3 vezes sem avisar')

  // a sessão do banido morre: ao recarregar volta para o login, que explica o motivo
  await alvoPage.reload()
  await expect(alvoPage).toHaveURL(/\/entrar$/)
  await alvoPage.getByLabel('E-mail').fill(alvo.email)
  await alvoPage.getByLabel('Senha').fill(alvo.password)
  await alvoPage.getByRole('button', { name: 'Entrar' }).click()
  await expect(alvoPage.getByRole('alert')).toContainText('Conta suspensa')
  await expect(alvoPage.getByRole('button', { name: 'Reenviar e-mail de confirmação' })).toHaveCount(0)

  await card.getByRole('button', { name: 'Desbanir' }).click()
  await expect(page.getByText(`${alvo.name} desbanido`)).toBeVisible()
  await alvoPage.getByRole('button', { name: 'Entrar' }).click()
  await expect(alvoPage.getByRole('heading', { name: /^Olá/ })).toBeVisible()
  await ctx.close()
})

test('template restringe ranks; evento mostra e barra quem está fora', async ({ browser, page, makeUser, api }) => {
  const tpl = `4fun ${Date.now()}${test.info().parallelIndex}`
  const court = await api.collection('courts').create({ name: `Quadra R ${Date.now()}${test.info().parallelIndex}` })
  await loginAs(page, await makeUser({ role: 'admin' }))
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Novo template' }).click()
  await page.getByLabel('Nome').fill(tpl)
  await page.getByLabel('Vagas').fill('3')
  await page.getByLabel('Com times').click()
  await page.getByRole('checkbox', { name: 'Regular' }).check()
  await page.getByRole('button', { name: 'Salvar template' }).click()
  await expect(page.getByRole('group', { name: tpl })).toContainText('só Regulares')

  await page.getByRole('link', { name: 'Novo evento' }).click()
  await page.getByRole('combobox', { name: 'Template' }).click()
  await page.getByRole('option', { name: tpl }).click()
  await expect(page.getByRole('checkbox', { name: 'Regular' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Lendário' })).not.toBeChecked()
  await page.getByLabel('Data e hora do evento').fill(localInput(2))
  await page.getByLabel('Lista abre em').fill(localInput(-1))
  await page.getByRole('combobox', { name: 'Quadra' }).click()
  await page.getByRole('option', { name: court.name }).click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Só para Regulares')).toBeVisible()
  const url = page.url()

  const lenda = await makeUser({ name: 'Lenda Viva' })
  await api.collection('users').update(lenda.id, { rank: 'lendario' })
  const ctx = await browser.newContext()
  const other = await ctx.newPage()
  await loginAs(other, lenda)
  await other.goto(url)
  await expect(other.getByText('Este evento é só para Regulares.')).toBeVisible()
  await expect(other.getByRole('button', { name: 'Entrar na lista' })).toHaveCount(0)
  await ctx.close()
})
