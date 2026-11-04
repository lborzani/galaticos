/// <reference path="../pb_data/types.d.ts" />

// Rank, papel e banimento: só por estas rotas, só admin.
routerAdd("POST", "/api/g/admin/users/{id}", (e) => {
  if (e.auth.getString("role") !== "admin") throw new ForbiddenError("Só admins gerenciam usuários.")
  const { update } = require(`${__hooks}/lib/admin_users.js`)
  $app.runInTransaction((txApp) => update(txApp, e.auth.id, e.request.pathValue("id"), e.requestInfo().body))
  return e.noContent(204)
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/admin/users/{id}/{action}", (e) => {
  if (e.auth.getString("role") !== "admin") throw new ForbiddenError("Só admins gerenciam usuários.")
  const action = e.request.pathValue("action")
  if (action !== "ban" && action !== "unban") throw new NotFoundError()
  const lib = require(`${__hooks}/lib/admin_users.js`)
  const id = e.request.pathValue("id")
  let promoted = []
  $app.runInTransaction((txApp) => {
    if (action === "ban") promoted = lib.ban(txApp, e.auth.id, id, e.requestInfo().body.reason)
    else lib.unban(txApp, id)
  })
  // push depois do commit: falha de envio não desfaz o banimento
  const push = require(`${__hooks}/lib/push.js`)
  for (const p of promoted) push.promoted($app, p.eventId, p.promoted)
  return e.noContent(204)
}, $apis.requireAuth("users"))

// Banido com a senha certa ouve o motivo do bloqueio, em vez de "senha incorreta".
onRecordAuthWithPasswordRequest((e) => {
  if (e.record && e.record.getString("bannedAt") && e.record.validatePassword(e.password)) {
    throw new ForbiddenError("Conta suspensa. Fale com a organização.")
  }
  e.next()
}, "users")
