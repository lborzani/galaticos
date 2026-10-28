/// <reference path="../pb_data/types.d.ts" />

// Passaporte = token aleatório por inscrição, legível só pelo dono e por admins.
// O QR carrega só o token; ids de evento/usuário não servem para forjar presença.
migrate((app) => {
  const registrations = app.findCollectionByNameOrId("registrations")
  registrations.fields.add(new DateField({ name: "attendedAt" }))
  registrations.fields.add(new RelationField({ name: "attendedBy", maxSelect: 1, collectionId: "_pb_users_auth_" }))
  app.save(registrations)

  const ownerOrAdmin = "user = @request.auth.id || @request.auth.role = 'admin'"
  const passports = new Collection({
    type: "base",
    name: "passports",
    listRule: ownerOrAdmin,
    viewRule: ownerOrAdmin,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "registration", type: "relation", required: true, maxSelect: 1, collectionId: registrations.id, cascadeDelete: true },
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "token", type: "text", required: true, min: 32, max: 64 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_passports_registration ON passports (registration)",
      "CREATE UNIQUE INDEX idx_passports_token ON passports (token)",
    ],
  })
  app.save(passports)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("passports"))
  const registrations = app.findCollectionByNameOrId("registrations")
  registrations.fields.removeByName("attendedAt")
  registrations.fields.removeByName("attendedBy")
  app.save(registrations)
})
