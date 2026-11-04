/// <reference path="../pb_data/types.d.ts" />

// E-mails com a cara do app. HTML de e-mail = tabelas + estilos inline (Gmail/Outlook ignoram o resto).
// {APP_NAME}, {APP_URL}, {TOKEN} e {ALERT_INFO} são trocados pelo PocketBase no envio.
migrate((app) => {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

  const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr><td bgcolor="#7C3AED" style="border-radius:10px">
    <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
  </td></tr>
</table>
<p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#6B7280">Se o botão não funcionar, copie e cole no navegador:<br><a href="${href}" style="color:#6D28D9;word-break:break-all">${href}</a></p>`

  const layout = (title, content) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5F7">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
      <tr><td align="center" bgcolor="#1E1033" style="padding:28px 24px;border-radius:16px 16px 0 0">
        <img src="{APP_URL}/pwa-192.png" width="88" height="88" alt="{APP_NAME}" style="display:block;border:0;border-radius:20px">
      </td></tr>
      <tr><td bgcolor="#FFFFFF" style="padding:32px 32px 8px;border-radius:0 0 16px 16px;font-family:${font};font-size:16px;line-height:24px;color:#1F1F23">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:#1F1F23">${title}</h1>
        ${content}
      </td></tr>
      <tr><td align="center" style="padding:20px 24px;font-family:${font};font-size:12px;line-height:18px;color:#8E8E93">
        Você recebeu este e-mail porque tem uma conta no <a href="{APP_URL}" style="color:#8E8E93">{APP_NAME}</a>.<br>Este endereço não recebe respostas.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const p = (text) => `<p style="margin:0 0 16px">${text}</p>`
  const note = (text) => `<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#6B7280">${text}</p>`

  const users = app.findCollectionByNameOrId("users")

  users.verificationTemplate.subject = "Confirme seu e-mail no {APP_NAME}"
  users.verificationTemplate.body = layout("Confirme seu e-mail",
    p("Falta só um passo para entrar no {APP_NAME}. Toque no botão abaixo para confirmar seu e-mail.") +
    button("{APP_URL}/confirmar-email/{TOKEN}", "Confirmar e-mail") +
    note("Se você não se cadastrou, pode ignorar este e-mail."))

  users.resetPasswordTemplate.subject = "Redefinir senha do {APP_NAME}"
  users.resetPasswordTemplate.body = layout("Redefinir sua senha",
    p("Recebemos um pedido para redefinir a senha da sua conta no {APP_NAME}.") +
    button("{APP_URL}/redefinir-senha/{TOKEN}", "Criar nova senha") +
    note("Se não foi você, ignore este e-mail. Sua senha continua a mesma."))

  // Alerta de login em novo aparelho: vem ligado por padrão no PocketBase, em inglês.
  users.authAlert.emailTemplate.subject = "Novo acesso à sua conta no {APP_NAME}"
  users.authAlert.emailTemplate.body = layout("Novo acesso à sua conta",
    p("Notamos um login na sua conta a partir de um novo aparelho ou local:") +
    p(`<strong>{ALERT_INFO}</strong>`) +
    p("Se foi você, está tudo certo. Se não foi, troque sua senha agora: isso desconecta todos os outros aparelhos.") +
    button("{APP_URL}/esqueci-senha", "Trocar minha senha"))

  app.save(users)
}, () => {
  // sem down: templates não são dados; voltar para a versão sem estilo não desfaz nada útil
})
