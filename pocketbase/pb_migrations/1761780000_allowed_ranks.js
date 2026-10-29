/// <reference path="../pb_data/types.d.ts" />

// Ranks que podem jogar (vazio = todos). O template sugere, o evento guarda a cópia (o admin pode ajustar).
// Vale para inscrição e convite do Prime (pb_hooks/lib/ranks.js).
migrate((app) => {
  for (const name of ["templates", "events"]) {
    const c = app.findCollectionByNameOrId(name)
    c.fields.add(new SelectField({ name: "allowedRanks", maxSelect: 3, values: ["regular", "mitico", "lendario"] }))
    app.save(c)
  }
}, (app) => {
  for (const name of ["templates", "events"]) {
    const c = app.findCollectionByNameOrId(name)
    c.fields.removeByName("allowedRanks")
    app.save(c)
  }
})
