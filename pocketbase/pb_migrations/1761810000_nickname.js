/// <reference path="../pb_data/types.d.ts" />

// Apelido opcional do jogador, editável pelo próprio usuário no perfil.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new TextField({ name: "nickname", max: 30 }))
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("nickname")
  app.save(users)
})
