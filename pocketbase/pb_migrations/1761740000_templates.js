/// <reference path="../pb_data/types.d.ts" />

// Templates de evento cadastrados pelo admin, no lugar dos tipos fixos (`type`). O template só preenche o
// formulário: o evento guarda uma cópia do nome (`kind`) e do modo times (`teams`, capitães e convites,
// o antigo Prime). Editar ou apagar o template não muda eventos já criados. `teams` não muda depois de criado.
const SEED = [
  { type: "wednesday", name: "Bate-bola Quarta", maxParticipants: 3, teams: false },
  { type: "sunday", name: "Bate-bola Domingo", maxParticipants: 28, teams: false },
  { type: "prime", name: "Prime", maxParticipants: 3, teams: true },
]
const LOCK_TEAMS = " && @request.body.teams:isset = false"

migrate((app) => {
  const isAdmin = "@request.auth.role = 'admin'"
  const templates = new Collection({
    type: "base",
    name: "templates",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: isAdmin,
    updateRule: isAdmin,
    deleteRule: isAdmin,
    fields: [
      { name: "name", type: "text", required: true, min: 3, max: 80 },
      { name: "maxParticipants", type: "number", required: true, min: 1, max: 200, onlyInt: true },
      { name: "teams", type: "bool" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_templates_name ON templates (name COLLATE NOCASE)"],
  })
  app.save(templates)
  for (const t of SEED) {
    const r = new Record(templates)
    r.load({ name: t.name, maxParticipants: t.maxParticipants, teams: t.teams })
    app.save(r)
  }

  const events = app.findCollectionByNameOrId("events")
  events.fields.add(new TextField({ name: "kind", max: 80 }))
  events.fields.add(new BoolField({ name: "teams" }))
  events.updateRule += LOCK_TEAMS
  app.save(events)

  for (const ev of app.findAllRecords("events")) {
    const t = SEED.find((s) => s.type === ev.getString("type"))
    ev.set("kind", t ? t.name : "") // custom → sem template
    ev.set("teams", !!(t && t.teams))
    app.saveNoValidate(ev)
  }

  events.fields.removeByName("type")
  app.save(events)
}, (app) => {
  const events = app.findCollectionByNameOrId("events")
  events.fields.add(new SelectField({ name: "type", maxSelect: 1, values: ["wednesday", "sunday", "custom", "prime"] }))
  events.updateRule = events.updateRule.replace(LOCK_TEAMS, "")
  app.save(events)
  for (const ev of app.findAllRecords("events")) {
    const t = ev.getBool("teams") ? SEED[2] : SEED.find((s) => s.name === ev.getString("kind"))
    ev.set("type", t ? t.type : "custom")
    app.saveNoValidate(ev)
  }
  events.fields.getByName("type").required = true
  events.fields.removeByName("kind")
  events.fields.removeByName("teams")
  app.save(events)
  app.delete(app.findCollectionByNameOrId("templates"))
})
