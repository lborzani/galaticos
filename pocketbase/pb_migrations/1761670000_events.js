/// <reference path="../pb_data/types.d.ts" />

// Eventos. Status (aberto, lotado, acontecendo, encerrado) é derivado das datas no cliente;
// só o cancelamento é gravado. Evento cancelado não pode mais ser editado.
migrate((app) => {
  const isAdmin = "@request.auth.role = 'admin'"
  const events = new Collection({
    type: "base",
    name: "events",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: `${isAdmin} && @request.body.createdBy = @request.auth.id && @request.body.cancelledAt:isset = false`,
    updateRule: `${isAdmin} && cancelledAt = '' && @request.body.createdBy:isset = false`
      + " && (@request.body.cancelledBy:isset = false || @request.body.cancelledBy = @request.auth.id)",
    deleteRule: null,
    fields: [
      { name: "title", type: "text", required: true, min: 3, max: 80 },
      { name: "type", type: "select", required: true, maxSelect: 1, values: ["wednesday", "sunday", "custom", "prime"] },
      { name: "eventDate", type: "date", required: true },
      { name: "registrationOpensAt", type: "date", required: true },
      { name: "location", type: "text", required: true, min: 2, max: 120 },
      { name: "maxParticipants", type: "number", required: true, min: 1, max: 200, onlyInt: true },
      { name: "createdBy", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_" },
      { name: "cancelledAt", type: "date" },
      { name: "cancelledBy", type: "relation", maxSelect: 1, collectionId: "_pb_users_auth_" },
      { name: "cancellationReason", type: "text", max: 300 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_events_date ON events (eventDate)"],
  })
  app.save(events)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("events"))
})
