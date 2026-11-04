/// <reference path="../pb_data/types.d.ts" />

// Quadras cadastradas pelo admin. O evento passa a apontar para uma quadra (`court`) em vez do texto `location`;
// cada local distinto dos eventos existentes vira uma quadra. Quadra usada por evento não pode ser apagada
// (relação obrigatória sem cascade: o PocketBase recusa o delete).
migrate((app) => {
  const isAdmin = "@request.auth.role = 'admin'"
  const courts = new Collection({
    type: "base",
    name: "courts",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: isAdmin,
    updateRule: isAdmin,
    deleteRule: isAdmin,
    fields: [
      { name: "name", type: "text", required: true, min: 2, max: 120 },
      { name: "address", type: "text", max: 200 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_courts_name ON courts (name COLLATE NOCASE)"],
  })
  app.save(courts)

  const events = app.findCollectionByNameOrId("events")
  events.fields.add(new RelationField({ name: "court", maxSelect: 1, collectionId: courts.id }))
  app.save(events)

  const byName = {}
  for (const ev of app.findAllRecords("events")) {
    const name = ev.getString("location").trim()
    const key = name.toLowerCase()
    if (!byName[key]) {
      const court = new Record(courts)
      court.set("name", name)
      app.save(court)
      byName[key] = court.id
    }
    ev.set("court", byName[key])
    app.saveNoValidate(ev) // evento antigo pode não passar nas regras de hoje (ex.: cancelado)
  }

  events.fields.getByName("court").required = true
  events.fields.removeByName("location")
  app.save(events)
}, (app) => {
  const events = app.findCollectionByNameOrId("events")
  events.fields.add(new TextField({ name: "location", max: 120 }))
  events.fields.getByName("court").required = false
  app.save(events)
  for (const ev of app.findAllRecords("events")) {
    ev.set("location", app.findRecordById("courts", ev.getString("court")).getString("name"))
    app.saveNoValidate(ev)
  }
  events.fields.removeByName("court")
  app.save(events)
  app.delete(app.findCollectionByNameOrId("courts"))
})
