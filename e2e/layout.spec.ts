import { expect, loginAs, test } from './fixtures'

test('navegação certa para o tamanho de tela e sem scroll horizontal', async ({ page, makeUser, makeEvent }, info) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id)
  await loginAs(page, admin)

  for (const url of ['/', '/perfil', `/evento/${ev.id}`, '/admin', '/admin/eventos/novo', '/posts', '/admin/usuarios']) {
    await page.goto(url)
    await expect(page.locator('main')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, url).toBeLessThanOrEqual(0)
  }

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' })
  if (info.project.name === 'mobile') {
    await expect(bottomNav).toBeVisible()
    await bottomNav.getByRole('link', { name: 'Perfil' }).click()
    await expect(page).toHaveURL(/\/perfil$/)
  } else {
    await expect(bottomNav).toBeHidden()
    await expect(page.locator('aside').getByRole('link', { name: 'Perfil' })).toBeVisible()
  }
})
