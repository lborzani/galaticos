/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/g/events/{id}/register", (e) => {
  const { register } = require(`${__hooks}/lib/registrations.js`)
  let reg
  $app.runInTransaction((txApp) => { reg = register(txApp, e.request.pathValue("id"), e.auth.id) })
  return e.json(200, reg)
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/events/{id}/cancel", (e) => {
  const { cancel } = require(`${__hooks}/lib/registrations.js`)
  let reg
  $app.runInTransaction((txApp) => { reg = cancel(txApp, e.request.pathValue("id"), e.auth.id) })
  return e.json(200, reg)
}, $apis.requireAuth("users"))
