import { expect, loginAs, test } from './fixtures'

test('navegação certa para o tamanho de tela e sem scroll horizontal', async ({ page, makeUser, makeEvent }, info) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id)
  await loginAs(page, admin)

  for (const url of ['/', '/perfil', `/evento/${ev.id}`, '/admin/eventos/novo']) {
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
    const aside = page.locator('aside').first()
    await expect(aside.getByRole('link', { name: 'Perfil' })).toBeVisible()
    // QR e câmera ficam no celular
    await expect(aside.getByRole('link', { name: 'Passaporte' })).toBeHidden()
    await expect(aside.getByRole('link', { name: 'Validar' })).toBeHidden()
    for (const url of ['/passaporte', '/admin']) {
      await page.goto(url)
      await expect(page.getByRole('heading', { name: 'Abra no celular' })).toBeVisible()
    }
  }
})
