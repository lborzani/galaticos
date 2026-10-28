// Sobe um PocketBase descartável (pb_data temporário, migrations e hooks do repo) para os testes de integração.
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { TestProject } from 'vitest/node'

const PB_DIR = path.resolve(import.meta.dirname, '../pocketbase')
const BIN = path.join(PB_DIR, 'pocketbase')
export const PB_URL = 'http://127.0.0.1:8091'
export const SUPERUSER = { email: 'root@test.local', password: 'root-pass-123' }

export default async function setup(project: TestProject) {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'galaticos-pb-'))
  const dirs = ['--dir', dataDir, '--migrationsDir', path.join(PB_DIR, 'pb_migrations'), '--hooksDir', path.join(PB_DIR, 'pb_hooks')]

  execFileSync(BIN, ['migrate', 'up', ...dirs])
  execFileSync(BIN, ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...dirs])
  const proc = spawn(BIN, ['serve', '--http', '127.0.0.1:8091', '--hooksWatch=false', ...dirs], { stdio: 'inherit' })

  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${PB_URL}/api/health`)).ok) break
    } catch { /* ainda subindo */ }
    if (i > 50) throw new Error('PocketBase não subiu')
    await new Promise((r) => setTimeout(r, 100))
  }

  project.provide('pbUrl', PB_URL)
  return () => {
    proc.kill()
    rmSync(dataDir, { recursive: true, force: true })
  }
}

declare module 'vitest' {
  export interface ProvidedContext { pbUrl: string }
}
