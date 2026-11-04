import { expect, loginAs, test } from './fixtures'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test('admin publica post com foto e evento; membro vê ao vivo e curte', async ({ browser, page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin', name: 'Admin Posts' })
  const ev = await makeEvent(admin.id)
  const text = `Bate-bola confirmado ${Date.now()}${test.info().parallelIndex}`

  const memberCtx = await browser.newContext()
  const member = await memberCtx.newPage()
  await loginAs(member, await makeUser())
  await member.goto('/posts')
  await expect(member.getByRole('heading', { name: 'Posts' })).toBeVisible()
  await expect(member.getByRole('button', { name: 'Novo post' })).toHaveCount(0)

  await loginAs(page, admin)
  await page.goto('/')
  await page.getByRole('link', { name: 'Posts', exact: true }).click()
  await page.getByRole('button', { name: 'Novo post' }).click()
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText('Escreva o texto do post')).toBeVisible()
  await page.getByLabel('Texto').fill(text)
  await page.getByLabel(/^Fotos/).setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('combobox', { name: 'Evento (opcional)' }).click()
  await page.getByRole('option', { name: new RegExp(ev.title) }).click()
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText('Post publicado')).toBeVisible()

  const post = member.getByRole('article').filter({ hasText: text })
  await expect(post).toBeVisible()
  await expect(post).toContainText('Admin Posts')
  await expect(post.getByRole('img', { name: 'Foto do post' })).toBeVisible()
  await expect(post.getByRole('link', { name: new RegExp(ev.title) })).toHaveAttribute('href', `/evento/${ev.id}`)
  await expect(post.getByRole('button', { name: 'Apagar post' })).toHaveCount(0)

  await post.getByRole('button', { name: 'Curtir' }).click()
  await expect(post.getByRole('button', { name: 'Descurtir' })).toHaveText('1')
  await expect(page.getByRole('article').filter({ hasText: text }).getByRole('button', { name: 'Curtir' })).toHaveText('1')
  await post.getByRole('button', { name: 'Descurtir' }).click()
  await expect(post.getByRole('button', { name: 'Curtir' })).toHaveText('0')
  await memberCtx.close()
})

test('admin apaga post', async ({ page, makeUser, api }) => {
  const admin = await makeUser({ role: 'admin' })
  const text = `Post para apagar ${Date.now()}${test.info().parallelIndex}`
  await api.collection('posts').create({ author: admin.id, body: text })
  await loginAs(page, admin)
  await page.goto('/posts')
  const post = page.getByRole('article').filter({ hasText: text })
  await post.getByRole('button', { name: 'Apagar post' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Apagar' }).click()
  await expect(page.getByText('Post apagado')).toBeVisible()
  await expect(post).toHaveCount(0)
})
