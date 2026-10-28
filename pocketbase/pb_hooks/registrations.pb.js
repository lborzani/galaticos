/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/g/events/{id}/register", (e) => {
  const { register } = require(`${__hooks}/lib/registrations.js`)
  let reg
  $app.runInTransaction((txApp) => { reg = register(txApp, e.request.pathValue("id"), e.auth.id) })
  return e.json(200, reg)
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/events/{id}/cancel", (e) => {
  const { cancel } = require(`${__hooks}/lib/registrations.js`)
  const eventId = e.request.pathValue("id")
  let result
  $app.runInTransaction((txApp) => { result = cancel(txApp, eventId, e.auth.id) })
  require(`${__hooks}/lib/push.js`).promoted($app, eventId, result.promoted) // depois do commit
  return e.json(200, result.registration)
}, $apis.requireAuth("users"))
