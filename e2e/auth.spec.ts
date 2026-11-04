import { expect, test } from './fixtures'

test('cadastro, bloqueio até confirmar o e-mail e login', async ({ page, api }) => {
  const email = `cad${Date.now()}${test.info().parallelIndex}@test.local`
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Nova Jogadora')
  await page.getByLabel('E-mail').fill(`  ${email.toUpperCase()} `)
  await page.getByLabel('Telefone').fill('11912345678')
  await expect(page.getByLabel('Telefone')).toHaveValue('(11) 91234-5678')
  await page.getByLabel('Senha', { exact: true }).fill('senha-e2e-123')
  await page.getByLabel('Confirmar senha').fill('senha-e2e-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Conta criada!')).toBeVisible()

  await page.getByLabel('E-mail').fill(email.toUpperCase())
  await page.getByLabel('Senha').fill('senha-e2e-123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('ainda não confirmado')

  // o link do e-mail chama confirmVerification; aqui marcamos direto
  const user = await api.collection('users').getFirstListItem(`email = "${email}"`)
  await api.collection('users').update(user.id, { verified: true })

  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Nova!' })).toBeVisible()
})

test('servidor grava o e-mail normalizado', async ({ api }) => {
  const email = `norm${Date.now()}${test.info().parallelIndex}@test.local`
  const password = 'senha-e2e-123'
  const rec = await api.collection('users').create({ email: ` ${email.toUpperCase()} `, password, passwordConfirm: password, name: 'Normal', phone: '+5511987654321' })
  expect(rec.email).toBe(email)
})

test('validação do cadastro em português', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Telefone').fill('1191234')
  await page.getByLabel('Senha', { exact: true }).fill('curta')
  await page.getByLabel('Confirmar senha').fill('outra')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Mínimo de 2 caracteres')).toBeVisible()
  await expect(page.getByText('E-mail inválido')).toBeVisible()
  await expect(page.getByText('Mínimo de 8 caracteres')).toBeVisible()
  await expect(page.getByText('As senhas não coincidem')).toBeVisible()
  await expect(page.getByText('Telefone inválido')).toBeVisible()
})

test('rotas internas exigem login e sair encerra a sessão', async ({ page, makeUser }) => {
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar$/)

  const user = await makeUser()
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha').fill(user.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: /^Olá/ })).toBeVisible()
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/entrar$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
})

test('5 toques rápidos no logo abrem a homenagem ao Well', async ({ page }) => {
  await page.goto('/entrar')
  const logo = page.locator('img[src="/logo-128.webp"]:visible')
  for (let i = 0; i < 4; i++) await logo.click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await logo.click()
  await expect(page.getByRole('heading', { name: 'Em memória de Well' })).toBeVisible()
  await page.getByRole('button', { name: 'Valeu, Well' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
})
