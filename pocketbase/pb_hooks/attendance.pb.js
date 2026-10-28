/// <reference path="../pb_data/types.d.ts" />

// Check-in pelo scanner do admin: lookup mostra quem é, attend confirma a presença.
routerAdd("POST", "/api/g/passports/lookup", (e) => {
  if (e.auth.getString("role") !== "admin") throw new ForbiddenError("Só admins validam passaportes.")
  const { checkPassport } = require(`${__hooks}/lib/registrations.js`)
  return e.json(200, checkPassport($app, e.requestInfo().body.token))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/passports/attend", (e) => {
  if (e.auth.getString("role") !== "admin") throw new ForbiddenError("Só admins validam passaportes.")
  const { attend } = require(`${__hooks}/lib/registrations.js`)
  let result
  $app.runInTransaction((txApp) => { result = attend(txApp, e.requestInfo().body.token, e.auth.id) })
  return e.json(200, result)
}, $apis.requireAuth("users"))
