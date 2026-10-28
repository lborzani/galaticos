/// <reference path="../pb_data/types.d.ts" />

// Chave pública VAPID para o navegador assinar a inscrição.
routerAdd("GET", "/api/g/push/key", (e) => {
  const key = $os.getenv("VAPID_PUBLIC_KEY")
  if (!key) throw new NotFoundError("Notificações não configuradas neste servidor.")
  return e.json(200, { key })
}, $apis.requireAuth("users"))

// Salva a inscrição deste aparelho. O endpoint é do navegador: se outra conta usou o mesmo aparelho antes, passa a ser deste usuário.
routerAdd("POST", "/api/g/push/subscribe", (e) => {
  const body = e.requestInfo().body
  const endpoint = String(body.endpoint || "")
  if (!/^https:\/\//.test(endpoint) || !body.keys || !body.keys.p256dh || !body.keys.auth) throw new BadRequestError("Inscrição inválida.")
  let sub
  try {
    sub = $app.findFirstRecordByFilter("push_subscriptions", "endpoint = {:e}", { e: endpoint })
  } catch (_) {
    sub = new Record($app.findCollectionByNameOrId("push_subscriptions"))
    sub.set("endpoint", endpoint)
  }
  sub.set("user", e.auth.id)
  sub.set("p256dh", String(body.keys.p256dh))
  sub.set("auth", String(body.keys.auth))
  $app.save(sub)
  return e.json(200, { id: sub.id })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/push/unsubscribe", (e) => {
  const endpoint = String(e.requestInfo().body.endpoint || "")
  const subs = $app.findRecordsByFilter("push_subscriptions", "endpoint = {:e} && user = {:u}", "", 0, 0, { e: endpoint, u: e.auth.id })
  for (const s of subs) $app.delete(s)
  return e.noContent(204)
}, $apis.requireAuth("users"))

cronAdd("galaticos_reminders", "* * * * *", () => {
  require(`${__hooks}/lib/push.js`).runReminders($app)
})

// Mesma rotina do cron, sob demanda (testes e operação).
routerAdd("POST", "/api/g/push/run-reminders", (e) => {
  return e.json(200, { sent: require(`${__hooks}/lib/push.js`).runReminders($app) })
}, $apis.requireSuperuserAuth())
