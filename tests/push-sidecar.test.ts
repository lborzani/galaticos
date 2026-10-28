// Sidecar real (push/server.ts) contra um serviço de push HTTPS falso: confere VAPID, criptografia e expirados.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { createECDH, randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:https'
import { tmpdir } from 'node:os'
import path from 'node:path'
import webpush from 'web-push'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SIDECAR = 'http://127.0.0.1:8093'
const hits: { url: string; headers: Record<string, unknown>; body: Buffer }[] = []
let service: Server
let sidecar: ChildProcess
let pushBase = ''

beforeAll(async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'push-tls-'))
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=localhost', '-days', '1',
    '-keyout', `${dir}/key.pem`, '-out', `${dir}/cert.pem`], { stdio: 'ignore' })
  service = createServer({ key: readFileSync(`${dir}/key.pem`), cert: readFileSync(`${dir}/cert.pem`) }, async (req, res) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c)
    hits.push({ url: req.url!, headers: req.headers, body: Buffer.concat(chunks) })
    res.writeHead(req.url!.startsWith('/gone') ? 410 : 201).end()
  })
  await new Promise<void>((r) => service.listen(0, '127.0.0.1', r))
  pushBase = `https://127.0.0.1:${(service.address() as { port: number }).port}`

  const vapid = webpush.generateVAPIDKeys()
  sidecar = spawn(process.execPath, ['push/server.ts'], {
    env: { ...process.env, VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, PUSH_SECRET: 's3cret', PUSH_PORT: '8093', NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    stdio: 'ignore',
  })
  for (let i = 0; i < 50; i++) {
    if (await fetch(SIDECAR).then(() => true, () => false)) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('sidecar não subiu')
})

afterAll(() => {
  sidecar?.kill()
  service?.close()
})

const browserKeys = () => ({
  p256dh: createECDH('prime256v1').generateKeys().toString('base64url'),
  auth: randomBytes(16).toString('base64url'),
})

const send = (body: unknown, secret = 's3cret') =>
  fetch(`${SIDECAR}/send`, { method: 'POST', headers: { authorization: `Bearer ${secret}` }, body: JSON.stringify(body) })

describe('sidecar de push', () => {
  it('recusa sem segredo e corpo inválido', async () => {
    expect((await send({}, 'errado')).status).toBe(401)
    expect((await send({ subscriptions: 'x' })).status).toBe(400)
  })

  it('entrega criptografado com VAPID e devolve os expirados', async () => {
    const payload = { title: 'Falta 1 hora!', body: 'Bate-bola começa em 1 hora.' }
    const res = await send({
      payload,
      subscriptions: [
        { endpoint: `${pushBase}/ok`, keys: browserKeys() },
        { endpoint: `${pushBase}/gone`, keys: browserKeys() },
      ],
    })
    expect(await res.json()).toEqual({ sent: 1, gone: [`${pushBase}/gone`] })

    const ok = hits.find((h) => h.url === '/ok')!
    expect(ok.headers['content-encoding']).toBe('aes128gcm')
    expect(String(ok.headers.authorization)).toMatch(/^vapid t=.+, k=.+/)
    expect(ok.headers.ttl).toBe('3600')
    expect(ok.body.length).toBeGreaterThan(0)
    expect(ok.body.toString()).not.toContain('Falta 1 hora') // conteúdo só legível pelo navegador
  })
})
