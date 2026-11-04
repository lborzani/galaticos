import { chromium } from '@playwright/test'
import { expect, loginAs, test } from './fixtures'
import { writeQrVideo } from './fake-camera'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
/** Dia e hora (Brasília) de um treino que começa daqui a `min` minutos. */
function startingIn(min: number) {
  const d = new Date(Date.now() + min * 60_000 - 3 * 3600_000)
  return { day: WEEKDAYS[d.getUTCDay()], time: d.toISOString().slice(11, 16) }
}

test('professor cria turma e matricula; aluno vê o QR; professor lê e a presença aparece', async ({ page, makeUser, api, isMobile }, info) => {
  test.skip(!isMobile, 'passaporte e validação só no celular (no desktop: layout.spec)')
  const suffix = `${Date.now()}${info.parallelIndex}`
  const prof = await makeUser({ name: `Prof ${suffix}`, role: 'professor' })
  const aluno = await makeUser({ name: `Aluno ${suffix}` })
  const court = await api.collection('courts').create({ name: `Quadra ${suffix}` })
  const turma = `Turma ${suffix}`
  const { day, time } = startingIn(30)

  await loginAs(page, prof)
  await page.goto('/treinos')
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Nova turma' }).click()
  await page.getByLabel('Nome').fill(turma)
  await page.getByRole('combobox', { name: 'Quadra' }).click()
  await page.getByRole('option', { name: court.name }).click()
  await page.getByLabel(day, { exact: true }).check()
  await page.getByLabel('Hora (Brasília)').fill(time)
  await page.getByLabel('Duração (min)').fill('90')
  await page.getByRole('button', { name: 'Salvar turma' }).click()
  await expect(page.getByText('Turma criada')).toBeVisible()

  await page.getByLabel('Buscar aluno').fill(aluno.name)
  await page.getByRole('button', { name: `Matricular ${aluno.name}` }).click()
  await expect(page.getByRole('button', { name: `Tirar ${aluno.name} da turma` })).toBeVisible()

  const ctxAluno = await page.context().browser()!.newContext()
  const alunoPage = await ctxAluno.newPage()
  await loginAs(alunoPage, aluno)
  await alunoPage.goto('/passaporte')
  const passport = alunoPage.getByRole('region', { name: `Passaporte ${turma}` })
  await expect(passport.getByRole('img', { name: 'QR Code do passaporte' })).toBeVisible()
  await expect(passport).toContainText('Próximo treino')

  const { token } = await api.collection('enrollments').getFirstListItem(`student = "${aluno.id}"`)
  const video = info.outputPath('qr.y4m')
  writeQrVideo(video, token)
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
  })
  const ctx = await browser.newContext({ ...info.project.use, permissions: ['camera'] })
  const scanPage = await ctx.newPage()
  await loginAs(scanPage, prof)
  await scanPage.goto('/treinos/validar')
  const result = scanPage.getByRole('status')
  await expect(result).toContainText(aluno.name, { timeout: 15_000 })
  await expect(result).toContainText(`Treino ${turma}`)
  await result.getByRole('button', { name: 'Confirmar presença' }).click()
  await expect(scanPage.getByText(`Presença de ${aluno.name} confirmada`)).toBeVisible()
  await browser.close()

  // agenda → sessão de agora mostra o aluno presente; o passaporte do aluno também muda ao vivo
  await page.goto('/treinos')
  await page.getByRole('link', { name: new RegExp(turma) }).first().click()
  await expect(page.getByRole('group', { name: aluno.name })).toContainText('Presente')
  await expect(passport).toContainText('Presença confirmada')
  await ctxAluno.close()
})

test('membro não acessa os treinos', async ({ page, makeUser }) => {
  await loginAs(page, await makeUser())
  await page.goto('/treinos')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Treinos' })).toHaveCount(0)
})
