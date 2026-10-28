import path from 'node:path'
import { expect, loginAs, test } from './fixtures'

test('edita nome, posição, disponibilidade e foto', async ({ page, makeUser }) => {
  await loginAs(page, await makeUser({ name: 'Antes' }))
  await page.goto('/perfil')

  await page.getByLabel('Nome').fill('Depois da Silva')
  await page.getByRole('combobox', { name: 'Posição' }).click()
  await page.getByRole('option', { name: 'Líbero' }).click()
  await page.getByRole('switch', { name: 'Disponível para times Prime' }).click()
  await page.locator('#avatar').setInputFiles(path.resolve(import.meta.dirname, '../public/favicon.png'))
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Perfil atualizado')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Nome')).toHaveValue('Depois da Silva')
  await expect(page.getByRole('combobox', { name: 'Posição' })).toHaveText('Líbero')
  await expect(page.getByRole('switch', { name: 'Disponível para times Prime' })).toBeChecked()
  await expect(page.locator('main img[src*="/api/files/"]')).toBeVisible()
})
