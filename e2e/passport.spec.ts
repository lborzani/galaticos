import { chromium } from '@playwright/test'
import PocketBase from 'pocketbase'
import { expect, loginAs, test } from './fixtures'
import { writeQrVideo } from './fake-camera'

test('passaporte mostra QR só para confirmado', async ({ page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id, { maxParticipants: 1 })
  const ana = await makeUser({ name: 'Ana Titular' })
  await loginAs(page, ana)

  await page.goto('/passaporte')
  await expect(page.getByText('Você não está confirmado em nenhum evento')).toBeVisible()

  await page.goto(`/evento/${ev.id}`)
  await page.getByRole('button', { name: 'Entrar na lista' }).click()
  await expect(page.getByText('Você está confirmado')).toBeVisible()
  await page.goto('/passaporte')
  const card = page.getByRole('region', { name: `Passaporte ${ev.title}` })
  await expect(card.getByRole('img', { name: 'QR Code do passaporte' })).toBeVisible()
})

test('admin lê o QR pela câmera e confirma presença; membro não acessa o scanner', async ({ page, makeUser, makeEvent }, info) => {
  const admin = await makeUser({ role: 'admin' })
  const bia = await makeUser({ name: 'Bia Presente' })
  const ev = await makeEvent(admin.id)

  const biaPb = new PocketBase(info.project.use.baseURL)
  await biaPb.collection('users').authWithPassword(bia.email, bia.password)
  const reg = await biaPb.send(`/api/g/events/${ev.id}/register`, { method: 'POST' })
  const { token } = await biaPb.collection('passports').getFirstListItem(`registration = "${reg.id}"`)

  // membro comum é mandado de volta para o início
  await loginAs(page, bia)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/$/)

  const video = info.outputPath('qr.y4m')
  writeQrVideo(video, token)
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
  })
  const ctx = await browser.newContext({ ...info.project.use, permissions: ['camera'] })
  // o leitor tem que usar o wasm servido pelo app (offline/self-hosted), nunca o CDN padrão
  await ctx.route(/cdn\.jsdelivr\.net|unpkg\.com|fastly\.jsdelivr/, (r) => r.abort())
  const adminPage = await ctx.newPage()
  await loginAs(adminPage, admin)
  await adminPage.goto('/admin')

  const result = adminPage.getByRole('status')
  await expect(result).toContainText('Bia Presente', { timeout: 15_000 })
  await expect(result).toContainText(ev.title)
  await result.getByRole('button', { name: 'Confirmar presença' }).click()
  await expect(adminPage.getByText('Presença de Bia Presente confirmada')).toBeVisible()

  // a câmera continua vendo o mesmo QR: segunda leitura avisa que já está presente
  await expect(adminPage.getByRole('status')).toContainText('Já estava presente', { timeout: 15_000 })
  await browser.close()

  // no passaporte da Bia o QR vira "presença confirmada", ao vivo
  await page.goto('/passaporte')
  await expect(page.getByText('Presença confirmada')).toBeVisible()
})
