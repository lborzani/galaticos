/// <reference path="../pb_data/types.d.ts" />

// Posts do mural: admins publicam (texto, fotos, evento opcional), todos os logados leem e curtem.
// `likesCount` é mantido pelo servidor (pb_hooks/posts.pb.js). Sem edição: o admin apaga e publica de novo.
migrate((app) => {
  const isAdmin = "@request.auth.role = 'admin'"
  const posts = new Collection({
    type: "base",
    name: "posts",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: `${isAdmin} && @request.body.author = @request.auth.id && @request.body.likesCount:isset = false`,
    updateRule: null,
    deleteRule: isAdmin,
    fields: [
      { name: "author", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "body", type: "text", required: true, max: 2000 },
      {
        name: "images", type: "file", maxSelect: 4, maxSize: 5 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["800x0"],
      },
      { name: "event", type: "relation", maxSelect: 1, collectionId: app.findCollectionByNameOrId("events").id },
      { name: "likesCount", type: "number", min: 0, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(posts)

  app.save(new Collection({
    type: "base",
    name: "post_likes",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
    updateRule: null,
    deleteRule: "user = @request.auth.id",
    fields: [
      { name: "post", type: "relation", required: true, maxSelect: 1, collectionId: posts.id, cascadeDelete: true },
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_post_likes ON post_likes (post, user)"],
  }))
}, (app) => {
  app.delete(app.findCollectionByNameOrId("post_likes"))
  app.delete(app.findCollectionByNameOrId("posts"))
})
