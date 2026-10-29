// Sobe um PocketBase descartável (pb_data temporário, migrations e hooks do repo) para os testes de integração.
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { TestProject } from 'vitest/node'

const PB_DIR = path.resolve(import.meta.dirname, '../pocketbase')
const BIN = path.join(PB_DIR, 'pocketbase')
export const PB_URL = 'http://127.0.0.1:8091'
export const SUPERUSER = { email: 'root@test.local', password: 'root-pass-123' }
export const FAKE_PUSH_URL = 'http://127.0.0.1:8094'

/** Sidecar de push falso: guarda o que o PocketBase mandaria entregar. Endpoints com "gone" respondem como expirados. */
function fakePushSidecar() {
  const sent: { endpoint: string; payload: unknown }[] = []
  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/sent') return res.end(JSON.stringify(sent))
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

  execFileSync(BIN, ['migrate', 'up', ...dirs])
  execFileSync(BIN, ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...dirs])
  const push = fakePushSidecar()
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
    rmSync(dataDir, { recursive: true, force: true })
  }
}

declare module 'vitest' {
  export interface ProvidedContext { pbUrl: string; courtId: string }
}
