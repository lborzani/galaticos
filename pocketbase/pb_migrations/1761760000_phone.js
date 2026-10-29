/// <reference path="../pb_data/types.d.ts" />

// Telefone do membro (Brasil, +55 + DDD + 8 ou 9 dígitos), guardado em `phonePrivate`, campo oculto:
// a API não devolve, não aceita no corpo e não deixa filtrar. Para o app o campo se chama `phone`;
// pb_hooks/users.pb.js faz a ponte, exige o número no cadastro e mostra só para o dono e admins.
// Não é `required` no schema: contas antigas sem telefone precisam continuar gravando (reset de senha etc).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new TextField({ name: "phonePrivate", hidden: true, max: 14, pattern: "^\\+55[1-9]{2}(9[0-9]{8}|[2-5][0-9]{7})$" }))
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("phonePrivate")
  app.save(users)
})
