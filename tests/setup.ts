// Sobe um PocketBase descartável (pb_data temporário, migrations e hooks do repo) para os testes de integração.
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { TestProject } from 'vitest/node'

const PB_DIR = path.resolve(import.meta.dirname, '../pocketbase')
const BIN = path.join(PB_DIR, 'pocketbase')
export const PB_URL = 'http://127.0.0.1:8091'
export const SUPERUSER = { email: 'root@test.local', password: 'root-pass-123' }
export const FAKE_PUSH_URL = 'http://127.0.0.1:8094'
const FAKE_SMTP_PORT = 8095

/** SMTP falso: aceita tudo e guarda as mensagens cruas (os testes leem em FAKE_PUSH_URL/mails). */
function fakeSmtp(mails: string[]) {
  return createTcpServer((sock) => {
    let buf = ''
    let data = false
    sock.write('220 fake\r\n')
    sock.on('data', (chunk) => {
      buf += chunk
      for (;;) {
        if (data) {
          const end = buf.indexOf('\r\n.\r\n')
          if (end < 0) return
          mails.push(buf.slice(0, end))
          buf = buf.slice(end + 5)
          data = false
          sock.write('250 ok\r\n')
          continue
        }
        const nl = buf.indexOf('\r\n')
        if (nl < 0) return
        const cmd = buf.slice(0, nl).toUpperCase()
        buf = buf.slice(nl + 2)
        if (cmd.startsWith('DATA')) { data = true; sock.write('354 go\r\n') }
        else if (cmd.startsWith('QUIT')) sock.end('221 bye\r\n')
        else sock.write('250 ok\r\n')
      }
    })
  }).listen(FAKE_SMTP_PORT, '127.0.0.1')
}

/** Sidecar de push falso: guarda o que o PocketBase mandaria entregar. Endpoints com "gone" respondem como expirados. */
function fakePushSidecar(mails: string[]) {
  const sent: { endpoint: string; payload: unknown }[] = []
  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/sent') return res.end(JSON.stringify(sent))
    if (req.method === 'GET' && req.url === '/mails') return res.end(JSON.stringify(mails))
    if (req.headers.authorization !== 'Bearer test-secret') return res.writeHead(401).end()
    let raw = ''
    for await (const c of req) raw += c
    const body = JSON.parse(raw)
    const gone: string[] = []
    for (const s of body.subscriptions) {
      sent.push({ endpoint: s.endpoint, payload: body.payload })
      if (s.endpoint.includes('gone')) gone.push(s.endpoint)
    }
    res.end(JSON.stringify({ sent: body.subscriptions.length - gone.length, gone }))
  }).listen(8094, '127.0.0.1')
}

export default async function setup(project: TestProject) {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'galaticos-pb-'))
  const dirs = ['--dir', dataDir, '--migrationsDir', path.join(PB_DIR, 'pb_migrations'), '--hooksDir', path.join(PB_DIR, 'pb_hooks')]

  // a migration de users grava o SMTP nas settings a partir do ambiente
  execFileSync(BIN, ['migrate', 'up', ...dirs], { env: { ...process.env, SMTP_HOST: '127.0.0.1', SMTP_PORT: String(FAKE_SMTP_PORT), SMTP_TLS: 'false' } })
  execFileSync(BIN, ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...dirs])
  const mails: string[] = []
  const smtp = fakeSmtp(mails)
  const push = fakePushSidecar(mails)
  const proc = spawn(BIN, ['serve', '--http', '127.0.0.1:8091', '--hooksWatch=false', ...dirs], {
    stdio: 'inherit',
    env: { ...process.env, PUSH_URL: FAKE_PUSH_URL, PUSH_SECRET: 'test-secret', VAPID_PUBLIC_KEY: 'test-public-key' },
  })

  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${PB_URL}/api/health`)).ok) break
    } catch { /* ainda subindo */ }
    if (i > 50) throw new Error('PocketBase não subiu')
    await new Promise((r) => setTimeout(r, 100))
  }

  project.provide('pbUrl', PB_URL)
  // quadra padrão dos eventos de teste
  const su = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: SUPERUSER.email, password: SUPERUSER.password }),
  }).then((r) => r.json())
  const court = await fetch(`${PB_URL}/api/collections/courts/records`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: su.token },
    body: JSON.stringify({ name: 'Quadra' }),
  }).then((r) => r.json())
  project.provide('courtId', court.id)
  return () => {
    proc.kill()
    push.close()
    smtp.close()
    rmSync(dataDir, { recursive: true, force: true })
  }
}

declare module 'vitest' {
  export interface ProvidedContext { pbUrl: string; courtId: string }
}
