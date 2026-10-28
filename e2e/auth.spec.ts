import { expect, test } from './fixtures'

test('cadastro, bloqueio até confirmar o e-mail e login', async ({ page, api }) => {
  const email = `cad${Date.now()}${test.info().parallelIndex}@test.local`
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Nova Jogadora')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('senha-e2e-123')
  await page.getByLabel('Confirmar senha').fill('senha-e2e-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Conta criada!')).toBeVisible()

  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-e2e-123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('ainda não confirmado')

  // o link do e-mail chama confirmVerification; aqui marcamos direto
  const user = await api.collection('users').getFirstListItem(`email = "${email}"`)
  await api.collection('users').update(user.id, { verified: true })

  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Nova!' })).toBeVisible()
})

test('validação do cadastro em português', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Senha', { exact: true }).fill('curta')
  await page.getByLabel('Confirmar senha').fill('outra')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Mínimo de 2 caracteres')).toBeVisible()
  await expect(page.getByText('E-mail inválido')).toBeVisible()
  await expect(page.getByText('Mínimo de 8 caracteres')).toBeVisible()
  await expect(page.getByText('As senhas não coincidem')).toBeVisible()
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
