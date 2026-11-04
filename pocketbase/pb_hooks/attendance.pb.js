/// <reference path="../pb_data/types.d.ts" />

// Check-in pelo scanner: lookup mostra quem é, attend confirma a presença.
// Passaporte de evento só admin valida; de treino, admin ou o professor da turma (lib/trainings.js).
routerAdd("POST", "/api/g/passports/lookup", (e) => {
  if (!["admin", "professor"].includes(e.auth.getString("role"))) throw new ForbiddenError("Só admins e professores validam passaportes.")
  const { lookup } = require(`${__hooks}/lib/trainings.js`)
  return e.json(200, lookup($app, e.requestInfo().body.token, e.auth))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/g/passports/attend", (e) => {
  if (!["admin", "professor"].includes(e.auth.getString("role"))) throw new ForbiddenError("Só admins e professores validam passaportes.")
  const { checkIn } = require(`${__hooks}/lib/trainings.js`)
  let result
  $app.runInTransaction((txApp) => { result = checkIn(txApp, e.requestInfo().body.token, e.auth) })
  return e.json(200, result)
}, $apis.requireAuth("users"))
