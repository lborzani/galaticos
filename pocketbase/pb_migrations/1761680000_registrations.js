/// <reference path="../pb_data/types.d.ts" />

// Inscrições. Só o servidor escreve (rotas em pb_hooks/registrations.pb.js), em transação.
// `position` é a ordem de chegada no evento; a posição na fila de espera é derivada dela.
migrate((app) => {
  const events = app.findCollectionByNameOrId("events")
  events.fields.add(new NumberField({ name: "confirmedCount", min: 0, onlyInt: true }))
  events.fields.add(new NumberField({ name: "waitlistCount", min: 0, onlyInt: true }))
  const noCounters = " && @request.body.confirmedCount:isset = false && @request.body.waitlistCount:isset = false"
  events.createRule += noCounters
  events.updateRule += noCounters
  app.save(events)

  const registrations = new Collection({
    type: "base",
    name: "registrations",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "event", type: "relation", required: true, maxSelect: 1, collectionId: events.id, cascadeDelete: true },
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["confirmed", "waitlist", "cancelled", "attended"] },
      { name: "position", type: "number", required: true, min: 1, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_registrations_event_user ON registrations (event, user)",
      "CREATE INDEX idx_registrations_event_status ON registrations (event, status, position)",
    ],
  })
  app.save(registrations)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("registrations"))
  const events = app.findCollectionByNameOrId("events")
  events.fields.removeByName("confirmedCount")
  events.fields.removeByName("waitlistCount")
  const noCounters = " && @request.body.confirmedCount:isset = false && @request.body.waitlistCount:isset = false"
  events.createRule = events.createRule.replace(noCounters, "")
  events.updateRule = events.updateRule.replace(noCounters, "")
  app.save(events)
})
