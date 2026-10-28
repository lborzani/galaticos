// Sidecar de Web Push: só criptografa e entrega. Quem recebe e quando é decidido nos hooks do PocketBase
// (pb_hooks/lib/push.js), que chamam POST /send. Existe porque o JS dos hooks não tem ECDH/ES256.
import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import webpush from 'web-push'

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET } = process.env
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@galaticos.local'
const HOST = process.env.PUSH_HOST ?? '127.0.0.1'
const PORT = Number(process.env.PUSH_PORT ?? 8098)

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !PUSH_SECRET) {
  console.error('Defina VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e PUSH_SECRET (gere as chaves com: npx web-push generate-vapid-keys)')
  process.exit(1)
}
webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

type Body = {
  subscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[]
  payload: { title: string; body: string; url?: string; tag?: string }
}

const authorized = (header = '') => {
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${PUSH_SECRET}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readJson(req: IncomingMessage) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 1_000_000) throw new Error('corpo grande demais')
  }
  return JSON.parse(raw) as Body
}

function reply(res: ServerResponse, status: number, body?: object) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(body ? JSON.stringify(body) : undefined)
}

createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/send') return reply(res, 404)
  if (!authorized(req.headers.authorization)) return reply(res, 401)

  let body: Body
  try {
    body = await readJson(req)
  } catch {
    return reply(res, 400)
  }
  if (!Array.isArray(body?.subscriptions) || typeof body.payload?.title !== 'string') return reply(res, 400)

  const data = JSON.stringify(body.payload)
  const gone: string[] = []
  await Promise.all(body.subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, data, { TTL: 3600 })
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) gone.push(sub.endpoint) // inscrição expirou: o PocketBase apaga
      else console.error('push falhou', status ?? err)
    }
  }))
  reply(res, 200, { sent: body.subscriptions.length - gone.length, gone })
}).listen(PORT, HOST, () => console.log(`push sidecar em http://${HOST}:${PORT}`))
