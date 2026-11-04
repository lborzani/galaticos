/// <reference path="../pb_data/types.d.ts" />

// Rank do jogador (todos veem) e banimento (exclusão lógica, reversível). Rank, papel e banimento só mudam
// pelas rotas de admin (pb_hooks/admin_users.pb.js). Os campos de banimento são ocultos: só admins recebem
// (enrich em users.pb.js). Banido não autentica e some da lista de usuários para membros.
const RANK_LOCK = " && @request.body.rank:isset = false"
const VISIBLE = "@request.auth.id != '' && (bannedAt = '' || id = @request.auth.id || @request.auth.role = 'admin')"

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new SelectField({ name: "rank", maxSelect: 1, values: ["regular", "mitico", "lendario"] }))
  users.fields.add(new DateField({ name: "bannedAt", hidden: true }))
  users.fields.add(new TextField({ name: "banReason", hidden: true, max: 300 }))
  users.fields.add(new RelationField({ name: "bannedBy", hidden: true, maxSelect: 1, collectionId: "_pb_users_auth_" }))
  users.listRule = VISIBLE
  users.viewRule = VISIBLE
  users.createRule += RANK_LOCK
  users.updateRule += RANK_LOCK
  users.authRule = "verified = true && bannedAt = ''"
  app.save(users)

  for (const user of app.findAllRecords("users")) {
    user.set("rank", "regular")
    app.saveNoValidate(user) // conta antiga pode não ter telefone
  }
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  for (const name of ["rank", "bannedAt", "banReason", "bannedBy"]) users.fields.removeByName(name)
  users.listRule = "@request.auth.id != ''"
  users.viewRule = "@request.auth.id != ''"
  users.createRule = users.createRule.replace(RANK_LOCK, "")
  users.updateRule = users.updateRule.replace(RANK_LOCK, "")
  users.authRule = "verified = true"
  app.save(users)
})
