import PocketBase from 'pocketbase'
import { BASE_URL } from '../playwright.config'
import { expect, loginAs, test, type TestUser } from './fixtures'

test('conta sem telefone precisa informar antes de usar o app; perfil edita', async ({ page, makeUser }) => {
  await loginAs(page, await makeUser({ name: 'Sem Fone', phone: '' }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Informe seu telefone' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0)

  await page.getByLabel('Telefone').fill('(11) 1234')
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await expect(page.getByText('Telefone inválido')).toBeVisible()
  await page.getByLabel('Telefone').fill('21987654321')
  await page.getByRole('button', { name: 'Salvar e continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Sem!' })).toBeVisible()

  await page.goto('/perfil')
  await expect(page.getByLabel('Telefone')).toHaveValue('(21) 98765-4321')
  await page.getByLabel('Telefone').fill('1133334444')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Perfil atualizado')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Telefone')).toHaveValue('(11) 3333-4444')
})

test('admin vê o telefone dos inscritos com link do WhatsApp; membro não', async ({ browser, page, makeUser, makeEvent }) => {
  const admin = await makeUser({ role: 'admin' })
  const ev = await makeEvent(admin.id)
  const register = async (u: TestUser) => {
    const pb = new PocketBase(BASE_URL)
    await pb.collection('users').authWithPassword(u.email, u.password)
    await pb.send(`/api/g/events/${ev.id}/register`, { method: 'POST' })
  }
  const jogador = await makeUser({ name: 'Jogador Fone', phone: '+5531999998888' })
  const outro = await makeUser({ name: 'Outro Membro' })
  await register(jogador)
  await register(outro)

  await loginAs(page, admin)
  await page.goto(`/evento/${ev.id}`)
  const link = page.getByRole('link', { name: '(31) 99999-8888' })
  await expect(link).toHaveAttribute('href', 'https://wa.me/5531999998888')

  const ctx = await browser.newContext()
  const member = await ctx.newPage()
  await loginAs(member, outro)
  await member.goto(`/evento/${ev.id}`)
  await expect(member.getByText('Jogador Fone')).toBeVisible()
  await expect(member.getByRole('link', { name: /\(\d\d\)/ })).toHaveCount(0)
  await ctx.close()
})
