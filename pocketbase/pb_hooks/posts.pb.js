/// <reference path="../pb_data/types.d.ts" />

// Contador de curtidas: recontado a cada curtida/descurtida (idempotente, sem drift).
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/posts.js`).recountLikes(e.app, e.record.getString("post"))
  e.next()
}, "post_likes")

onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/lib/posts.js`).recountLikes(e.app, e.record.getString("post"))
  e.next()
}, "post_likes")

// Post novo avisa todo mundo (menos quem publicou). Depois de gravar: falha de push não desfaz o post.
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/push.js`).newPost(e.app, e.record)
  e.next()
}, "posts")
