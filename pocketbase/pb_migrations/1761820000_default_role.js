/// <reference path="../pb_data/types.d.ts" />

// Cadastro passou a gravar `role = member` (ver users.pb.js); aqui acertamos quem ficou sem.
migrate((app) => {
  app.db().newQuery("UPDATE users SET role = 'member' WHERE role = ''").execute()
}, () => {})
