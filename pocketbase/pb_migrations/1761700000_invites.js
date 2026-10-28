/// <reference path="../pb_data/types.d.ts" />

// Convites do Prime. Time = capitão (inscrição confirmada no evento prime) + convites aceitos.
// Só o servidor escreve (pb_hooks/invites.pb.js); todos os logados leem para ver os times.
migrate((app) => {
  const invites = new Collection({
    type: "base",
    name: "invites",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "event", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("events").id, cascadeDelete: true },
      { name: "captain", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "player", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "accepted", "declined", "cancelled"] },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      // um jogador só tem um convite ativo por evento (o servidor também checa, com mensagem)
      "CREATE UNIQUE INDEX idx_invites_active_player ON invites (event, player) WHERE status IN ('pending', 'accepted')",
      "CREATE INDEX idx_invites_captain ON invites (event, captain)",
    ],
  })
  app.save(invites)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("invites"))
})
