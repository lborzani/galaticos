/// <reference path="../../pb_data/types.d.ts" />

function recountLikes(app, postId) {
  let post
  try {
    post = app.findRecordById("posts", postId)
  } catch (_) {
    return // curtida apagada junto com o post
  }
  post.set("likesCount", app.countRecords("post_likes", $dbx.hashExp({ post: postId })))
  app.save(post)
}

module.exports = { recountLikes }
