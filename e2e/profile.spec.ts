import path from 'node:path'
import { expect, loginAs, test } from './fixtures'

test('edita nome, apelido, posição, disponibilidade e foto', async ({ page, makeUser }) => {
  await loginAs(page, await makeUser({ name: 'Antes' }))
  await page.goto('/perfil')
  const salvar = page.getByRole('button', { name: 'Salvar' })
  await expect(salvar).toBeDisabled()

  // disponibilidade salva na hora, sem o botão
  await page.getByRole('switch', { name: 'Disponível para times Prime' }).click()
  await expect(page.getByText('Você está disponível para times Prime')).toBeVisible()
  await expect(salvar).toBeDisabled()

  await page.getByLabel('Nome').fill('Depois')
  await expect(salvar).toBeEnabled()
  await page.getByLabel('Nome').fill('Antes')
  await expect(salvar).toBeDisabled()

  await page.getByLabel('Nome').fill('Depois da Silva')
  await page.getByLabel('Apelido').fill('Paredão')
  await page.getByRole('combobox', { name: 'Posição' }).click()
  await page.getByRole('option', { name: 'Líbero' }).click()
  await page.locator('#avatar').setInputFiles(path.resolve(import.meta.dirname, '../public/favicon.png'))
  await salvar.click()
  await expect(page.getByText('Perfil atualizado')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Nome')).toHaveValue('Depois da Silva')
  await expect(page.getByLabel('Apelido')).toHaveValue('Paredão')
  await expect(page.getByRole('combobox', { name: 'Posição' })).toHaveText('Líbero')
  await expect(page.getByRole('switch', { name: 'Disponível para times Prime' })).toBeChecked()
  // foto recomprimida no navegador antes de subir
  await expect(page.locator('main img[src*="/api/files/"]')).toHaveAttribute('src', /avatar_\w+\.webp/)
})
