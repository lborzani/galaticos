/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/g/events/{id}/invites", (e) => {
  const { send } = require(`${__hooks}/lib/invites.js`)
  let invite
  $app.runInTransaction((txApp) => {
    invite = send(txApp, e.request.pathValue("id"), e.auth.id, String(e.requestInfo().body.player || ""))
  })
  return e.json(200, invite)
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/invites/{id}/{action}", (e) => {
  const action = e.request.pathValue("action")
  if (!["accept", "decline", "cancel"].includes(action)) throw new NotFoundError()
  const { respond } = require(`${__hooks}/lib/invites.js`)
  let invite
  $app.runInTransaction((txApp) => { invite = respond(txApp, e.request.pathValue("id"), e.auth.id, action) })
  return e.json(200, invite)
}, $apis.requireAuth("users"))
