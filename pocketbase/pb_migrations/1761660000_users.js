/// <reference path="../pb_data/types.d.ts" />

// Perfil de jogador na collection `users` padrão do PocketBase.
// `role` só é alterável por superuser (painel /_/), nunca pelo próprio usuário.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  users.listRule = "@request.auth.id != ''"
  users.viewRule = "@request.auth.id != ''"
  users.createRule = "@request.body.role:isset = false"
  users.updateRule = "id = @request.auth.id && @request.body.role:isset = false"
  users.deleteRule = null
  users.authRule = "verified = true"

  const name = users.fields.getByName("name")
  name.required = true
  name.min = 2
  name.max = 50

  const avatar = users.fields.getByName("avatar")
  avatar.maxSize = 5 * 1024 * 1024
  avatar.mimeTypes = ["image/jpeg", "image/png", "image/webp"]
  avatar.thumbs = ["96x96", "400x400"]

  users.fields.add(new SelectField({
    name: "position",
    maxSelect: 1,
    values: ["levantador", "ponteiro", "central", "oposto", "libero", "universal"],
  }))
  users.fields.add(new BoolField({ name: "availableForTeam" }))
  users.fields.add(new SelectField({ name: "role", maxSelect: 1, values: ["member", "admin"] }))

  users.verificationTemplate.subject = "Confirme seu e-mail no {APP_NAME}"
  users.verificationTemplate.body = `<p>Olá!</p>
<p>Confirme seu e-mail para entrar no {APP_NAME}:</p>
<p><a class="btn" href="{APP_URL}/confirmar-email/{TOKEN}" target="_blank" rel="noopener">Confirmar e-mail</a></p>
<p><i>Se você não se cadastrou, ignore este e-mail.</i></p>`

  users.resetPasswordTemplate.subject = "Redefinir senha do {APP_NAME}"
  users.resetPasswordTemplate.body = `<p>Olá!</p>
<p>Clique abaixo para criar uma nova senha:</p>
<p><a class="btn" href="{APP_URL}/redefinir-senha/{TOKEN}" target="_blank" rel="noopener">Redefinir senha</a></p>
<p><i>Se você não pediu isso, ignore este e-mail.</i></p>`

  app.save(users)

  const settings = app.settings()
  settings.meta.appName = "Galáticos"
  settings.meta.appURL = $os.getenv("APP_URL") || "http://localhost:5173"
  settings.meta.senderName = "Galáticos"
  settings.meta.senderAddress = $os.getenv("SMTP_SENDER") || "nao-responda@galaticos.local"
  const smtpHost = $os.getenv("SMTP_HOST")
  if (smtpHost) {
    settings.smtp.enabled = true
    settings.smtp.host = smtpHost
    settings.smtp.port = parseInt($os.getenv("SMTP_PORT") || "587")
    settings.smtp.username = $os.getenv("SMTP_USERNAME")
    settings.smtp.password = $os.getenv("SMTP_PASSWORD")
    settings.smtp.tls = $os.getenv("SMTP_TLS") === "true"
  }
  app.save(settings)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("position")
  users.fields.removeByName("availableForTeam")
  users.fields.removeByName("role")
  users.listRule = "id = @request.auth.id"
  users.viewRule = "id = @request.auth.id"
  users.createRule = ""
  users.updateRule = "id = @request.auth.id"
  users.deleteRule = "id = @request.auth.id"
  users.authRule = ""
  app.save(users)
})
