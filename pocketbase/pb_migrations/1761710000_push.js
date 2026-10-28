/// <reference path="../pb_data/types.d.ts" />

// Inscrições de Web Push (uma por navegador/aparelho) e marcas de lembrete já enviado no evento.
// Escritas só pelas rotas de pb_hooks/push.pb.js; o dono só lê as próprias.
migrate((app) => {
  app.save(new Collection({
    type: "base",
    name: "push_subscriptions",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "endpoint", type: "text", required: true, max: 2000 },
      { name: "p256dh", type: "text", required: true, max: 200 },
      { name: "auth", type: "text", required: true, max: 100 },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_push_endpoint ON push_subscriptions (endpoint)",
      "CREATE INDEX idx_push_user ON push_subscriptions (user)",
    ],
  }))

  const events = app.findCollectionByNameOrId("events")
  events.fields.add(new BoolField({ name: "reminded1h" }))
  events.fields.add(new BoolField({ name: "reminded5m" }))
  const noFlags = " && @request.body.reminded1h:isset = false && @request.body.reminded5m:isset = false"
  events.createRule += noFlags
  events.updateRule += noFlags
  app.save(events)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("push_subscriptions"))
  const events = app.findCollectionByNameOrId("events")
  events.fields.removeByName("reminded1h")
  events.fields.removeByName("reminded5m")
  const noFlags = " && @request.body.reminded1h:isset = false && @request.body.reminded5m:isset = false"
  events.createRule = events.createRule.replace(noFlags, "")
  events.updateRule = events.updateRule.replace(noFlags, "")
  app.save(events)
})
